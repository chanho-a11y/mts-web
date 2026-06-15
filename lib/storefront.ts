import { headers } from "next/headers";
import { brandForHost, type Brand } from "@/lib/brands";
import { getLocale, type Locale } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";

export interface StorefrontContext {
  brand: Brand;
  storefrontId: string | null;
  locale: Locale;
}

// Resolve the current storefront (brand + storefront row id) for this request.
export async function getStorefrontContext(): Promise<StorefrontContext> {
  const brand = brandForHost(headers().get("host"));
  const locale = getLocale();
  let storefrontId: string | null = null;
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from("storefront")
      .select("id")
      .eq("domain", brand.domain)
      .maybeSingle();
    storefrontId = data?.id ?? null;
  } catch {
    storefrontId = null;
  }
  return { brand, storefrontId, locale };
}
