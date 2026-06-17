import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// 스튜디오 생성물 → 내부 저장. 관리자 전용.
// body: { slug, body_html?, blog_title?, blog_body?, story? }
export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (prof?.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let payload: any = {};
  try { payload = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }
  const slug = String(payload.slug || "").trim();
  if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });

  const { data: product } = await supabase.from("product").select("id,storefront:product_storefronts(storefront_id)").eq("slug", slug).maybeSingle();
  if (!product) return NextResponse.json({ error: "product not found" }, { status: 404 });

  const done: string[] = [];

  // 1) 상세페이지 본문(body_html) / one_liner 갱신
  const upd: Record<string, unknown> = {};
  if (payload.body_html) upd.body_html = String(payload.body_html);
  if (payload.story) upd.one_liner = String(payload.story);
  if (Object.keys(upd).length) {
    await supabase.from("product").update(upd).eq("id", (product as any).id);
    done.push("product");
  }

  // 2) 블로그 초안 → content_post (draft)
  if (payload.blog_body) {
    const sfId = (product as any).storefront?.[0]?.storefront_id ?? null;
    const title = String(payload.blog_title || `${slug} 블로그 초안`);
    const postSlug = `${slug}-studio-${Date.now().toString(36)}`;
    await supabase.from("content_post").insert({
      slug: postSlug,
      title,
      body_html: String(payload.blog_body),
      excerpt: String(payload.blog_body).replace(/<[^>]+>/g, "").slice(0, 120),
      storefront_id: sfId,
      status: "draft",
      author: "디자인 스튜디오",
    });
    done.push("blog_draft");
  }

  return NextResponse.json({ ok: true, saved: done });
}
