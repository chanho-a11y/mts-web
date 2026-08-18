"use server";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { getAdapter, type Provider } from "@/lib/payments";
import { computeShipping } from "@/lib/shipping";
import { getKrwPerUsd } from "@/lib/fx";
import { getStorefrontContext } from "@/lib/storefront";
import { MAX_ADDRESSES, addressKey } from "@/lib/address";

export interface CheckoutItem { variantId: string; qty: number }
export interface CheckoutPayload {
  items: CheckoutItem[];
  tip: number;
  provider: Provider;
  code?: string;
  email?: string;
  mobile?: boolean;   // 클라이언트 기기 판별(이니시스 PC/모바일 모듈 분기)
  payMethod?: string; // 모바일 이니시스 지불수단(CARD|BANK)
  saveAddress?: boolean; // 이 배송지를 주소록에 저장(로그인 회원·국내 주소만)
  shipping: {
    recipient: string; phone: string; country: string; zipcode: string; addr1: string; addr2: string;
    state?: string; city?: string; countryName?: string; // 해외 배송지(주/도·도시·기타국가명)
  };
}

// 쿠폰/프로모션 코드 → KRW subtotal 기준 할인액
async function resolveDiscount(supabase: any, code: string, subtotal: number): Promise<{ amount: number; label: string }> {
  if (!code) return { amount: 0, label: "" };
  const now = new Date().toISOString();
  const { data: c } = await supabase.from("coupon").select("type,value,min_order,starts_at,ends_at,is_active").eq("code", code).maybeSingle();
  let src: { type: string; value: number; min_order: number; starts_at: string | null; ends_at: string | null; is_active: boolean } | null = null;
  if (c) src = { type: c.type, value: c.value, min_order: c.min_order ?? 0, starts_at: c.starts_at, ends_at: c.ends_at, is_active: c.is_active };
  else {
    const { data: pr } = await supabase.from("promotion").select("discount_type,value,starts_at,ends_at,is_active").eq("code", code).maybeSingle();
    if (pr && pr.discount_type) src = { type: pr.discount_type, value: pr.value, min_order: 0, starts_at: pr.starts_at, ends_at: pr.ends_at, is_active: pr.is_active };
  }
  if (!src || src.is_active === false) return { amount: 0, label: "" };
  if (src.min_order && subtotal < src.min_order) return { amount: 0, label: "" };
  if (src.starts_at && now < src.starts_at) return { amount: 0, label: "" };
  if (src.ends_at && now > src.ends_at) return { amount: 0, label: "" };
  const amount = src.type === "percent" ? Math.round((subtotal * src.value) / 100) : Math.min(src.value, subtotal);
  return { amount, label: code };
}
export interface CheckoutResult {
  ok: boolean;
  orderNo?: string;
  message: string;
  pgReady?: boolean;
  redirectUrl?: string | null;
  form?: { sdk: "inicis" | "inicis-mobile"; action?: string; fields: Record<string, string> } | null;
}

export async function createOrderAction(payload: CheckoutPayload): Promise<CheckoutResult> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!payload.items.length) return { ok: false, message: "장바구니가 비어 있습니다." };

  // 해외 배송지는 PayPal(외화)만 허용 — 이니시스는 KRW 전용이라 USD 환산액이 원화로 청구되는 것을 차단(D-085).
  if (payload.shipping.country !== "KR" && payload.provider !== "paypal") {
    return { ok: false, message: "해외 배송 주문은 PayPal 결제만 가능합니다. (International orders can only be paid with PayPal.)" };
  }

  // 회원: RLS 클라이언트(본인). 게스트: service-role(있을 때만).
  const guest = !user;
  if (guest && !hasServiceRole) {
    return { ok: false, message: "현재 비회원 주문 준비 중입니다. 로그인 후 진행해주세요." };
  }
  const db = guest ? createAdminClient() : supabase;
  const profileId = user?.id ?? null;

  // 도매(사업자 전용) variant 구매 권한 — 사업자/관리자만. (D-055)
  // 관리자, 또는 '승인 완료(approved)'된 사업자만 도매 권한. 승인 대기(pending)·반려 사업자는
  // 소매만 가능 → 도매 전용(is_b2b_only) variant 구매 차단, 도매가 미적용(티어 없음 → resolve_price 가 정가 반환).
  let isBusinessBuyer = false;
  if (profileId) {
    const { data: prof } = await db.from("profiles").select("role").eq("id", profileId).maybeSingle();
    if (prof?.role === "admin") {
      isBusinessBuyer = true;
    } else if (prof?.role === "business") {
      const { data: biz } = await db.from("business_accounts").select("status").eq("profile_id", profileId).maybeSingle();
      isBusinessBuyer = biz?.status === "approved";
    }
  }

  // 오버셀 방지(D-101) — 같은 variant 가 여러 줄로 담겼을 수 있으므로 수량을 먼저 합산한다.
  const wanted = new Map<string, number>();
  for (const it of payload.items) wanted.set(it.variantId, (wanted.get(it.variantId) ?? 0) + Math.max(0, it.qty || 0));

  // 가격 서버 재계산 (resolve_price: 개별가→등급가→정가) + 무게 합산
  let subtotal = 0;
  let totalWeight = 0;
  const lines: { variant_id: string; sku: string; title: string; option: any; unit: number; source: string; qty: number }[] = [];
  for (const it of payload.items) {
    const { data: v } = await db
      .from("product_variant")
      .select("id,sku,weight_g,option_values,is_b2b_only,inventory_policy,product(title_ko)")
      .eq("id", it.variantId)
      .maybeSingle();
    if (!v) return { ok: false, message: "상품을 찾을 수 없습니다." };
    if ((v as any).is_b2b_only && !isBusinessBuyer) {
      return { ok: false, message: "사업자 전용 상품이 포함되어 있습니다. 사업자 계정으로 로그인 후 구매해 주세요." };
    }

    // 재고 검증: inventory_policy='deny' 인 variant 는 현재고 범위 안에서만 주문 생성.
    // inventory_ledger 는 관리자 전용 RLS 라 회원 세션으로 직접 못 읽는다 → SECURITY DEFINER 함수로 조회.
    // 조회 자체가 실패하면(함수 미배포·일시 오류) 로그만 남기고 통과 — 재고 조회 장애로 정상 결제를 막지 않기 위함.
    if (((v as any).inventory_policy ?? "deny") === "deny") {
      const need = wanted.get(it.variantId) ?? it.qty;
      const { data: oh, error: ohErr } = await db.rpc("variant_on_hand", { p_variant_id: it.variantId });
      if (ohErr) {
        console.error(`[stock-check-failed] variant=${it.variantId}`, ohErr.message);
      } else {
        const onHand = Number(oh ?? 0);
        if (onHand < need) {
          const label = (v as any).product?.title_ko ?? (v as any).sku;
          return {
            ok: false,
            message: onHand <= 0
              ? `'${label}' 상품이 품절되었습니다. 장바구니에서 제외한 뒤 다시 시도해 주세요.`
              : `'${label}' 상품의 재고가 부족합니다. (요청 ${need}개 · 남은 수량 ${onHand}개)`,
          };
        }
      }
    }

    const { data: rp } = await db.rpc("resolve_price", { p_variant_id: it.variantId, p_profile_id: profileId });
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

  // 배송비 (국내 무게구간+무료임계 / 해외 EMS) — KRW 기준
  const ship = await computeShipping(supabase, payload.shipping.country, totalWeight, subtotal);
  const shippingFeeKRW = ship.feeKRW;

  // 쿠폰/프로모션 코드 할인
  const disc = await resolveDiscount(db, payload.code ?? "", subtotal);

  // 합계 (KRW 기준 산출 후, 해외/페이팔이면 USD 환산)
  // USD 주문일 때만 실시간 환율 1회 조회(체크아웃당 1회, 이후 모든 환산에 동일 rate 적용).
  const fxRate = usd ? await getKrwPerUsd() : 1;
  const grandKRW = Math.max(0, subtotal - disc.amount) + tip + shippingFeeKRW;
  const grand = usd ? Math.max(1, Math.round(grandKRW / fxRate)) : grandKRW;
  const shippingFee = usd ? Math.round(shippingFeeKRW / fxRate) : shippingFeeKRW;
  const discountTotal = usd ? Math.round(disc.amount / fxRate) : disc.amount;
  // 부가세율(설정값, 기본 10%) — 국내는 부가세 포함가에서 역산, 해외 0
  let vatRate = 10;
  try {
    const { data: vr } = await supabase.from("site_setting").select("value").eq("key", "vat_rate").limit(1).maybeSingle();
    if (vr?.value && !isNaN(Number(vr.value))) vatRate = Number(vr.value);
  } catch {}
  const taxableKRW = Math.max(0, subtotal - disc.amount);
  const tax = !usd ? Math.round((taxableKRW * vatRate) / (100 + vatRate)) : 0;

  // 주문 귀속(D-112) — 요청 호스트로 결정된 스토어프론트를 명시적으로 기록한다.
  // 이 값이 비면 집계·리포트·MCP 조회에서 주문이 통째로 사라진다(2026-08-11 사고).
  // 조회 실패로 null 이 되더라도 order_item INSERT 시 DB 안전망 트리거가 보정한다.
  const { storefrontId, brandId } = await getStorefrontContext();
  if (!storefrontId) console.error(`[order-storefront-unresolved] host=${headers().get("host") ?? "?"} — storefront 미해석, DB 안전망 트리거 보정 대기`);

  // order_no
  const { data: noData } = await db.rpc("next_order_no");
  const orderNo = (noData as string) ?? `MTS${Date.now()}`;

  const { data: order, error: oErr } = await db
    .from("orders")
    .insert({
      order_no: orderNo, profile_id: profileId, customer_type: guest ? "guest" : "individual",
      storefront_id: storefrontId, brand_id: brandId,
      status: "created", email: user?.email ?? payload.email ?? null, phone: payload.shipping.phone,
      shipping_address: { ...payload.shipping, shipping_label: ship.label },
      items_subtotal: usd ? Math.round(subtotal / fxRate) : subtotal, tip_amount: tip,
      discount_total: discountTotal, coupon_code: disc.label || null,
      shipping_fee: shippingFee, tax_amount: tax, grand_total: grand, currency,
      channel: "web",
    })
    .select("id")
    .single();
  if (oErr || !order) return { ok: false, message: `주문 생성 실패: ${oErr?.message}` };

  await db.from("order_item").insert(
    lines.map((l) => ({ order_id: order.id, variant_id: l.variant_id, sku: l.sku, title_snapshot: l.title, option_snapshot: l.option, unit_price: l.unit, price_source: l.source, qty: l.qty, line_total: l.unit * l.qty })),
  );

  // 체크아웃에서 '주소록에 저장'을 선택한 경우 (D-113)
  // - 로그인 회원 + 국내 주소만: addresses 에 state/city 컬럼이 없어 해외 주소는 주·도/도시가 소실된다.
  // - 상한(MAX_ADDRESSES) 초과나 동일 주소 중복이면 조용히 건너뛴다.
  // - 여기서 실패해도 주문·결제는 그대로 진행한다(주소록은 부가 기능).
  if (payload.saveAddress && profileId && payload.shipping.country === "KR") {
    try {
      const { data: existing } = await supabase
        .from("addresses")
        .select("id,country,zipcode,addr1,addr2,recipient")
        .eq("profile_id", profileId);
      const rows = existing ?? [];
      const key = addressKey(payload.shipping);
      const dup = rows.some((r) => addressKey(r) === key);
      if (!dup && rows.length < MAX_ADDRESSES) {
        const { error: aErr } = await supabase.from("addresses").insert({
          profile_id: profileId,
          recipient: payload.shipping.recipient,
          phone: payload.shipping.phone,
          country: "KR",
          zipcode: payload.shipping.zipcode,
          addr1: payload.shipping.addr1,
          addr2: payload.shipping.addr2,
          is_default: rows.length === 0, // 첫 주소만 자동 기본 — 기존 기본을 뺏지 않는다
        });
        if (aErr) console.error("[checkout-save-address-failed]", aErr.message);
      }
    } catch (e) {
      console.error("[checkout-save-address-error]", e);
    }
  }

  // 결제를 요청한 실제 페이지의 origin — 이니시스 closeUrl 도메인 일치 요건(V023).
  // Vercel 뒤에서는 x-forwarded-host/proto, 로컬에서는 host 헤더 사용.
  const h = headers();
  const reqHost = h.get("x-forwarded-host") ?? h.get("host");
  const reqProto = h.get("x-forwarded-proto") ?? (reqHost?.startsWith("localhost") ? "http" : "https");
  const reqOrigin = reqHost ? `${reqProto}://${reqHost}` : undefined;

  const adapter = getAdapter(payload.provider);
  const init = await adapter.init({
    orderId: order.id, orderNo, amount: grand, currency, returnUrl: "/checkout/complete",
    origin: reqOrigin,
    buyerName: payload.shipping.recipient, buyerTel: payload.shipping.phone,
    buyerEmail: user?.email ?? payload.email ?? "",
    mobile: payload.mobile === true, payMethod: payload.payMethod,
  });
  await db.from("payment").insert({
    order_id: order.id, provider: payload.provider, amount: grand, currency,
    status: "ready", idempotency_key: `${orderNo}:${payload.provider}`,
    pg_tid: init.tid ?? null,
  });

  return {
    ok: true, orderNo, pgReady: init.ready, redirectUrl: init.redirectUrl ?? null, form: init.form ?? null,
    message: init.ready ? "결제창으로 이동합니다." : `주문이 생성되었습니다 (주문번호 ${orderNo}). ${init.message}`,
  };
}
