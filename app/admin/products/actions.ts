"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { generateDrafts } from "@/lib/content-gen";

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
  const domain = is_b2b ? "mtspace.coffee" : "normcorecoffee.com";
  const { data: sf } = await supabase.from("storefront").select("id").eq("domain", domain).maybeSingle();
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
    .select("title_ko,one_liner,flavor_notes,roast_level,origin,variety,process,weight_g,body_html")
    .eq("id", productId).maybeSingle();
  if (!p) return;
  const drafts = generateDrafts(p as any);
  // 기존 동타입 초안 정리 후 재생성
  await supabase.from("content_draft").delete().eq("product_id", productId).in("type", ["detail", "blog"]);
  await supabase.from("content_draft").insert(
    drafts.map((d) => ({ product_id: productId, type: d.type, title: d.title, body_html: d.body_html, keywords: d.keywords, seo_title: d.seo_title, seo_description: d.seo_description, status: "draft", generator: "template" })),
  );
}
