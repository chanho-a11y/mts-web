// Payment provider adapters. Structure ready; real PG keys added later (env).
// 이니시스(KRW) · 카카오페이(KRW) · 페이팔(USD, 해외/원두).
export type Provider = "inicis" | "kakaopay" | "paypal";

export interface PaymentInit {
  orderId: string;
  orderNo: string;
  amount: number;
  currency: string; // KRW | USD
  returnUrl: string;
}
export interface PaymentInitResult {
  ready: boolean;          // true면 결제창/리다이렉트 진행 가능
  redirectUrl?: string;
  message: string;
}

export interface PaymentAdapter {
  provider: Provider;
  label: string;
  currency: "KRW" | "USD";
  init(p: PaymentInit): Promise<PaymentInitResult>;
}

const notConfigured = (provider: Provider): PaymentInitResult => ({
  ready: false,
  message: `${provider} 결제 연동 키가 아직 설정되지 않았습니다. (env 추가 후 활성화)`,
});

export const inicis: PaymentAdapter = {
  provider: "inicis", label: "신용카드·계좌이체 (이니시스)", currency: "KRW",
  async init(p) {
    if (!process.env.INICIS_MID || !process.env.INICIS_SIGNKEY) return notConfigured("inicis");
    // TODO: INIStdPay 서명·결제창 파라미터 생성 → redirectUrl
    return { ready: true, message: "inicis ready", redirectUrl: undefined };
  },
};
export const kakaopay: PaymentAdapter = {
  provider: "kakaopay", label: "카카오페이", currency: "KRW",
  async init(p) {
    if (!process.env.KAKAOPAY_CID || !process.env.KAKAOPAY_SECRET) return notConfigured("kakaopay");
    // TODO: kakaopay ready → next_redirect_pc_url
    return { ready: true, message: "kakaopay ready" };
  },
};
// ---- PayPal Orders v2 (REST) ----
export function paypalBase() {
  return process.env.PAYPAL_ENV === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}
export async function paypalToken(): Promise<string | null> {
  const id = process.env.PAYPAL_CLIENT_ID, sec = process.env.PAYPAL_SECRET;
  if (!id || !sec) return null;
  const res = await fetch(`${paypalBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${Buffer.from(`${id}:${sec}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) return null;
  return (await res.json()).access_token ?? null;
}
export async function paypalCapture(token: string, ppOrderId: string): Promise<{ ok: boolean; captureId?: string; raw?: unknown }> {
  const res = await fetch(`${paypalBase()}/v2/checkout/orders/${ppOrderId}/capture`, {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  const raw = await res.json().catch(() => null);
  const ok = res.ok && (raw?.status === "COMPLETED");
  const captureId = raw?.purchase_units?.[0]?.payments?.captures?.[0]?.id;
  return { ok, captureId, raw };
}

export const paypal: PaymentAdapter = {
  provider: "paypal", label: "PayPal (해외·USD)", currency: "USD",
  async init(p) {
    const token = await paypalToken();
    if (!token) return notConfigured("paypal");
    const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://mtspace.coffee";
    const res = await fetch(`${paypalBase()}/v2/checkout/orders`, {
      method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [{ reference_id: p.orderNo, amount: { currency_code: "USD", value: `${p.amount}.00` } }],
        application_context: {
          return_url: `${origin}/api/payments/paypal?order=${encodeURIComponent(p.orderNo)}&oid=${p.orderId}`,
          cancel_url: `${origin}/checkout/complete?order=${encodeURIComponent(p.orderNo)}&paid=0`,
        },
      }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.id) return { ready: false, message: "paypal create 실패" };
    const approve = (data.links ?? []).find((l: { rel: string; href: string }) => l.rel === "approve")?.href;
    return { ready: true, message: "paypal ready", redirectUrl: approve };
  },
};

export const ADAPTERS: Record<Provider, PaymentAdapter> = { inicis, kakaopay, paypal };
export function getAdapter(p: Provider): PaymentAdapter { return ADAPTERS[p]; }
