// Payment provider adapters. 이니시스(INIStdPay·KRW) · 토스페이먼츠(결제창 SDK v2, KRW, D-161) · 페이팔(USD).
// 실키 미설정 시: PAYMENTS_TEST_MODE=true 면 승인 라우트로 리다이렉트해 전체 플로우 검증.
//               그 외에는 notConfigured(주문만 생성, 결제 대기).
import crypto from "crypto";

export type Provider = "inicis" | "toss" | "paypal";

// 클라이언트가 결제창을 여는 데 쓰는 폼. PC 이니시스=INIStdPay SDK, 모바일 이니시스=결제요청 URL 로 직접 POST, 토스=SDK requestPayment.
export type PgForm = { sdk: "inicis" | "inicis-mobile" | "toss"; action?: string; fields: Record<string, string> };

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
  payMethod?: string; // 이니시스 모바일 지불수단(CARD|BANK), 토스 결제수단(TOSSPAY|CARD)
}
export interface PaymentInitResult {
  ready: boolean;          // true면 결제창/리다이렉트/폼 진행 가능
  redirectUrl?: string;    // 리다이렉트형(PayPal·테스트모드)
  // 폼 제출형: PC=INIStdPay SDK 호출, 모바일=action(모바일 결제요청 URL)으로 직접 POST
  form?: PgForm;
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
  // P_CHKFAKE = BASE64(SHA512(P_AMT + P_OID + P_TIMESTAMP + HashKey)), P_TIMESTAMP = 밀리초(manual.inicis.com/pay/stdpay_m.html).
  const hashKey = process.env.INICIS_MHASHKEY;
  if (hashKey) {
    const ts = Date.now().toString();
    fields.P_TIMESTAMP = ts;
    // D-160: 2026-11-09 실결제 테스트에서 hex 문자열을 base64 한 값은 인증 단계 P_STATUS=01 로 거절됐다.
    // 매뉴얼 BASE64_ENCODE(SHA512(Data)) 의 표준 해석인 "원본 다이제스트 바이트를 base64" 로 계산한다.
    fields.P_CHKFAKE = crypto.createHash("sha512").update(`${price}${oid}${ts}${hashKey}`, "utf8").digest("base64");
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
      // centerCd(Y): 인증결과에 idc_name 수신 → 승인 URL 화이트리스트 판정(D-143, lib/inicis-idc.ts). 옵션 구분자는 ":".
      acceptmethod: "below1000:centerCd(Y)",
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

// ---- 토스페이먼츠 결제창 (SDK v2 payment().requestPayment, KRW) ----
// D-161. 키는 반드시 'API 개별 연동 키'(test_ck / live_ck, test_sk / live_sk). 결제위젯 키(gck / gsk)는 이 방식에서 쓸 수 없다.
// 흐름: SDK requestPayment → successUrl(GET ?paymentKey&orderId&amount) → 서버가 금액 대조 후 /v1/payments/confirm.
//       실패는 failUrl(GET ?code&message&orderId). PC 에서 고객이 창을 닫으면 Promise 가 USER_CANCEL 로 끝나 체크아웃에 머문다.
export const TOSS_API = "https://api.tosspayments.com";
// 토스 노출 2단 스위치(D-161).
//  1) 키 두 개(TOSS_CLIENT_KEY, TOSS_SECRET_KEY)가 다 있어야 결제 자체가 가능하다.
//  2) 고객 공개는 TOSS_PUBLIC=true 일 때만. 그 전에는 관리자 계정에게만 보여서 대표가 운영 사이트에서 실결제 검증을 할 수 있다.
// 테스트 모드(로컬)는 항상 켠다. 서버(createOrderAction)도 같은 판정으로 거절하므로 화면 조작으로 우회할 수 없다.
export function tossEnabled(): boolean {
  return TEST || (!!process.env.TOSS_CLIENT_KEY && !!process.env.TOSS_SECRET_KEY);
}
export function tossVisibleTo(isAdmin: boolean): boolean {
  if (!tossEnabled()) return false;
  return TEST || process.env.TOSS_PUBLIC === "true" || isAdmin;
}
export function tossAuthHeader(): string | null {
  const sk = process.env.TOSS_SECRET_KEY;
  if (!sk) return null;
  return `Basic ${Buffer.from(`${sk}:`).toString("base64")}`;
}
export interface TossConfirmResult { ok: boolean; code?: string; message?: string; raw?: unknown; totalAmount?: number | null; orderId?: string | null; paymentKey?: string | null }
// 결제 승인. Idempotency-Key = paymentKey 로 같은 결제의 중복 승인 요청(새로고침, 중복 콜백)을 한 번으로 묶는다.
export async function tossConfirm(paymentKey: string, orderId: string, amount: number): Promise<TossConfirmResult> {
  const auth = tossAuthHeader();
  if (!auth) return { ok: false, code: "unconfigured", message: "TOSS_SECRET_KEY 미설정" };
  let res: Response;
  try {
    res = await fetch(`${TOSS_API}/v1/payments/confirm`, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json", "Idempotency-Key": paymentKey.slice(0, 300) },
      body: JSON.stringify({ paymentKey, orderId, amount }),
    });
  } catch (e) {
    return { ok: false, code: "network", message: (e as Error).message };
  }
  const raw = (await res.json().catch(() => null)) as { status?: string; totalAmount?: number; orderId?: string; paymentKey?: string; code?: string; message?: string } | null;
  const ok = res.ok && raw?.status === "DONE";
  return {
    ok, raw,
    code: ok ? undefined : String(raw?.code ?? res.status),
    message: raw?.message,
    totalAmount: raw?.totalAmount != null ? Math.round(Number(raw.totalAmount)) : null,
    orderId: raw?.orderId ?? null,
    paymentKey: raw?.paymentKey ?? null,
  };
}

export const toss: PaymentAdapter = {
  provider: "toss", label: "토스페이·신용카드 (토스페이먼츠)", currency: "KRW",
  async init(p) {
    if (TEST) return testRedirect("toss", p);
    const clientKey = process.env.TOSS_CLIENT_KEY, secretKey = process.env.TOSS_SECRET_KEY;
    if (!clientKey || !secretKey) return notConfigured("toss");
    if (/^(test|live)_gck/.test(clientKey) || /^(test|live)_gsk/.test(secretKey)) {
      return { ready: false, message: "토스 결제위젯 키가 들어 있습니다. 개발자센터의 'API 개별 연동 키'(ck / sk)로 바꿔 주세요." };
    }
    const origin = p.origin || SITE();
    const q = `oid=${p.orderId}&order=${encodeURIComponent(p.orderNo)}`;
    const phone = (p.buyerTel || "").replace(/\D/g, "");
    const fields: Record<string, string> = {
      clientKey,
      // customerKey: 비회원 결제와 같은 취급이라 주문마다 무작위 값(36자, 영숫자와 '-'). 개인정보나 순번은 넣지 않는다.
      customerKey: crypto.randomUUID(),
      method: "CARD",
      easyPay: p.payMethod === "TOSSPAY" ? "TOSSPAY" : "",
      amount: String(p.amount),
      orderId: p.orderNo,
      orderName: `MTSPACE COFFEE 주문 ${p.orderNo}`.slice(0, 100),
      customerName: (p.buyerName || "고객").slice(0, 100),
      customerEmail: (p.buyerEmail || "").slice(0, 100),
      customerMobilePhone: phone.length >= 8 && phone.length <= 15 ? phone : "",
      successUrl: `${origin}/api/payments/toss?${q}`,
      failUrl: `${origin}/api/payments/toss?${q}&fail=1`,
    };
    return { ready: true, message: "toss ready", form: { sdk: "toss", fields } };
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

export const ADAPTERS: Record<Provider, PaymentAdapter> = { inicis, toss, paypal };
export function getAdapter(p: Provider): PaymentAdapter { return ADAPTERS[p]; }
