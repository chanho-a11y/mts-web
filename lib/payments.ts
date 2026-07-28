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
  origin?: string; // 결제를 요청한 페이지의 origin(프로토콜+호스트). 이니시스 closeUrl은 요청 페이지와 도메인 일치 필수(V023 방지)
  buyerName?: string;
  buyerTel?: string;
  buyerEmail?: string;
  mobile?: boolean;   // 모바일 기기 여부 → 이니시스는 모바일 전용 표준결제 모듈로 분기(PC 모듈은 모바일에서 차단됨)
  payMethod?: string; // 모바일 지불수단(CARD|BANK) — 모바일 규격은 결제수단을 사전 지정
}
export interface PaymentInitResult {
  ready: boolean;          // true면 결제창/리다이렉트/폼 진행 가능
  redirectUrl?: string;    // 리다이렉트형(PayPal·테스트모드)
  // 폼 제출형: PC=INIStdPay SDK 호출, 모바일=action(모바일 결제요청 URL)으로 직접 POST
  form?: { sdk: "inicis" | "inicis-mobile"; action?: string; fields: Record<string, string> };
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
const sha512hex = (s: string) => crypto.createHash("sha512").update(s, "utf8").digest("hex");

// 이니시스 모바일 표준결제(신버전 통합 결제요청 URL). 규격: manual.inicis.com/pay/stdpay_m.html
export const INICIS_MOBILE_URL = "https://mobile.inicis.com/smart/payment/";

const notConfigured = (provider: Provider): PaymentInitResult => ({
  ready: false,
  message: `${provider} 결제 연동 키가 아직 설정되지 않았습니다. (env 추가 후 활성화)`,
});

// 테스트모드: 키 없이 order→approve→paid→메일 전체 플로우 검증용 리다이렉트
const testRedirect = (provider: Provider, p: PaymentInit): PaymentInitResult => ({
  ready: true,
  message: `${provider} 테스트 모드`,
  redirectUrl: `${p.origin || SITE()}/api/payments/${provider}?oid=${p.orderId}&order=${encodeURIComponent(p.orderNo)}`,
});

// ---- 이니시스 모바일 표준결제 (신버전, KRW) ----
// STEP1 POST INICIS_MOBILE_URL (accept-charset=EUC-KR)
// STEP2 인증결과를 P_NEXT_URL 로 POST 수신 (P_STATUS·P_TID·P_REQ_URL)
// STEP3 P_REQ_URL 로 P_MID·P_TID 승인요청 → STEP4 승인결과(P_STATUS=00) 수신
// ※ P_NOTI 에 orderId 를 실어 보내면 인증·승인 결과에 그대로 반환되어 주문 식별에 쓸 수 있다.
function inicisMobileFields(p: PaymentInit, mid: string, oid: string, price: string, origin: string): Record<string, string> {
  const method = p.payMethod === "BANK" ? "BANK" : "CARD";
  const reserved = ["centerCd=Y"];
  if (method === "CARD") reserved.push("below1000=Y");
  const fields: Record<string, string> = {
    P_INI_PAYMENT: method,
    P_MID: mid,
    P_OID: oid,
    P_AMT: price,
    P_GOODS: `MTSPACE COFFEE 주문 ${oid}`,
    P_UNAME: p.buyerName || "고객",
    P_MOBILE: p.buyerTel || "",
    P_EMAIL: p.buyerEmail || "",
    P_NEXT_URL: `${origin}/api/payments/inicis`,
    P_CHARSET: "utf8",
    P_NOTI: p.orderId,
  };
  // 금액 위변조 방지 해시(amt_hash) — 모바일 HashKey(INICIS_MHASHKEY) 설정 시에만 활성화.
  // P_CHKFAKE = BASE64(SHA512(P_AMT + P_OID + P_TIMESTAMP + HashKey)) — 이니시스 해시 데모가
  // "SHA512 Hash (Hex To Base64)" 이므로 hex 문자열을 base64 인코딩한다.
  const hashKey = process.env.INICIS_MHASHKEY;
  if (hashKey) {
    const ts = Date.now().toString();
    fields.P_TIMESTAMP = ts;
    fields.P_CHKFAKE = Buffer.from(sha512hex(`${price}${oid}${ts}${hashKey}`), "utf8").toString("base64");
    reserved.push("amt_hash=Y");
  }
  fields.P_RESERVED = reserved.join("&");
  return fields;
}

// ---- 이니시스 INIStdPay (PC 표준결제, KRW) ----
export const inicis: PaymentAdapter = {
  provider: "inicis", label: "신용카드·계좌이체 (이니시스)", currency: "KRW",
  async init(p) {
    if (TEST) return testRedirect("inicis", p);
    const mid = process.env.INICIS_MID, signKey = process.env.INICIS_SIGNKEY;
    if (!mid || !signKey) return notConfigured("inicis");
    const oid = p.orderNo;
    const price = String(p.amount);
    // closeUrl·returnUrl 은 결제창을 띄운 페이지와 같은 도메인이어야 함(이니시스 V023).
    const origin = p.origin || SITE();

    // 모바일 기기: PC용 INIStdPay 모듈은 이니시스가 차단([INIStdPay/Dev.Error]) → 모바일 표준결제로 분기.
    if (p.mobile) return { ready: true, message: "inicis mobile ready", form: { sdk: "inicis-mobile", action: INICIS_MOBILE_URL, fields: inicisMobileFields(p, mid, oid, price, origin) } };

    const timestamp = Date.now().toString();
    // 표준결제 서명 규칙: signature=SHA256(oid&price&timestamp),
    //                    verification=SHA256(oid&price&signKey&timestamp), mKey=SHA256(signKey)
    const signature = sha256(`oid=${oid}&price=${price}&timestamp=${timestamp}`);
    const verification = sha256(`oid=${oid}&price=${price}&signKey=${signKey}&timestamp=${timestamp}`);
    const mKey = sha256(signKey);
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
      // closeUrl 은 결제 오버레이 iframe 안에서 열린다. 완료 페이지를 여기에 물리면
      // 오버레이 안에 갇힌 채로 렌더되므로, 오버레이만 걷어내는 전용 라우트를 쓴다.
      // 부모(체크아웃) 페이지는 그대로 살려둬야 [결제창 다시 열기]가 같은 주문을 재사용한다.
      closeUrl: `${origin}/checkout/pg-close`,
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
    const origin = p.origin || SITE();
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
