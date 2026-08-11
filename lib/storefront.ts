import { cache } from "react";
import { headers } from "next/headers";
import { brandForHost, type Brand } from "@/lib/brands";
import { type Locale } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";

export interface StorefrontContext {
  brand: Brand;
  storefrontId: string | null;
  /** storefront.brand_id — 주문 귀속(orders.brand_id)에 쓰는 '판매 주체' 브랜드 UUID (D-112). */
  brandId: string | null;
  locale: Locale;
}

// Resolve the current storefront (brand + storefront row id) for this request.
// cache(): 한 요청 안에서 여러 번 호출돼도 storefront 조회는 1회만 수행.
export const getStorefrontContext = cache(async function getStorefrontContext(): Promise<StorefrontContext> {
  const h = headers();
  const brand = brandForHost(h.get("host"));
  const locale: Locale = h.get("x-locale") === "en" ? "en" : "ko";
  let storefrontId: string | null = null;
  let brandId: string | null = null;
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from("storefront")
      .select("id,brand_id")
      .eq("domain", brand.domain)
      .maybeSingle();
    storefrontId = data?.id ?? null;
    brandId = (data as { brand_id?: string } | null)?.brand_id ?? null;
  } catch {
    storefrontId = null;
    brandId = null;
  }
  return { brand, storefrontId, brandId, locale };
});
