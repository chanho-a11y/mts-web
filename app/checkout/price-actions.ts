"use server";
import { createClient } from "@/lib/supabase/server";

// 장바구니·체크아웃 표시용 라인별 실적용가 조회.
// 로그인 고객이면 개별가→등급가→정가 순(resolve_price), 비회원·미배정은 정가.
// 주문 생성부(createOrderAction)·배송 견적(/api/shipping/quote)과 동일한 resolve_price 규칙을
// 그대로 사용해 "표시 = 실제 청구"가 어긋나지 않도록 한다. (상품 목록·상세는 정가 유지)
export async function resolveCartPricesAction(
  items: { variantId: string }[],
): Promise<Record<string, number>> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const profileId = user?.id ?? null;

  const out: Record<string, number> = {};
  for (const it of items) {
    if (!it?.variantId || out[it.variantId] != null) continue;
    const { data: rp } = await supabase.rpc("resolve_price", { p_variant_id: it.variantId, p_profile_id: profileId });
    const row = Array.isArray(rp) ? rp[0] : rp;
    if (row?.price != null) out[it.variantId] = row.price as number;
  }
  return out;
}
