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
