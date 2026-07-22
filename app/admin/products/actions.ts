"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { generateDrafts, buildDesignedDetailHtml } from "@/lib/content-gen";
import { buildRecipeFromForm } from "@/lib/recipe";
import { buildEvidenceFromForm } from "@/lib/evidence";

function csv(v: string): string[] {
  return v.split(/[,·]/).map((s) => s.trim()).filter(Boolean);
}
function orNull(v: string): string | null { return v.trim() ? v.trim() : null; }
function csvOrNull(v: string): string[] | null { const a = csv(v); return a.length ? a : null; }

// 카테고리 → 제품 유형(통합: 유형/카테고리 단일화). 저장 시 서버에서 파생.
const CAT_TYPE: Record<string, string> = {
  blends: "블렌드", "single-origins": "싱글 오리진", wholesale: "블렌드",
  normcore: "블렌드", decaf: "디카페인", merch: "merch", limited: "블렌드",
};
function typeFromCategory(cat: string): string { return CAT_TYPE[cat] ?? "블렌드"; }
// 발행(published) → active(스토어프론트 노출), 초안(draft) → draft(숨김)
function mapStatus(s: string): string { return s === "draft" ? "draft" : "active"; }

export async function upsertProductAction(formData: FormData) {
  const supabase = createClient();
  const slug = String(formData.get("slug") || "").trim();
  const brandCode = String(formData.get("brand") || "mtspace");
  const { data: brand } = await supabase.from("brand").select("id").eq("code", brandCode).maybeSingle();
  if (!slug || !brand) redirect("/admin/products?error=slug/brand");

  const catSlug = String(formData.get("category") || "");
  // 카테고리 wholesale(사업자 전용)이면 자동으로 B2B 전용 처리
  const is_b2b = formData.get("is_b2b_only") === "on" || catSlug === "wholesale";
  const g = (n: string) => String(formData.get(n) || "");
  const row = {
    slug,
    brand_id: brand.id,
    title_ko: g("title_ko"),
    title_en: orNull(g("title_en")),
    one_liner: g("one_liner"),
    one_liner_en: orNull(g("one_liner_en")),
    product_type: typeFromCategory(catSlug),
    status: mapStatus(g("status") || "published"),
    is_b2b_only: is_b2b,
    roast_level: g("roast_level"),
    roast_level_en: orNull(g("roast_level_en")),
    flavor_notes: csv(g("flavor_notes")),
    flavor_notes_en: csvOrNull(g("flavor_notes_en")),
    origin: { country: g("origin_country"), country_en: g("origin_country_en") || null },
    variety: orNull(g("variety")),
    variety_en: orNull(g("variety_en")),
    process: orNull(g("process")),
    process_en: orNull(g("process_en")),
    weight_g: parseInt(g("weight_g") || "0", 10) || null,
    key_color: orNull(g("key_color")),
    report_no: orNull(g("report_no")),
    material: orNull(g("material")),
    story: orNull(g("story")),
    story_en: orNull(g("story_en")),
    cost: parseInt(g("cost"), 10) || null,
    recipe: buildRecipeFromForm(g),
    evidence: buildEvidenceFromForm(g),
  };
  const { data: prod, error } = await supabase.from("product").upsert(row, { onConflict: "slug" }).select("id").single();
  if (error || !prod) redirect(`/admin/products?error=${encodeURIComponent(error?.message ?? "save")}`);

  // 대표 변형 — SKU = 슬러그(자동). 기존 변형이 있으면 갱신(중복 변형 방지).
  const sku = slug;
  const price = parseInt(String(formData.get("base_price") || "0"), 10) || 0;
  const { data: existV } = await supabase.from("product_variant").select("id").eq("product_id", prod.id).order("position").limit(1).maybeSingle();
  if (existV) {
    const upd: Record<string, unknown> = { sku, weight_g: row.weight_g };
    if (price > 0) upd.base_price = price;
    await supabase.from("product_variant").update(upd).eq("id", (existV as { id: string }).id);
  } else if (price > 0) {
    await supabase.from("product_variant").insert({ product_id: prod.id, sku, base_price: price, weight_g: row.weight_g, grind: "whole", option_values: {}, position: 1 });
  }
  // 카테고리·스토어프론트 연결
  if (catSlug) {
    const { data: cat } = await supabase.from("category").select("id").eq("slug", catSlug).maybeSingle();
    if (cat) await supabase.from("product_categories").upsert({ product_id: prod.id, category_id: cat.id });
  }
  // MTSPACE 단일 사이트 — 모든 제품을 mtspace.coffee 스토어프론트에 노출(B2B 여부는 RLS·역할로 제어)
  const { data: sf } = await supabase.from("storefront").select("id").eq("domain", "mtspace.coffee").maybeSingle();
  if (sf) await supabase.from("product_storefronts").upsert({ product_id: prod.id, storefront_id: sf.id, is_visible: true });

  revalidatePath("/admin/products");
  redirect(`/admin/products/${slug}?saved=1`);
}

/** 일괄 등록용 1행 저장 — 단건 폼과 동일 규칙으로 product/variant/category/storefront upsert.
 *  redirect 없이 결과만 반환(여러 행을 순차 처리하기 위함). */
async function saveProductRow(
  supabase: ReturnType<typeof createClient>,
  d: Record<string, string>,
): Promise<{ slug: string; ok: boolean; error?: string }> {
  const slug = String(d.slug || "").trim();
  const brandCode = String(d.brand || "mtspace").trim() || "mtspace";
  if (!slug) return { slug, ok: false, error: "슬러그 누락" };

  const { data: brand } = await supabase.from("brand").select("id").eq("code", brandCode).maybeSingle();
  if (!brand) return { slug, ok: false, error: `브랜드 코드 오류(${brandCode})` };

  const isTrue = (v: string) => /^(y|yes|true|1|o|on)$/i.test(String(v || "").trim());
  const catSlugRow = String(d.category || "").trim();
  const gd = (n: string) => String(d[n] || "");
  const row = {
    slug,
    brand_id: brand.id,
    title_ko: gd("title_ko"),
    title_en: orNull(gd("title_en")),
    one_liner: gd("one_liner"),
    one_liner_en: orNull(gd("one_liner_en")),
    product_type: d.product_type ? String(d.product_type) : typeFromCategory(catSlugRow),
    status: mapStatus(gd("status") || "published"),
    is_b2b_only: isTrue(d.is_b2b_only) || catSlugRow === "wholesale",
    roast_level: gd("roast_level"),
    roast_level_en: orNull(gd("roast_level_en")),
    flavor_notes: csv(gd("flavor_notes")),
    flavor_notes_en: csvOrNull(gd("flavor_notes_en")),
    origin: { country: gd("origin_country"), country_en: gd("origin_country_en") || null },
    variety: orNull(gd("variety")),
    variety_en: orNull(gd("variety_en")),
    process: orNull(gd("process")),
    process_en: orNull(gd("process_en")),
    weight_g: parseInt(gd("weight_g") || "0", 10) || null,
    key_color: orNull(gd("key_color")),
    report_no: orNull(gd("report_no")),
    material: orNull(gd("material")),
    story: orNull(gd("story")),
    story_en: orNull(gd("story_en")),
    cost: parseInt(gd("cost"), 10) || null,
    recipe: buildRecipeFromForm(gd),
  };
  const { data: prod, error } = await supabase.from("product").upsert(row, { onConflict: "slug" }).select("id").single();
  if (error || !prod) return { slug, ok: false, error: error?.message ?? "저장 실패" };

  // SKU = 슬러그(자동)
  const sku = slug;
  const price = parseInt(String(d.base_price || "0"), 10) || 0;
  const { data: existBV } = await supabase.from("product_variant").select("id").eq("product_id", prod.id).order("position").limit(1).maybeSingle();
  if (existBV) {
    const upd: Record<string, unknown> = { sku, weight_g: row.weight_g };
    if (price > 0) upd.base_price = price;
    await supabase.from("product_variant").update(upd).eq("id", (existBV as { id: string }).id);
  } else if (price > 0) {
    await supabase.from("product_variant").insert({ product_id: prod.id, sku, base_price: price, weight_g: row.weight_g, grind: "whole", option_values: {}, position: 1 });
  }
  const catSlug = String(d.category || "").trim();
  if (catSlug) {
    const { data: cat } = await supabase.from("category").select("id").eq("slug", catSlug).maybeSingle();
    if (cat) await supabase.from("product_categories").upsert({ product_id: prod.id, category_id: cat.id });
  }
  const { data: sf } = await supabase.from("storefront").select("id").eq("domain", "mtspace.coffee").maybeSingle();
  if (sf) await supabase.from("product_storefronts").upsert({ product_id: prod.id, storefront_id: sf.id, is_visible: true });

  if (isTrue(d.auto_content)) {
    try { await generateForProduct(prod.id); } catch {}
  }
  return { slug, ok: true };
}

/** 일괄 등록 — 클라이언트에서 검증·미리보기 후 확정한 행(JSON)을 받아 순차 저장. */
export async function bulkUpsertProductsAction(formData: FormData) {
  const raw = String(formData.get("rows") || "[]");
  let rows: Record<string, string>[] = [];
  try { rows = JSON.parse(raw); } catch { redirect("/admin/products/bulk?error=" + encodeURIComponent("데이터 파싱 실패")); }
  if (!Array.isArray(rows) || rows.length === 0) redirect("/admin/products/bulk?error=" + encodeURIComponent("등록할 행이 없습니다"));

  const supabase = createClient();
  let ok = 0;
  const fails: string[] = [];
  for (const r of rows) {
    const res = await saveProductRow(supabase, r);
    if (res.ok) ok++; else fails.push(`${res.slug || "(슬러그없음)"}: ${res.error}`);
  }
  revalidatePath("/admin/products");
  const params = new URLSearchParams({ bulk: "done", ok: String(ok), fail: String(fails.length) });
  if (fails.length) params.set("failmsg", fails.slice(0, 10).join(" / "));
  redirect("/admin/products?" + params.toString());
}

export async function archiveProductAction(formData: FormData) {
  const slug = String(formData.get("slug") || "").trim();
  if (!slug) redirect("/admin/products?error=slug");
  const supabase = createClient();
  // 소프트 삭제: status=archived 로 전환(주문·재고 FK 보존, 스토어프론트 자동 숨김)
  await supabase.from("product").update({ status: "archived" }).eq("slug", slug);
  revalidatePath("/admin/products");
  redirect(`/admin/products?saved=1&msg=${encodeURIComponent("보관되었습니다")}`);
}

export async function restoreProductAction(formData: FormData) {
  const slug = String(formData.get("slug") || "").trim();
  if (!slug) redirect("/admin/products?error=slug");
  const supabase = createClient();
  const { data: prod } = await supabase.from("product").update({ status: "active" }).eq("slug", slug).select("id").maybeSingle();
  // 게시 시 스토어프론트 노출 링크 보장(누락 시 게시해도 쇼핑에 안 뜨던 버그 수정)
  const { data: sf } = await supabase.from("storefront").select("id").eq("domain", "mtspace.coffee").maybeSingle();
  if (prod && sf) await supabase.from("product_storefronts").upsert({ product_id: (prod as { id: string }).id, storefront_id: (sf as { id: string }).id, is_visible: true }, { onConflict: "product_id,storefront_id" });
  revalidatePath("/admin/products");
  redirect(`/admin/products?show=archived&saved=1&msg=${encodeURIComponent("복구되었습니다")}`);
}

// 제품 복제 — 전체 내용 복사 후 새 초안으로 생성하고 수정 화면으로 이동(사용자가 정보 재입력).
export async function duplicateProductAction(formData: FormData) {
  const slug = String(formData.get("slug") || "").trim();
  if (!slug) redirect("/admin/products?error=slug");
  const supabase = createClient();
  const { data: src } = await supabase.from("product").select("*").eq("slug", slug).maybeSingle();
  if (!src) redirect(`/admin/products?error=${encodeURIComponent("원본 제품을 찾을 수 없습니다")}`);
  const s = src as Record<string, unknown>;
  const newSlug = `${slug}-copy-${Date.now().toString(36).slice(-4)}`;
  const { id: srcId, created_at: _c, updated_at: _u, published_at: _p, ...rest } = s as { id: string; created_at?: unknown; updated_at?: unknown; published_at?: unknown };
  const { data: np, error } = await supabase.from("product")
    .insert({ ...rest, slug: newSlug, title_ko: `${String(s.title_ko ?? "")} (복사본)`, status: "draft" })
    .select("id").single();
  if (error || !np) redirect(`/admin/products?error=${encodeURIComponent(error?.message ?? "복제 실패")}`);
  const newId = (np as { id: string }).id;
  // 카테고리 복사
  const { data: pcs } = await supabase.from("product_categories").select("category_id").eq("product_id", srcId);
  for (const pc of (pcs ?? []) as { category_id: string }[]) {
    await supabase.from("product_categories").upsert({ product_id: newId, category_id: pc.category_id });
  }
  // 대표 변형 복사(SKU 유니크 → 접미사)
  const { data: pv } = await supabase.from("product_variant").select("*").eq("product_id", srcId).order("position").limit(1).maybeSingle();
  if (pv) {
    const v = pv as Record<string, unknown>;
    const { id: _vi, product_id: _vp, created_at: _vc, updated_at: _vu, ...vrest } = v as { id: string; product_id: string; created_at?: unknown; updated_at?: unknown };
    await supabase.from("product_variant").insert({ ...vrest, product_id: newId, sku: newSlug });
  }
  revalidatePath("/admin/products");
  redirect(`/admin/products/${newSlug}?saved=1&msg=${encodeURIComponent("복제되었습니다 — 내용을 수정 후 저장하세요")}`);
}

export async function generateDraftsAction(formData: FormData) {
  const productId = String(formData.get("product_id") || "");
  const slug = String(formData.get("slug") || "");
  await generateForProduct(productId);
  revalidatePath(`/admin/products/${slug}`);
}

// 사업자 전용 — 고객별 납품가 저장 (customer_variant_prices). 납품가=절대가(원).
export async function saveCustomerPriceAction(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const profileId = String(formData.get("profile_id") || "");
  const variantId = String(formData.get("variant_id") || "");
  const price = parseInt(String(formData.get("price") || ""), 10);
  const slug = String(formData.get("slug") || "");
  const note = String(formData.get("note") || "") || null;
  if (!profileId || !variantId || !price || price <= 0) redirect(`/admin/products/${slug}?error=${encodeURIComponent("고객·변형·납품가를 확인하세요")}`);
  // (profile, variant) 유일 — 수동 upsert
  const { data: existing } = await supabase
    .from("customer_variant_prices").select("id")
    .eq("profile_id", profileId).eq("variant_id", variantId).maybeSingle();
  if (existing) {
    await supabase.from("customer_variant_prices").update({ price, note, updated_at: new Date().toISOString() }).eq("id", existing.id);
  } else {
    await supabase.from("customer_variant_prices").insert({ profile_id: profileId, variant_id: variantId, price, note, created_by: user?.id ?? null });
  }
  revalidatePath(`/admin/products/${slug}`);
  redirect(`/admin/products/${slug}?saved=1&msg=${encodeURIComponent("고객 단가가 저장되었습니다")}`);
}

export async function deleteCustomerPriceAction(formData: FormData) {
  const supabase = createClient();
  const id = String(formData.get("id") || "");
  const slug = String(formData.get("slug") || "");
  if (id) await supabase.from("customer_variant_prices").delete().eq("id", id);
  revalidatePath(`/admin/products/${slug}`);
  redirect(`/admin/products/${slug}?saved=1&msg=${encodeURIComponent("고객 단가가 삭제되었습니다")}`);
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
  redirect(`/admin/products/${slug}?saved=1&msg=${encodeURIComponent("재고가 조정되었습니다")}`);
}

/** 제품 목록 인라인 재고 저장 — 목표 재고(절대값)를 받아 현재고 대비 delta 를 ledger 에 기록.
 *  현재고는 서버에서 재계산(current_stock RPC)하므로 목록 화면이 낡아도 최종값은 입력값과 일치. */
export async function setStockAction(variantId: string, target: number): Promise<{ ok: true; stock: number } | { ok: false; error: string }> {
  if (!variantId || !Number.isFinite(target) || target < 0) return { ok: false, error: "재고 값을 확인하세요" };
  const t = Math.floor(target);
  const supabase = createClient();
  const { data: current, error: rpcErr } = await supabase.rpc("current_stock", { p_variant_id: variantId });
  if (rpcErr) return { ok: false, error: rpcErr.message };
  const delta = t - (Number(current) || 0);
  if (delta !== 0) {
    const { error } = await supabase.from("inventory_ledger").insert({ variant_id: variantId, delta, reason: "adjust" });
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath("/admin/products");
  return { ok: true, stock: t };
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
