"use server";
import { createClient } from "@/lib/supabase/server";
import { getAdapter, type Provider } from "@/lib/payments";
import { computeShipping, KRW_PER_USD } from "@/lib/shipping";

export interface CheckoutItem { variantId: string; qty: number }
export interface CheckoutPayload {
  items: CheckoutItem[];
  tip: number;
  provider: Provider;
  shipping: { recipient: string; phone: string; country: string; zipcode: string; addr1: string; addr2: string };
}
export interface CheckoutResult { ok: boolean; orderNo?: string; message: string; pgReady?: boolean }

export async function createOrderAction(payload: CheckoutPayload): Promise<CheckoutResult> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "로그인이 필요합니다." };

  if (!payload.items.length) return { ok: false, message: "장바구니가 비어 있습니다." };

  // 가격 서버 재계산 (resolve_price: 개별가→등급가→정가) + 무게 합산
  let subtotal = 0;
  let totalWeight = 0;
  const lines: { variant_id: string; sku: string; title: string; option: any; unit: number; source: string; qty: number }[] = [];
  for (const it of payload.items) {
    const { data: v } = await supabase
      .from("product_variant")
      .select("id,sku,weight_g,option_values,product(title_ko)")
      .eq("id", it.variantId)
      .maybeSingle();
    if (!v) return { ok: false, message: "상품을 찾을 수 없습니다." };
    const { data: rp } = await supabase.rpc("resolve_price", { p_variant_id: it.variantId, p_profile_id: user.id });
    const row = Array.isArray(rp) ? rp[0] : rp;
    const unit = row?.price ?? 0;
    subtotal += unit * it.qty;
    totalWeight += ((v as any).weight_g ?? 0) * it.qty;
    lines.push({ variant_id: v.id, sku: (v as any).sku, title: (v as any).product?.title_ko ?? "", option: (v as any).option_values, unit, source: row?.source ?? "base", qty: it.qty });
  }

  const isIntl = payload.shipping.country !== "KR";
  const usd = payload.provider === "paypal" || isIntl;
  const currency = usd ? "USD" : "KRW";
  const tip = !usd ? Math.max(0, payload.tip || 0) : 0;

  // 배송비 (국내 무게구간 / 해외 EMS) — KRW 기준
  const ship = await computeShipping(supabase, payload.shipping.country, totalWeight);
  const shippingFeeKRW = ship.feeKRW;

  // 합계 (KRW 기준 산출 후, 해외/페이팔이면 USD 환산)
  const grandKRW = subtotal + tip + shippingFeeKRW;
  const grand = usd ? Math.max(1, Math.round(grandKRW / KRW_PER_USD)) : grandKRW;
  const shippingFee = usd ? Math.round(shippingFeeKRW / KRW_PER_USD) : shippingFeeKRW;
  const tax = !usd ? Math.round(subtotal / 11) : 0; // 부가세 포함가 역산(국내). 해외 0.

  // order_no
  const { data: noData } = await supabase.rpc("next_order_no");
  const orderNo = (noData as string) ?? `MTS${Date.now()}`;

  const { data: order, error: oErr } = await supabase
    .from("orders")
    .insert({
      order_no: orderNo, profile_id: user.id, customer_type: "individual",
      status: "created", email: user.email, phone: payload.shipping.phone,
      shipping_address: { ...payload.shipping, shipping_label: ship.label },
      items_subtotal: usd ? Math.round(subtotal / KRW_PER_USD) : subtotal, tip_amount: tip,
      shipping_fee: shippingFee, tax_amount: tax, grand_total: grand, currency,
      channel: "web",
    })
    .select("id")
    .single();
  if (oErr || !order) return { ok: false, message: `주문 생성 실패: ${oErr?.message}` };

  await supabase.from("order_item").insert(
    lines.map((l) => ({ order_id: order.id, variant_id: l.variant_id, sku: l.sku, title_snapshot: l.title, option_snapshot: l.option, unit_price: l.unit, price_source: l.source, qty: l.qty, line_total: l.unit * l.qty })),
  );

  const adapter = getAdapter(payload.provider);
  const init = await adapter.init({ orderId: order.id, orderNo, amount: grand, currency, returnUrl: "/checkout/complete" });
  await supabase.from("payment").insert({
    order_id: order.id, provider: payload.provider, amount: grand, currency,
    status: "ready", idempotency_key: `${orderNo}:${payload.provider}`,
  });

  return {
    ok: true, orderNo, pgReady: init.ready,
    message: init.ready ? "결제창으로 이동합니다." : `주문이 생성되었습니다 (주문번호 ${orderNo}). ${init.message}`,
  };
}
