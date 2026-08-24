// 매출·이익 집계 헬퍼 (KST 기준). 대시보드/분석 공용.

// ─────────────────────────────────────────────────────────────
// 주문 상태 집합 — 용도별로 분리한다.
//
// 과거에는 PAID_STATUSES 하나를 매출 집계와 "베스트셀러 판매수량 정렬"이
// 함께 썼다. 정렬은 고객이 보는 홈 화면에 노출되므로, 매출 정의를 손대면
// 스토어프론트가 같이 흔들린다. 그래서 이름을 나눠 의도를 고정한다.
//
// 구 PAID_STATUSES 는 enum(order_status)에 존재하지 않는 'confirmed' 를 담고
// 있었고(죽은 값), 실재하는 'partial_refunded' 는 빠져 있었다. 아래 값은
// DB 정본 함수 public.mcp_revenue_statuses() 와 일치한다 — 한쪽만 고치면
// 관리자 화면과 MCP/oleander 리포트의 매출이 갈라지므로 반드시 함께 바꿀 것.
// ─────────────────────────────────────────────────────────────

/** 매출·이익 집계 기준. 정본: public.mcp_revenue_statuses() */
export const REVENUE_STATUSES = [
  "paid", "preparing", "shipped", "in_transit", "delivered", "partial_refunded",
];

/**
 * 판매 수량 집계 기준(베스트셀러 정렬 등 고객 노출용).
 * 현재 값은 REVENUE_STATUSES 와 같으나, "매출로 인정"과 "판매된 것으로 인정"은
 * 앞으로 갈라질 수 있는 별개 개념이라 상수를 따로 둔다.
 */
export const SOLD_STATUSES = [
  "paid", "preparing", "shipped", "in_transit", "delivered", "partial_refunded",
];

/** 결제까지 도달하지 못한 상태 — 결제 전환율 계산에 쓴다. */
export const UNPAID_STATUSES = ["created", "expired"];

/** 집계에서 제외하는 내부 주문 구분 — 대표/관리자 테스트 주문. */
export const INTERNAL_CUSTOMER_TYPES = ["admin"];

type OrderRow = {
  status: string; grand_total: number; currency: string; placed_at: string | null;
  customer_type?: string | null;
};

/** 내부(관리자) 테스트 주문인가 — 집계에서 뺀다. customer_type 미기록 주문은 외부로 본다. */
export function isInternalOrder(o: { customer_type?: string | null }): boolean {
  return !!o.customer_type && INTERNAL_CUSTOMER_TYPES.includes(o.customer_type);
}

/** 주문 고객 구분 표기 — 관리자/마이페이지/CSV 공용. 한 곳에서만 정의한다. */
export const CUSTOMER_TYPE_LABEL: Record<string, string> = {
  guest: "비회원",
  individual: "일반",
  business: "기업",
  influencer: "인플루언서",
  admin: "관리자",
};

export function customerTypeLabel(v?: string | null): string {
  return (v && CUSTOMER_TYPE_LABEL[v]) || "일반";
}

// KST(Asia/Seoul) 기준 오늘 0시를 UTC Date 로 반환하기 위한 오프셋 계산
function kstParts(d: Date) {
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, weekday: "short",
  }).formatToParts(d);
  const g = (t: string) => f.find((p) => p.type === t)?.value ?? "";
  return {
    y: +g("year"), m: +g("month"), day: +g("day"),
    weekday: g("weekday"), // Mon, Tue…
  };
}

// KST 시작 경계들을 UTC epoch(ms)로 반환
export function kstPeriodBounds(now = new Date()) {
  const p = kstParts(now);
  // KST 자정 = 해당 날짜의 00:00 KST = UTC 전날 15:00. Date.UTC(y,m-1,day,-9)로 표현.
  const startOfDayUTC = Date.UTC(p.y, p.m - 1, p.day, -9, 0, 0);
  const wdIndex = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(p.weekday);
  const daysSinceMon = wdIndex < 0 ? 0 : wdIndex;
  const startOfWeekUTC = startOfDayUTC - daysSinceMon * 86400000;
  const startOfMonthUTC = Date.UTC(p.y, p.m - 1, 1, -9, 0, 0);
  const startOfYearUTC = Date.UTC(p.y, 0, 1, -9, 0, 0);
  return { startOfDayUTC, startOfWeekUTC, startOfMonthUTC, startOfYearUTC };
}

export function periodRevenue(orders: OrderRow[], now = new Date()) {
  const b = kstPeriodBounds(now);
  const paid = orders.filter(
    (o) => o.currency === "KRW" && REVENUE_STATUSES.includes(o.status) && o.placed_at && !isInternalOrder(o),
  );
  const sumFrom = (fromMs: number) =>
    paid.reduce((s, o) => (new Date(o.placed_at as string).getTime() >= fromMs ? s + (o.grand_total || 0) : s), 0);
  return {
    today: sumFrom(b.startOfDayUTC),
    week: sumFrom(b.startOfWeekUTC),
    month: sumFrom(b.startOfMonthUTC),
    year: sumFrom(b.startOfYearUTC),
  };
}

// ─────────────────────────────────────────────────────────────
// 기간 선택 (분석 페이지) — 프리셋 + 직접입력(from/to), 모두 KST 기준.
// ─────────────────────────────────────────────────────────────

export type PeriodPreset = "all" | "today" | "week" | "month" | "year" | "d7" | "d30" | "custom";

export const PERIOD_PRESETS: { key: PeriodPreset; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "today", label: "오늘" },
  { key: "week", label: "이번주" },
  { key: "month", label: "이번달" },
  { key: "year", label: "올해" },
  { key: "d7", label: "최근 7일" },
  { key: "d30", label: "최근 30일" },
];

const DAY_MS = 86400000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// UTC epoch(ms) → KST 기준 "YYYY-MM-DD"
export function kstDateStr(ms: number) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date(ms));
}

// "YYYY-MM-DD"(KST) → 그날 00:00 KST 의 UTC epoch(ms)
function kstDayStartMs(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return Date.UTC(y, m - 1, d, -9, 0, 0);
}

export type ResolvedPeriod = {
  preset: PeriodPreset;
  fromMs: number | null;   // 시작(포함). null = 제한 없음
  toMs: number | null;     // 종료(미포함). null = 현재까지
  fromInput: string;       // <input type="date"> 프리필
  toInput: string;
  label: string;           // 화면 표기용
};

// searchParams(preset·from·to) → 실제 기간 경계. 잘못된 값은 안전하게 "전체"로 폴백.
export function resolvePeriod(
  sp: { preset?: string; from?: string; to?: string } = {},
  now = new Date(),
): ResolvedPeriod {
  const b = kstPeriodBounds(now);
  const nowMs = now.getTime();
  const from = (sp.from ?? "").trim();
  const to = (sp.to ?? "").trim();
  const hasCustom = DATE_RE.test(from) || DATE_RE.test(to);

  const known: PeriodPreset[] = ["all", "today", "week", "month", "year", "d7", "d30", "custom"];
  let preset = (sp.preset ?? "").trim() as PeriodPreset;
  if (!known.includes(preset)) preset = hasCustom ? "custom" : "all";
  if (preset === "custom" && !hasCustom) preset = "all";

  let fromMs: number | null = null;
  let toMs: number | null = null;
  switch (preset) {
    case "today": fromMs = b.startOfDayUTC; break;
    case "week": fromMs = b.startOfWeekUTC; break;
    case "month": fromMs = b.startOfMonthUTC; break;
    case "year": fromMs = b.startOfYearUTC; break;
    case "d7": fromMs = b.startOfDayUTC - 6 * DAY_MS; break;
    case "d30": fromMs = b.startOfDayUTC - 29 * DAY_MS; break;
    case "custom": {
      let a = DATE_RE.test(from) ? kstDayStartMs(from) : null;
      let z = DATE_RE.test(to) ? kstDayStartMs(to) + DAY_MS : null; // 종료일 포함
      if (a !== null && z !== null && a >= z) { const t = a; a = z - DAY_MS; z = t + DAY_MS; } // 뒤집힘 보정
      fromMs = a; toMs = z;
      break;
    }
    default: break; // all
  }

  const fromInput = fromMs !== null ? kstDateStr(fromMs) : "";
  const toInput = toMs !== null ? kstDateStr(toMs - DAY_MS) : (preset === "all" ? "" : kstDateStr(nowMs));
  const label = preset === "all"
    ? "전체 기간"
    : `${fromInput || "처음"} ~ ${toInput || kstDateStr(nowMs)} (KST)`;

  return { preset, fromMs, toMs, fromInput, toInput, label };
}
