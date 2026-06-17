"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { generateDrafts, buildDesignedDetailHtml } from "@/lib/content-gen";

function csv(v: string): string[] {
  return v.split(/[,·]/).map((s) => s.trim()).filter(Boolean);
}

export async function upsertProductAction(formData: FormData) {
  const supabase = createClient();
  const slug = String(formData.get("slug") || "").trim();
  const brandCode = String(formData.get("brand") || "mtspace");
  const { data: brand } = await supabase.from("brand").select("id").eq("code", brandCode).maybeSingle();
  if (!slug || !brand) redirect("/admin/products?error=slug/brand");

  const is_b2b = formData.get("is_b2b_only") === "on";
  const row = {
    slug,
    brand_id: brand.id,
    title_ko: String(formData.get("title_ko") || ""),
    one_liner: String(formData.get("one_liner") || ""),
    product_type: String(formData.get("product_type") || "블렌드"),
    status: String(formData.get("status") || "active"),
    is_b2b_only: is_b2b,
    roast_level: String(formData.get("roast_level") || ""),
    flavor_notes: csv(String(formData.get("flavor_notes") || "")),
    origin: { country: String(formData.get("origin_country") || "") },
    variety: String(formData.get("variety") || "") || null,
    process: String(formData.get("process") || "") || null,
    weight_g: parseInt(String(formData.get("weight_g") || "0"), 10) || null,
    key_color: String(formData.get("key_color") || "") || null,
  };
  const { data: prod, error } = await supabase.from("product").upsert(row, { onConflict: "slug" }).select("id").single();
  if (error || !prod) redirect(`/admin/products?error=${encodeURIComponent(error?.message ?? "save")}`);

  // 대표 변형 (sku/가격)
  const sku = String(formData.get("sku") || "").trim();
  const price = parseInt(String(formData.get("base_price") || "0"), 10) || 0;
  if (sku && price > 0) {
    await supabase.from("product_variant").upsert(
      { product_id: prod.id, sku, base_price: price, weight_g: row.weight_g, grind: "whole", option_values: {}, position: 1 },
      { onConflict: "sku" },
    );
  }
  // 카테고리·스토어프론트 연결
  const catSlug = String(formData.get("category") || "");
  if (catSlug) {
    const { data: cat } = await supabase.from("category").select("id").eq("slug", catSlug).maybeSingle();
    if (cat) await supabase.from("product_categories").upsert({ product_id: prod.id, category_id: cat.id });
  }
  // MTSPACE 단일 사이트 — 모든 제품을 mtspace.coffee 스토어프론트에 노출(B2B 여부는 RLS·역할로 제어)
  const { data: sf } = await supabase.from("storefront").select("id").eq("domain", "mtspace.coffee").maybeSingle();
  if (sf) await supabase.from("product_storefronts").upsert({ product_id: prod.id, storefront_id: sf.id, is_visible: true });

  // 자동 콘텐츠 초안 생성 (체크 시)
  if (formData.get("auto_content") === "on") await generateForProduct(prod.id);

  revalidatePath("/admin/products");
  redirect(`/admin/products/${slug}`);
}

export async function generateDraftsAction(formData: FormData) {
  const productId = String(formData.get("product_id") || "");
  const slug = String(formData.get("slug") || "");
  await generateForProduct(productId);
  revalidatePath(`/admin/products/${slug}`);
}

export async function adjustInventoryAction(formData: FormData) {
  const variantId = String(formData.get("variant_id") || "");
  const delta = parseInt(String(formData.get("delta") || "0"), 10) || 0;
  const slug = String(formData.get("slug") || "");
  if (variantId && delta !== 0) {
    const supabase = createClient();
    await supabase.from("inventory_ledger").insert({ variant_id: variantId, delta, reason: "adjust" });
  }
  revalidatePath(`/admin/products/${slug}`);
}

async function generateForProduct(productId: string) {
  const supabase = createClient();
  const { data: p } = await supabase
    .from("product")
    .select("slug,title_ko,title_en,one_liner,flavor_notes,roast_level,origin,producer,variety,process,altitude,weight_g,key_color,brew_recipe,body_html,product_storefronts(storefront_id)")
    .eq("id", productId).maybeSingle();
  if (!p) return;
  const pp = p as any;

  // 1) 제품 상세 body_html = SEO 디자인 텍스트 박스 (한 번 입력 → 제품에 반영)
  const o = pp.origin ?? {};
  const r = pp.brew_recipe ?? {};
  const designed = buildDesignedDetailHtml({
    ko: pp.title_ko, en: pp.title_en ?? "", country: o.country ?? "", region: o.region ?? "", farm: o.farm ?? pp.producer ?? "",
    farmer: pp.producer ?? "", variety: pp.variety ?? "", process: pp.process ?? "", altitude: pp.altitude ?? "",
    roast: pp.roast_level ?? "", flavor: (pp.flavor_notes ?? []).join(", "), weight: pp.weight_g ? String(pp.weight_g) : "",
    story: pp.one_liner ?? "", rcp_es: r.espresso ?? "", rcp_fil: r.filter ?? "", rcp_milk: r.milk ?? "",
  }, pp.key_color ?? "#1A1A1A");
  await supabase.from("product").update({ body_html: designed }).eq("id", productId);

  // 2) 관리자 미리보기용 초안(content_draft)
  const drafts = generateDrafts(pp);
  await supabase.from("content_draft").delete().eq("product_id", productId).in("type", ["detail", "blog"]);
  await supabase.from("content_draft").insert(
    drafts.map((d) => ({ product_id: productId, type: d.type, title: d.title, body_html: d.body_html, keywords: d.keywords, seo_title: d.seo_title, seo_description: d.seo_description, status: "draft", generator: "template" })),
  );

  // 3) 블로그 초안(content_post, draft) — 제품당 1건 upsert
  const blog = drafts.find((d) => d.type === "blog");
  if (blog) {
    const sfId = pp.product_storefronts?.[0]?.storefront_id ?? null;
    await supabase.from("content_post").upsert({
      slug: `${pp.slug}-auto`, title: blog.title, body_html: blog.body_html,
      excerpt: blog.seo_description, storefront_id: sfId, status: "draft", author: "자동 생성",
    }, { onConflict: "slug" });
  }
}
