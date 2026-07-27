// 매출·이익 집계 헬퍼 (KST 기준). 대시보드/분석 공용.

export const PAID_STATUSES = ["paid", "preparing", "shipped", "in_transit", "delivered", "confirmed"];

type OrderRow = { status: string; grand_total: number; currency: string; placed_at: string | null };

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
  const paid = orders.filter((o) => o.currency === "KRW" && PAID_STATUSES.includes(o.status) && o.placed_at);
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
