import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { SOLD_STATUSES, isInternalOrder } from "@/lib/analytics";

export interface VariantLite {
  id: string;
  sku: string;
  base_price: number;
  weight_g: number | null;
  grind: string | null;
  option_values: Record<string, unknown>;
  position: number;
  is_active: boolean;
  is_b2b_only: boolean;
}
export interface ProductCardData {
  slug: string;
  title_ko: string;
  title_en: string | null;
  one_liner: string | null;
  roast_level: string | null;
  flavor_notes: string[];
  key_color: string | null;
  product_type: string | null;
  is_b2b_only: boolean;
  image: string | null;
  imageAlt: string | null;
  minPrice: number;
  created_at: string | null;
  categories: { slug: string; name_ko: string; name_en: string | null; position: number }[];
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function shape(row: any): ProductCardData {
  const activeVariants = (row.product_variant ?? []).filter((v: any) => v.is_active);
  // 카드 최저가: 소비자(비-도매) variant 우선, 없으면(도매전용 제품) 전체 기준.
  const consumerVariants = activeVariants.filter((v: any) => !v.is_b2b_only);
  const priced = consumerVariants.length ? consumerVariants : activeVariants;
  const minPrice = priced.length
    ? Math.min(...priced.map((v: any) => v.base_price))
    : 0;
  const imgs = (row.product_image ?? []).slice().sort(
    (a: any, b: any) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0) || a.position - b.position,
  );
  const cats = (row.product_categories ?? [])
    .map((pc: any) => pc.category)
    .filter(Boolean);
  return {
    slug: row.slug,
    title_ko: row.title_ko,
    title_en: row.title_en,
    one_liner: row.one_liner,
    roast_level: row.roast_level,
    flavor_notes: row.flavor_notes ?? [],
    key_color: row.key_color,
    product_type: row.product_type,
    is_b2b_only: row.is_b2b_only,
    image: imgs[0]?.storage_path ?? null,
    imageAlt: imgs[0]?.alt ?? row.title_ko,
    minPrice,
    created_at: row.created_at ?? null,
    categories: cats,
  };
}

const SELECT = `slug,title_ko,title_en,one_liner,roast_level,flavor_notes,key_color,product_type,is_b2b_only,created_at,
  product_variant(sku,base_price,weight_g,grind,option_values,position,is_active,is_b2b_only),
  product_image(storage_path,alt,is_primary,position),
  product_categories(category(slug,name_ko,name_en,position)),
  product_storefronts!inner(storefront_id,is_visible)`;

// cache(): 동일 요청 내 중복 호출(예: 홈의 카테고리 + 베스트셀러) 시 제품 조회 1회로 합침.
export const getStorefrontProducts = cache(async function getStorefrontProducts(
  storefrontId: string | null,
): Promise<ProductCardData[]> {
  if (!storefrontId) return [];
  const supabase = createClient();
  const { data, error } = await supabase
    .from("product")
    .select(SELECT)
    .eq("status", "active")
    .eq("product_storefronts.storefront_id", storefrontId)
    .eq("product_storefronts.is_visible", true);
  if (error || !data) return [];
  return data.map(shape);
});

export interface ProductDetail extends ProductCardData {
  id: string;
  body_html: string | null;
  origin: Record<string, any>;
  producer: string | null;
  producer_en: string | null;
  variety: string | null;
  variety_en: string | null;
  altitude: string | null;
  altitude_en: string | null;
  process: string | null;
  process_en: string | null;
  one_liner_en: string | null;
  roast_level_en: string | null;
  flavor_notes_en: string[] | null;
  story: string | null;
  story_en: string | null;
  brew_recipe: Record<string, any>;
  recipe: Record<string, any> | null;
  recipe_en: Record<string, any> | null;
  weight_g: number | null;
  label_point: string | null;
  variants: VariantLite[];
  images: { storage_path: string; alt: string | null }[];
}

// cache(): generateMetadata + 페이지 본문에서 같은 slug를 두 번 호출해도 조회 1회로 합침.
export const getProductBySlug = cache(async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("product")
    .select(`id,slug,title_ko,title_en,one_liner,one_liner_en,roast_level,roast_level_en,flavor_notes,flavor_notes_en,key_color,product_type,is_b2b_only,created_at,
      body_html,origin,producer,producer_en,variety,variety_en,altitude,altitude_en,process,process_en,story,story_en,brew_recipe,recipe,recipe_en,weight_g,label_point,
      product_variant(id,sku,base_price,weight_g,grind,option_values,position,is_active,is_b2b_only),
      product_image(storage_path,alt,is_primary,position),
      product_categories(category(slug,name_ko,name_en,position))`)
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();
  if (error || !data) return null;
  const base = shape(data);
  const d: any = data;
  const variants = (d.product_variant ?? [])
    .filter((v: any) => v.is_active)
    .sort((a: any, b: any) => a.position - b.position);
  const images = (d.product_image ?? [])
    .slice()
    .sort((a: any, b: any) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0) || a.position - b.position)
    .map((i: any) => ({ storage_path: i.storage_path, alt: i.alt }));
  return {
    ...base,
    id: d.id,
    body_html: d.body_html,
    origin: d.origin ?? {},
    producer: d.producer,
    producer_en: d.producer_en ?? null,
    variety: d.variety,
    variety_en: d.variety_en ?? null,
    altitude: d.altitude,
    altitude_en: d.altitude_en ?? null,
    process: d.process,
    process_en: d.process_en ?? null,
    one_liner_en: d.one_liner_en ?? null,
    roast_level_en: d.roast_level_en ?? null,
    flavor_notes_en: d.flavor_notes_en ?? null,
    story: d.story ?? null,
    story_en: d.story_en ?? null,
    brew_recipe: d.brew_recipe ?? {},
    recipe: d.recipe ?? null,
    recipe_en: d.recipe_en ?? null,
    weight_g: d.weight_g,
    label_point: d.label_point ?? null,
    variants,
    images,
  };
});

// 베스트셀러 — 결제완료(+) 주문의 order_item 판매수량 합계 기준 정렬. 판매 이력이 없으면 기본 순서 폴백.
export const getBestsellers = cache(async function getBestsellers(
  storefrontId: string | null,
  limit = 8,
): Promise<ProductCardData[]> {
  const products = await getStorefrontProducts(storefrontId);
  if (!products.length) return [];
  const supabase = createClient();
  const { data } = await supabase
    .from("order_item")
    .select("qty,order:orders(status,currency,customer_type),variant:product_variant(product:product(slug))")
    .limit(20000);
  const sold = new Map<string, number>();
  for (const it of (data ?? []) as any[]) {
    const o = it.order;
    if (!o || o.currency !== "KRW" || !SOLD_STATUSES.includes(o.status)) continue;
    if (isInternalOrder(o)) continue; // 관리자 테스트 주문은 베스트셀러 순위에서 제외
    const slug = it.variant?.product?.slug;
    if (!slug) continue;
    sold.set(slug, (sold.get(slug) ?? 0) + (it.qty || 0));
  }
  return [...products]
    .map((p, idx) => ({ p, n: sold.get(p.slug) ?? 0, idx }))
    .sort((a, b) => b.n - a.n || a.idx - b.idx)
    .map((x) => x.p)
    .slice(0, limit);
});

// 이달의 신상품 — created_at 최신순. 이번 달 등록분 우선, 부족하면 최근 등록분으로 채움.
export async function getNewArrivals(storefrontId: string | null, limit = 8): Promise<ProductCardData[]> {
  const products = await getStorefrontProducts(storefrontId);
  const byRecent = [...products].sort(
    (a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime(),
  );
  const now = new Date();
  const thisMonth = byRecent.filter((p) => {
    if (!p.created_at) return false;
    const d = new Date(p.created_at);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });
  const base = thisMonth.length >= 3 ? thisMonth : byRecent;
  return base.slice(0, limit);
}

// 연관 제품 3개 — 블렌드: 블렌드 2 + 싱글오리진 1 / 싱글오리진: 싱글오리진 2 + 디카페인 1.
// 디카페인이 없으면(카테고리 삭제됨) 싱글오리진/기타로 폴백해 3개를 채운다.
export async function getRelatedProducts(
  storefrontId: string | null,
  currentSlug: string,
  isBlend: boolean,
): Promise<ProductCardData[]> {
  const products = await getStorefrontProducts(storefrontId);
  const others = products.filter((p) => p.slug !== currentSlug && !p.is_b2b_only);
  const inCat = (p: ProductCardData, slug: string) => p.categories.some((c) => c.slug === slug);
  const blends = others.filter((p) => inCat(p, "blends"));
  const singles = others.filter((p) => inCat(p, "single-origins"));
  const decaf = others.filter((p) => inCat(p, "decaf"));
  const picks: ProductCardData[] = isBlend
    ? [...blends.slice(0, 2), ...singles.slice(0, 1)]
    : [...singles.slice(0, 2), ...decaf.slice(0, 1)];
  const seen = new Set(picks.map((p) => p.slug));
  for (const p of others) {
    if (picks.length >= 3) break;
    if (!seen.has(p.slug)) { picks.push(p); seen.add(p.slug); }
  }
  return picks.slice(0, 3);
}

export async function getCategories(storefrontId: string | null) {
  const products = await getStorefrontProducts(storefrontId);
  const map = new Map<string, { slug: string; name_ko: string; name_en: string | null; position: number; products: ProductCardData[] }>();
  for (const p of products) {
    for (const c of p.categories) {
      if (!map.has(c.slug)) map.set(c.slug, { ...c, products: [] });
      map.get(c.slug)!.products.push(p);
    }
  }
  return [...map.values()].sort((a, b) => a.position - b.position);
}
