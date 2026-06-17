import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { buildDesignedDetailHtml, type DesignedFields } from "@/lib/content-gen";

export const dynamic = "force-dynamic";

// 스튜디오 생성물 → 내부 저장(관리자 전용)
// body: { slug, fields:{...}, blog_title?, blog_body?, thumb_dataurl? }
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

  const { data: product } = await supabase
    .from("product")
    .select("id,key_color,product_storefronts(storefront_id)")
    .eq("slug", slug).maybeSingle();
  if (!product) return NextResponse.json({ error: "product not found" }, { status: 404 });
  const pid = (product as any).id;

  const f = (payload.fields ?? {}) as DesignedFields & { hash?: string; key_color?: string };
  const done: string[] = [];

  // 1) 제품 구조화 필드 갱신 (한 번 입력 → 제품에 그대로 반영)
  const toArr = (s?: string) => (s ?? "").split(/[,·]/).map((x) => x.trim()).filter(Boolean);
  const upd: Record<string, unknown> = {};
  if (f.ko) upd.title_ko = f.ko;
  if (f.en !== undefined) upd.title_en = f.en || null;
  if (f.story !== undefined) upd.one_liner = f.story || null;
  if (f.roast !== undefined) upd.roast_level = f.roast || null;
  if (f.variety !== undefined) upd.variety = f.variety || null;
  if (f.process !== undefined) upd.process = f.process || null;
  if (f.altitude !== undefined) upd.altitude = f.altitude || null;
  if (f.farmer !== undefined) upd.producer = f.farmer || null;
  if (f.flavor !== undefined) upd.flavor_notes = toArr(f.flavor);
  if (f.hash !== undefined) upd.hashtags = (f.hash ?? "").split(/\s+/).filter(Boolean);
  if (f.weight) { const w = parseInt(f.weight, 10); if (!isNaN(w)) upd.weight_g = w; }
  if (f.country || f.region || f.farm) upd.origin = { country: f.country || "", region: f.region || "", farm: f.farm || "" };
  if (f.rcp_es || f.rcp_fil || f.rcp_milk) upd.brew_recipe = { espresso: f.rcp_es || "", filter: f.rcp_fil || "", milk: f.rcp_milk || "" };
  if (f.key_color) upd.key_color = f.key_color;

  // SEO/AIEO 친화 "디자인 텍스트 박스" 본문 생성 (이미지 아님)
  const keyColor = f.key_color || (product as any).key_color || "#1A1A1A";
  upd.body_html = buildDesignedDetailHtml(f, keyColor);
  await supabase.from("product").update(upd).eq("id", pid);
  done.push("detail_text");

  // 2) 썸네일 이미지 → Storage 업로드 → product_image 대표 이미지
  if (payload.thumb_dataurl && typeof payload.thumb_dataurl === "string") {
    if (!hasServiceRole) {
      done.push("thumb_skipped(no_service_role)");
    } else {
      try {
        const m = payload.thumb_dataurl.match(/^data:(image\/\w+);base64,(.+)$/);
        if (m) {
          const ext = m[1] === "image/jpeg" ? "jpg" : "png";
          const buf = Buffer.from(m[2], "base64");
          const path = `thumb/${slug}-${Date.now()}.${ext}`;
          const admin = createAdminClient();
          const up = await admin.storage.from("product-assets").upload(path, buf, { contentType: m[1], upsert: true });
          if (!up.error) {
            const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-assets/${path}`;
            await admin.from("product_image").update({ is_primary: false }).eq("product_id", pid);
            await admin.from("product_image").insert({ product_id: pid, storage_path: publicUrl, alt: f.ko || slug, is_primary: true, position: 0 });
            done.push("thumbnail");
          } else {
            done.push("thumb_error");
          }
        }
      } catch {
        done.push("thumb_error");
      }
    }
  }

  // 3) 블로그 초안 → content_post (draft)
  if (payload.blog_body) {
    const sfId = (product as any).product_storefronts?.[0]?.storefront_id ?? null;
    const title = String(payload.blog_title || `${f.ko || slug} 블로그 초안`);
    const postSlug = `${slug}-studio-${Date.now().toString(36)}`;
    const html = String(payload.blog_body).replace(/^#+\s+/gm, "").split(/\n{2,}/).map((s) => `<p>${s.replace(/\n/g, "<br>")}</p>`).join("");
    await supabase.from("content_post").insert({
      slug: postSlug, title, body_html: html,
      excerpt: String(payload.blog_body).replace(/<[^>]+>/g, "").slice(0, 120),
      storefront_id: sfId, status: "draft", author: "디자인 스튜디오",
    });
    done.push("blog_draft");
  }

  return NextResponse.json({ ok: true, saved: done });
}
