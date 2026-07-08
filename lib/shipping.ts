import type { SupabaseClient } from "@supabase/supabase-js";
import { getKrwPerUsd } from "./fx";

// 해외 배송 공통 취급수수료 (USD). 최종 해외 배송비 = EMS 요율(원화) + 이 수수료(원화 환산).
const INTL_SURCHARGE_USD = 20;

// 환율은 lib/fx.ts(getKrwPerUsd)의 실시간 값을 사용한다. 여기서는 KRW만 다룬다.

export interface ShippingQuote {
  feeKRW: number;
  label: string;
  hasRate: boolean;               // false면 해당 국가 EMS 요율 미등록(별도 안내)
  freeThresholdKRW?: number;      // 국내 무료배송 기준금액(설정 시)
  freeApplies?: boolean;          // 이번 주문이 무료배송 조건 충족
}

// 국내 무료배송 기준금액(원) — 관리자>배송관리에서 site_setting.free_ship_threshold_krw 로 설정. 미설정=무료 없음.
async function freeThresholdKRW(supabase: SupabaseClient): Promise<number> {
  const { data } = await supabase.from("site_setting").select("value").eq("key", "free_ship_threshold_krw").limit(1).maybeSingle();
  const n = data?.value ? Number(data.value) : 0;
  return Number.isFinite(n) && n > 0 ? n : 0;
}

// 국내: 무게 구간(+금액 무료임계) / 해외: EMS 국가·무게 브래킷
export async function computeShipping(
  supabase: SupabaseClient,
  country: string,
  totalWeightG: number,
  subtotalKRW?: number,
): Promise<ShippingQuote> {
  if (country === "KR") {
    const threshold = await freeThresholdKRW(supabase);
    if (threshold > 0 && subtotalKRW != null && subtotalKRW >= threshold) {
      return { feeKRW: 0, label: "무료배송", hasRate: true, freeThresholdKRW: threshold, freeApplies: true };
    }
    const { data } = await supabase
      .from("domestic_shipping_rate")
      .select("label,max_weight_g,fee")
      .order("position");
    const rows = data ?? [];
    const tier =
      rows.find((r) => r.max_weight_g == null || totalWeightG <= r.max_weight_g) ??
      rows[rows.length - 1];
    return { feeKRW: tier?.fee ?? 0, label: tier?.label ?? "기본 배송", hasRate: true, freeThresholdKRW: threshold || undefined, freeApplies: false };
  }
  // international → EMS: smallest bracket >= weight for that country. + USD 20 취급수수료(원화 환산)
  const surchargeKRW = Math.round(INTL_SURCHARGE_USD * (await getKrwPerUsd()));
  const { data } = await supabase
    .from("ems_rate")
    .select("price,weight_g")
    .eq("country_code", country)
    .gte("weight_g", totalWeightG)
    .order("weight_g", { ascending: true })
    .limit(1);
  const row = data?.[0];
  if (row) return { feeKRW: row.price + surchargeKRW, label: `EMS ${country} (~${row.weight_g}g) +$${INTL_SURCHARGE_USD}`, hasRate: true };

  // fallback: heaviest bracket이라도 있으면 사용
  const { data: max } = await supabase
    .from("ems_rate").select("price,weight_g").eq("country_code", country)
    .order("weight_g", { ascending: false }).limit(1);
  if (max?.[0]) return { feeKRW: max[0].price + surchargeKRW, label: `EMS ${country} +$${INTL_SURCHARGE_USD}`, hasRate: true };

  // 요율 미등록 국가(예: OTHER, 요율표 없는 국가) → 결제 후 별도 안내
  return { feeKRW: 0, label: "해외배송비 별도 안내", hasRate: false };
}
