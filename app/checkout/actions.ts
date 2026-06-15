"use server";
import { createClient } from "@/lib/supabase/server";
import { getAdapter, type Provider } from "@/lib/payments";

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

  // 가격 서버 재계산 (resolve_price: 개별가→등급가→정가)
  let subtotal = 0;
  const lines: { variant_id: string; sku: string; title: string; option: any; unit: number; source: string; qty: number }[] = [];
  for (const it of payload.items) {
    const { data: v } = await supabase
      .from("product_variant")
      .select("id,sku,option_values,product(title_ko)")
      .eq("id", it.variantId)
      .maybeSingle();
    if (!v) return { ok: false, message: "상품을 찾을 수 없습니다." };
    const { data: rp } = await supabase.rpc("resolve_price", { p_variant_id: it.variantId, p_profile_id: user.id });
    const row = Array.isArray(rp) ? rp[0] : rp;
    const unit = row?.price ?? 0;
    subtotal += unit * it.qty;
    lines.push({ variant_id: v.id, sku: (v as any).sku, title: (v as any).product?.title_ko ?? "", option: (v as any).option_values, unit, source: row?.source ?? "base", qty: it.qty });
  }

  const isIntl = payload.shipping.country !== "KR";
  const currency = payload.provider === "paypal" ? "USD" : "KRW";
  const tip = currency === "KRW" ? Math.max(0, payload.tip || 0) : 0;
  const shippingFee = 0; // TODO: 국내 무게구간 / EMS 계산 (P4 배송설정 연동)
  const tax = currency === "KRW" ? Math.round((subtotal) / 11) : 0; // 부가세 포함가 역산
  const grand = subtotal + tip + shippingFee;

  // order_no
  const { data: noData } = await supabase.rpc("next_order_no");
  const orderNo = (noData as string) ?? `MTS${Date.now()}`;

  const { data: order, error: oErr } = await supabase
    .from("orders")
    .insert({
      order_no: orderNo, profile_id: user.id, customer_type: "individual",
      status: "created", email: user.email, phone: payload.shipping.phone,
      shipping_address: payload.shipping, items_subtotal: subtotal, tip_amount: tip,
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
