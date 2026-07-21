// Payment provider adapters. 이니시스(INIStdPay·KRW) · 페이팔(USD).
// 실키 미설정 시: PAYMENTS_TEST_MODE=true 면 승인 라우트로 리다이렉트해 전체 플로우 검증.
//               그 외에는 notConfigured(주문만 생성, 결제 대기).
import crypto from "crypto";

export type Provider = "inicis" | "paypal";

export interface PaymentInit {
  orderId: string;
  orderNo: string;
  amount: number;
  currency: string; // KRW | USD
  returnUrl: string;
  buyerName?: string;
  buyerTel?: string;
  buyerEmail?: string;
}
export interface PaymentInitResult {
  ready: boolean;          // true면 결제창/리다이렉트/폼 진행 가능
  redirectUrl?: string;    // 리다이렉트형(PayPal·테스트모드)
  form?: { sdk: "inicis"; fields: Record<string, string> }; // SDK 폼 제출형(이니시스)
  tid?: string;            // ready 단계에서 발급된 PG 거래ID → payment.pg_tid 저장
  message: string;
}

export interface PaymentAdapter {
  provider: Provider;
  label: string;
  currency: "KRW" | "USD";
  init(p: PaymentInit): Promise<PaymentInitResult>;
}

// H-1: 프로덕션에서는 테스트 리다이렉트(키 없이 승인) 경로를 원천 차단.
const TEST = process.env.PAYMENTS_TEST_MODE === "true" && process.env.NODE_ENV !== "production";
const SITE = () => process.env.NEXT_PUBLIC_SITE_URL || "https://mtspace.coffee";
const sha256 = (s: string) => crypto.createHash("sha256").update(s, "utf8").digest("hex");

const notConfigured = (provider: Provider): PaymentInitResult => ({
  ready: false,
  message: `${provider} 결제 연동 키가 아직 설정되지 않았습니다. (env 추가 후 활성화)`,
});

// 테스트모드: 키 없이 order→approve→paid→메일 전체 플로우 검증용 리다이렉트
const testRedirect = (provider: Provider, p: PaymentInit): PaymentInitResult => ({
  ready: true,
  message: `${provider} 테스트 모드`,
  redirectUrl: `${SITE()}/api/payments/${provider}?oid=${p.orderId}&order=${encodeURIComponent(p.orderNo)}`,
});

// ---- 이니시스 INIStdPay (표준결제, KRW) ----
export const inicis: PaymentAdapter = {
  provider: "inicis", label: "신용카드·계좌이체 (이니시스)", currency: "KRW",
  async init(p) {
    if (TEST) return testRedirect("inicis", p);
    const mid = process.env.INICIS_MID, signKey = process.env.INICIS_SIGNKEY;
    if (!mid || !signKey) return notConfigured("inicis");
    const timestamp = Date.now().toString();
    const oid = p.orderNo;
    const price = String(p.amount);
    // 표준결제 서명 규칙: signature=SHA256(oid&price&timestamp),
    //                    verification=SHA256(oid&price&signKey&timestamp), mKey=SHA256(signKey)
    const signature = sha256(`oid=${oid}&price=${price}&timestamp=${timestamp}`);
    const verification = sha256(`oid=${oid}&price=${price}&signKey=${signKey}&timestamp=${timestamp}`);
    const mKey = sha256(signKey);
    const origin = SITE();
    const fields: Record<string, string> = {
      version: "1.0",
      mid,
      oid,
      price,
      timestamp,
      currency: "WON",
      goodname: `MTSPACE COFFEE 주문 ${oid}`,
      buyername: p.buyerName || "고객",
      buyertel: p.buyerTel || "",
      buyeremail: p.buyerEmail || "",
      gopaymethod: "Card:DirectBank:VBank",
      acceptmethod: "below1000",
      use_chkfake: "Y",
      signature,
      verification,
      mKey,
      returnUrl: `${origin}/api/payments/inicis?oid=${p.orderId}&order=${encodeURIComponent(oid)}`,
      closeUrl: `${origin}/checkout/complete?order=${encodeURIComponent(oid)}&paid=0`,
    };
    return { ready: true, message: "inicis ready", form: { sdk: "inicis", fields } };
  },
};

// ---- PayPal Orders v2 (REST, USD) ----
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
    if (TEST) return testRedirect("paypal", p);
    const token = await paypalToken();
    if (!token) return notConfigured("paypal");
    const origin = SITE();
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

export const ADAPTERS: Record<Provider, PaymentAdapter> = { inicis, paypal };
export function getAdapter(p: Provider): PaymentAdapter { return ADAPTERS[p]; }
