import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";

// 결제 시도 단계 로그.
//
// 목적: 만료된 주문이 '결제창 진입 전'에 멈춘 것인지 'PG 인증/승인 실패'인지
// 구분할 근거가 없었다. 이 로그가 쌓이면 관리자 분석의 "결제 실패 분해"가 채워진다.
//
// 원칙: **절대 예외를 던지지 않는다.** 분석용 부가 기록이 결제를 막으면 안 된다.
// 쓰기는 service-role 서버 경로에서만 일어나고, 읽기는 RLS(관리자)로 막혀 있다.

export type PaymentStage = "initiate" | "return" | "approve";

export interface PaymentEventInput {
  orderId?: string | null;
  paymentId?: string | null;
  provider?: string | null;
  stage: PaymentStage;
  ok: boolean;
  code?: string | null;
  message?: string | null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const asUuid = (v?: string | null) => (v && UUID_RE.test(v) ? v : null);

export async function logPaymentEvent(e: PaymentEventInput): Promise<void> {
  try {
    if (!hasServiceRole) return;
    const db = createAdminClient();
    await db.from("payment_event").insert({
      // order_id 는 uuid 컬럼이다. PG 가 엉뚱한 값을 실어 보내도 삽입이 깨지지 않도록 형식을 확인한다.
      order_id: asUuid(e.orderId),
      payment_id: asUuid(e.paymentId),
      provider: e.provider || null,
      stage: e.stage,
      ok: e.ok,
      code: e.code ? String(e.code).slice(0, 120) : null,
      message: e.message ? String(e.message).slice(0, 500) : null,
    });
  } catch (err) {
    console.warn("[payment-event] log failed:", (err as Error)?.message?.slice(0, 160));
  }
}
