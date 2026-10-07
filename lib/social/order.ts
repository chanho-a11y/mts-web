/**
 * 인스타그램 게시물의 발행일 기준 정렬과 KST 날짜 계산 (D-140).
 *
 * 발행일은 상태에 따라 고른다. 발행된 건은 실제 발행 시각, 그 밖에는 예약 시각이 있으면 예약 시각,
 * 없으면 권장 시각이다. 목록, 수정 화면의 이전과 다음 이동, 캘린더가 모두 이 기준 하나를 쓴다.
 */
export interface PublishTimed {
  id: string;
  status: string;
  suggested_time: string | null;
  scheduled_at?: string | null;
  published_at?: string | null;
  created_at?: string | null;
}

export function publishTime(r: PublishTimed): string | null {
  if (r.status === "published") return r.published_at ?? r.scheduled_at ?? r.suggested_time ?? null;
  return r.scheduled_at ?? r.suggested_time ?? null;
}

/** 발행일 빠른 순. 발행일이 없는 건은 맨 뒤. 같은 시각이면 등록 순, 그다음 id 순으로 고정한다. */
export function byPublishTime(a: PublishTimed, b: PublishTimed): number {
  const ta = publishTime(a);
  const tb = publishTime(b);
  if (ta && tb) {
    const d = Date.parse(ta) - Date.parse(tb);
    if (d) return d;
  } else if (ta) {
    return -1;
  } else if (tb) {
    return 1;
  }
  const c = (a.created_at ?? "").localeCompare(b.created_at ?? "");
  return c || a.id.localeCompare(b.id);
}

/** ISO 시각을 KST 의 날짜(YYYY-MM-DD)와 시각(HH:mm)으로 나눈다. */
export function kstParts(iso: string): { date: string; time: string } {
  const s = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(new Date(iso));
  const [date, time] = s.split(" ");
  return { date, time: time === "24:00" ? "00:00" : time };
}

/** 지금의 KST 연월(YYYY-MM) */
export function currentKstMonth(): string {
  return kstParts(new Date().toISOString()).date.slice(0, 7);
}

/** ?month= 값을 검증한다. 형식이 틀리면 이번 달. */
export function normalizeMonth(raw: string | undefined): string {
  return raw && /^\d{4}-(0[1-9]|1[0-2])$/.test(raw) ? raw : currentKstMonth();
}

/** YYYY-MM 을 delta 개월 옮긴다. */
export function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** 달력 격자. 일요일 시작. 앞쪽 빈 칸은 null. */
export function monthGrid(ym: string): (string | null)[] {
  const [y, m] = ym.split("-").map(Number);
  const lead = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells: (string | null)[] = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= days; d++) cells.push(`${ym}-${String(d).padStart(2, "0")}`);
  while (cells.length % 7) cells.push(null);
  return cells;
}
