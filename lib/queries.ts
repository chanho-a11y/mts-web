import { createClient } from "@/lib/supabase/server";

export interface VariantLite {
  id: string;
  sku: string;
  base_price: number;
  weight_g: number | null;
  grind: string | null;
  option_values: Record<string, unknown>;
  position: number;
  is_active: boolean;
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
  categories: { slug: string; name_ko: string; name_en: string | null; position: number }[];
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function shape(row: any): ProductCardData {
  const variants = (row.product_variant ?? []).filter((v: any) => v.is_active);
  const minPrice = variants.length
    ? Math.min(...variants.map((v: any) => v.base_price))
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
    categories: cats,
  };
}

const SELECT = `slug,title_ko,title_en,one_liner,roast_level,flavor_notes,key_color,product_type,is_b2b_only,
  product_variant(sku,base_price,weight_g,grind,option_values,position,is_active),
  product_image(storage_path,alt,is_primary,position),
  product_categories(category(slug,name_ko,name_en,position)),
  product_storefronts!inner(storefront_id,is_visible)`;

export async function getStorefrontProducts(storefrontId: string | null): Promise<ProductCardData[]> {
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
}

export interface ProductDetail extends ProductCardData {
  id: string;
  body_html: string | null;
  origin: Record<string, any>;
  producer: string | null;
  variety: string | null;
  altitude: string | null;
  process: string | null;
  brew_recipe: Record<string, any>;
  weight_g: number | null;
  label_point: string | null;
  variants: VariantLite[];
  images: { storage_path: string; alt: string | null }[];
}

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("product")
    .select(`id,slug,title_ko,title_en,one_liner,roast_level,flavor_notes,key_color,product_type,is_b2b_only,
      body_html,origin,producer,variety,altitude,process,brew_recipe,weight_g,label_point,
      product_variant(id,sku,base_price,weight_g,grind,option_values,position,is_active),
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
    variety: d.variety,
    altitude: d.altitude,
    process: d.process,
    brew_recipe: d.brew_recipe ?? {},
    weight_g: d.weight_g,
    label_point: d.label_point ?? null,
    variants,
    images,
  };
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
