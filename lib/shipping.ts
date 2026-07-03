import type { SupabaseClient } from "@supabase/supabase-js";

// 환율은 lib/fx.ts(getKrwPerUsd)의 실시간 값을 사용한다. 여기서는 KRW만 다룬다.

export interface ShippingQuote {
  feeKRW: number;
  label: string;
}

// 국내: 무게 구간 / 해외: EMS 국가·무게 브래킷
export async function computeShipping(
  supabase: SupabaseClient,
  country: string,
  totalWeightG: number,
): Promise<ShippingQuote> {
  if (country === "KR") {
    const { data } = await supabase
      .from("domestic_shipping_rate")
      .select("label,max_weight_g,fee")
      .order("position");
    const rows = data ?? [];
    const tier =
      rows.find((r) => r.max_weight_g == null || totalWeightG <= r.max_weight_g) ??
      rows[rows.length - 1];
    return { feeKRW: tier?.fee ?? 0, label: tier?.label ?? "기본 배송" };
  }
  // international → EMS premium: smallest bracket >= weight for that country
  const { data } = await supabase
    .from("ems_rate")
    .select("price,weight_g")
    .eq("country_code", country)
    .gte("weight_g", totalWeightG)
    .order("weight_g", { ascending: true })
    .limit(1);
  const row = data?.[0];
  if (!row) {
    // fallback: heaviest bracket
    const { data: max } = await supabase
      .from("ems_rate").select("price,weight_g").eq("country_code", country)
      .order("weight_g", { ascending: false }).limit(1);
    return { feeKRW: max?.[0]?.price ?? 0, label: `EMS ${country}` };
  }
  return { feeKRW: row.price, label: `EMS ${country} (~${row.weight_g}g)` };
}
