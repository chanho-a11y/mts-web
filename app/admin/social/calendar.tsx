import Link from "next/link";
import { byPublishTime, kstParts, monthGrid, publishTime, shiftMonth, currentKstMonth } from "@/lib/social/order";

/**
 * 인스타그램 발행 캘린더 (D-140).
 *
 * 목록의 상태 필터와 무관하게 그 달의 전체 게시물을 발행일 칸에 놓는다.
 * 초안은 누르면 수정 화면으로, 그 밖의 상태는 목록의 해당 건으로 간다.
 */

export interface CalItem {
  id: string;
  slug: string;
  status: string;
  kind: string;
  suggested_time: string | null;
  scheduled_at: string | null;
  published_at: string | null;
  created_at: string | null;
}

const CHIP: Record<string, string> = {
  draft: "border-neutral-300 bg-neutral-100 text-neutral-700",
  scheduled: "border-blue-200 bg-blue-50 text-blue-700",
  published: "border-green-200 bg-green-50 text-green-700",
  rejected: "border-amber-200 bg-amber-50 text-amber-700",
  failed: "border-red-200 bg-red-50 text-red-700",
};

const WEEK = ["일", "월", "화", "수", "목", "금", "토"];

/** ig-20261012-cafe-bean-switch → cafe-bean-switch */
function shortSlug(slug: string): string {
  return slug.replace(/^ig-\d{8}-/, "");
}

export function SocialCalendar({
  items,
  month,
  filter,
  statusLabel,
}: {
  items: CalItem[];
  month: string;
  filter: string;
  statusLabel: Record<string, string>;
}) {
  const byDay = new Map<string, { item: CalItem; time: string }[]>();
  let undated = 0;
  for (const item of [...items].sort(byPublishTime)) {
    const t = publishTime(item);
    if (!t) {
      undated++;
      continue;
    }
    const { date, time } = kstParts(t);
    if (!date.startsWith(month)) continue;
    const list = byDay.get(date) ?? [];
    list.push({ item, time });
    byDay.set(date, list);
  }

  const monthCounts: Record<string, number> = {};
  let monthTotal = 0;
  for (const list of byDay.values()) {
    for (const { item } of list) {
      monthCounts[item.status] = (monthCounts[item.status] ?? 0) + 1;
      monthTotal++;
    }
  }

  const today = kstParts(new Date().toISOString()).date;
  const thisMonth = currentKstMonth();
  const [y, m] = month.split("-").map(Number);
  const qs = (ym: string) => `/admin/social?month=${ym}${filter ? `&status=${filter}` : ""}#calendar`;
  const cells = monthGrid(month);

  return (
    <section id="calendar" className="mt-4 scroll-mt-4 rounded border bg-white p-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-semibold">
          발행 캘린더 {y}년 {m}월
        </h2>
        <span className="text-xs text-neutral-500">
          {monthTotal > 0
            ? `총 ${monthTotal}건 (${Object.keys(statusLabel)
                .filter((s) => monthCounts[s])
                .map((s) => `${statusLabel[s]} ${monthCounts[s]}`)
                .join(", ")})`
            : "이 달에 잡힌 게시물이 없습니다"}
        </span>
        <div className="ml-auto flex items-center gap-1 text-xs">
          <Link href={qs(shiftMonth(month, -1))} aria-label="이전 달" className="rounded border px-2 py-1 hover:bg-neutral-100">
            ←
          </Link>
          {month !== thisMonth && (
            <Link href={qs(thisMonth)} className="rounded border px-2 py-1 hover:bg-neutral-100">
              이번 달
            </Link>
          )}
          <Link href={qs(shiftMonth(month, 1))} aria-label="다음 달" className="rounded border px-2 py-1 hover:bg-neutral-100">
            →
          </Link>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-1 text-[11px]">
        {Object.keys(statusLabel).map((s) => (
          <span key={s} className={`rounded border px-1.5 py-0.5 ${CHIP[s] ?? CHIP.draft}`}>
            {statusLabel[s]}
          </span>
        ))}
        <span className="px-1 py-0.5 text-neutral-400">시각은 KST. 초안은 권장 시각, 예약은 예약 시각, 발행됨은 실제 발행 시각 기준입니다.</span>
      </div>

      <div className="mt-2 overflow-x-auto">
        <div className="grid min-w-[700px] grid-cols-7 gap-px overflow-hidden rounded border bg-neutral-200 text-xs">
          {WEEK.map((w, i) => (
            <div key={w} className={`bg-neutral-50 px-2 py-1 text-center font-medium ${i === 0 ? "text-red-600" : i === 6 ? "text-blue-600" : "text-neutral-600"}`}>
              {w}
            </div>
          ))}
          {cells.map((date, i) => {
            if (!date) return <div key={`blank-${i}`} className="min-h-[84px] bg-neutral-50" />;
            const list = byDay.get(date) ?? [];
            const isToday = date === today;
            const past = date < today;
            return (
              <div key={date} className={`min-h-[84px] p-1 ${isToday ? "bg-amber-50" : "bg-white"}`}>
                <div className={`mb-1 text-[11px] ${isToday ? "font-bold text-neutral-900" : past ? "text-neutral-300" : "text-neutral-500"}`}>
                  {Number(date.slice(8))}
                  {isToday && <span className="ml-1 font-medium">오늘</span>}
                </div>
                <div className="space-y-1">
                  {list.map(({ item, time }) => (
                    <Link
                      key={item.id}
                      href={
                        item.status === "draft"
                          ? `/admin/social/${item.id}/edit`
                          : `/admin/social?slug=${encodeURIComponent(item.slug)}&month=${month}`
                      }
                      title={`${statusLabel[item.status] ?? item.status} / ${time} / ${item.kind === "carousel" ? "카드뉴스" : "단일 이미지"} / ${item.slug}`}
                      className={`block truncate rounded border px-1 py-0.5 text-[11px] leading-tight hover:brightness-95 ${CHIP[item.status] ?? CHIP.draft}`}
                    >
                      <span className="font-mono">{time}</span> {item.kind === "carousel" ? "카드" : "단일"} {shortSlug(item.slug)}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {undated > 0 && <p className="mt-2 text-xs text-neutral-500">발행일이 정해지지 않아 캘린더에 없는 건이 {undated}건 있습니다. 목록 맨 아래에 나옵니다.</p>}
    </section>
  );
}
