import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function slugify(s: string): string {
  return s.toLowerCase().trim()
    .replace(/[^a-z0-9가-힣\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 80)
    || `post-${Date.now().toString(36)}`;
}

// 통합 스튜디오 블로그 저장 — 보관(draft)/게시(published). 게시글은 홈 블로그 섹션 노출.
export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (prof?.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let p: any = {};
  try { p = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }
  const title = String(p.title || "").trim();
  const body_html = String(p.body_html || "");
  if (!title) return NextResponse.json({ error: "제목이 필요합니다" }, { status: 400 });
  const status = p.status === "published" ? "published" : "draft";
  const productSlug = p.product_slug ? String(p.product_slug) : "";

  // 스토어프론트 — 제품 소속 우선, 없으면 기본
  let storefrontId: string | null = null;
  if (productSlug) {
    const { data: prod } = await supabase.from("product").select("product_storefronts(storefront_id)").eq("slug", productSlug).maybeSingle();
    storefrontId = (prod as any)?.product_storefronts?.[0]?.storefront_id ?? null;
  }
  if (!storefrontId) {
    const { data: sf } = await supabase.from("storefront").select("id").limit(1).maybeSingle();
    storefrontId = sf?.id ?? null;
  }

  const slug = slugify(productSlug ? `${productSlug}-${title}` : title);
  const excerpt = body_html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 150);

  const { error } = await supabase.from("content_post").upsert({
    slug, title, body_html,
    excerpt: excerpt || null,
    cover_image: String(p.cover_image || "") || null,
    storefront_id: storefrontId,
    status, author: "통합 스튜디오",
    published_at: status === "published" ? new Date().toISOString() : null,
  }, { onConflict: "slug" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidatePath("/admin/blog");
  revalidatePath("/blogs/coffeelog");
  revalidatePath("/");
  return NextResponse.json({ ok: true, slug, status });
}
