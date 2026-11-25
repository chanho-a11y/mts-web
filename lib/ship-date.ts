// D-174: 주문확인 메일의 예상 출고일과 고객 메일 언어 판정.
// 출고일 규칙(대표 지시 2026-11-25): 결제완료 시각(한국 시간) 기준
//   월 주문은 화 출고, 화 주문은 수 출고, 수, 목, 금, 토, 일 주문은 다음 화 출고.
// 공휴일과 물량 변동은 반영하지 않는다(메일에 "예상"으로 표기).

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

// 요일(0=일 ... 6=토)별로 더할 일수
const ADD_DAYS: Record<number, number> = { 0: 2, 1: 1, 2: 1, 3: 6, 4: 5, 5: 4, 6: 3 };

export interface ShipDate {
  /** 한국 시간 기준 날짜 YYYY-MM-DD */
  ymd: string;
  ko: string; // 예: 12월 1일
  en: string; // 예: December 1, 2026
}

export function expectedShipDate(paidAt: Date | string = new Date()): ShipDate {
  const base = typeof paidAt === "string" ? new Date(paidAt) : paidAt;
  const t = Number.isFinite(base.getTime()) ? base : new Date();
  // KST 로 옮긴 뒤 UTC 메서드로 읽으면 한국 날짜와 요일이 나온다.
  const kst = new Date(t.getTime() + KST_OFFSET_MS);
  const ship = new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate() + ADD_DAYS[kst.getUTCDay()]));
  const y = ship.getUTCFullYear();
  const m = ship.getUTCMonth() + 1;
  const d = ship.getUTCDate();
  const ymd = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const en = ship.toLocaleDateString("en-US", { timeZone: "UTC", year: "numeric", month: "long", day: "numeric" });
  return { ymd, ko: `${m}월 ${d}일`, en };
}

/**
 * 고객 메일 언어. 해외 배송지이거나 영어 사이트(en)에서 주문했으면 영어, 그 외 한국어.
 * 주문 언어는 주문 생성 시 shipping_address.lang 에 기록한다(D-174 이전 주문은 값이 없어 국내 주문은 한국어).
 */
export function orderEmailLang(shippingAddress: unknown): "ko" | "en" {
  const sa = (shippingAddress ?? {}) as { country?: string | null; lang?: string | null };
  if (sa.country && sa.country !== "KR") return "en";
  return sa.lang === "en" ? "en" : "ko";
}

export function isIntlShipping(shippingAddress: unknown): boolean {
  const c = ((shippingAddress ?? {}) as { country?: string | null }).country;
  return !!c && c !== "KR";
}
