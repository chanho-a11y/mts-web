// D-163: 결제 실패 사유 분류.
//
// PG(이니시스·토스)가 돌려준 실패 메시지를 고객에게 보여줄 몇 가지 유형으로 나눈다.
// 완료 페이지 URL 에는 이 유형 코드만 싣는다. PG 원문 메시지는 URL 에 싣지 않는다
// (주소창에 임의 문구가 반사되는 것을 막기 위해서). 원문은 서버 로그와 payment_event.message 에만 남긴다.
//
// 분류가 애매하면 null 을 돌려 기존 일반 안내 문구를 쓴다. 시스템 오류(서명 불일치 등)를
// "카드 거절"로 잘못 안내하지 않기 위해, 카드사 거절로 볼 근거가 문구에 있을 때만 card 로 분류한다.

export type PaymentFailKind = "limit" | "balance" | "card" | "cancel";

export const PAYMENT_FAIL_KINDS: readonly PaymentFailKind[] = ["limit", "balance", "card", "cancel"];

export function isPaymentFailKind(v: unknown): v is PaymentFailKind {
  return typeof v === "string" && (PAYMENT_FAIL_KINDS as readonly string[]).includes(v);
}

export function classifyPaymentFail(message: unknown): PaymentFailKind | null {
  const m = String(message ?? "").replace(/\s+/g, "");
  if (!m) return null;
  if (/한도/.test(m) || /limit/i.test(m)) return "limit";
  if (/잔액|잔고/.test(m) || /insufficient|balance/i.test(m)) return "balance";
  if (/취소|중단/.test(m) || /cancel|abort/i.test(m)) return "cancel";
  if (/거절|거래불가|승인불가|사용불가|정지|분실|도난|유효기간|비밀번호|카드/.test(m) || /reject|declin|invalid_card|expired/i.test(m)) return "card";
  return null;
}
