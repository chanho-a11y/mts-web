import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// 디자인 스튜디오 자산 저장(제품 필드 미변경). 관리자 전용.
// body: { slug, kind: 'thumbnail'|'cardnews'|'label'|'blog', dataurl?, blogHtml?, blogTitle? }
export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (prof?.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let payload: any = {};
  try { payload = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }
  const slug = String(payload.slug || "").trim();
  const kind = String(payload.kind || "").replace(/[^a-z0-9_-]/gi, "");
  if (!slug || !kind) return NextResponse.json({ error: "slug/kind required" }, { status: 400 });

  const { data: product } = await supabase
    .from("product").select("id,product_storefronts(storefront_id)").eq("slug", slug).maybeSingle();
  if (!product) return NextResponse.json({ error: "product not found" }, { status: 404 });
  const pid = (product as any).id;

  // 블로그 초안 → content_post(draft)
  if (kind === "blog") {
    const sfId = (product as any).product_storefronts?.[0]?.storefront_id ?? null;
    const html = String(payload.blogHtml || "");
    if (!html) return NextResponse.json({ error: "no blog content" }, { status: 400 });
    const postSlug = `${slug}-studio-${Date.now().toString(36)}`;
    await supabase.from("content_post").insert({
      slug: postSlug, title: String(payload.blogTitle || `${slug} 블로그`), body_html: html,
      excerpt: html.replace(/<[^>]+>/g, "").slice(0, 120), storefront_id: sfId, status: "draft", author: "디자인 스튜디오",
    });
    return NextResponse.json({ ok: true, saved: "blog_draft" });
  }

  // 이미지 자산(썸네일/카드뉴스/라벨) → Storage + product_asset
  if (!hasServiceRole) return NextResponse.json({ error: "no_service_role" }, { status: 503 });
  const m = String(payload.dataurl || "").match(/^data:(image\/\w+);base64,(.+)$/);
  if (!m) return NextResponse.json({ error: "no image" }, { status: 400 });
  const ext = m[1] === "image/jpeg" ? "jpg" : "png";
  const admin = createAdminClient();
  const path = `${kind}/${slug}-${Date.now()}.${ext}`;
  const up = await admin.storage.from("product-assets").upload(path, Buffer.from(m[2], "base64"), { contentType: m[1], upsert: true });
  if (up.error) return NextResponse.json({ error: "upload_failed" }, { status: 500 });
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-assets/${path}`;
  await admin.from("product_asset").insert({ product_id: pid, kind, url });
  return NextResponse.json({ ok: true, url, saved: kind });
}
