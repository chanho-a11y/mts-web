import { createClient } from "@/lib/supabase/server";
import OrdersTable from "@/components/orders-table";

export const dynamic = "force-dynamic";

const MAX_DAYS = 62;
const DAY = 86400000;

// YYYY-MM-DD (KST 기준 오늘)
function kstToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
function isValidDate(s?: string): s is string {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(new Date(s + "T00:00:00+09:00").getTime());
}

// from/to(YYYY-MM-DD)를 정규화 — 유효성·순서 보정 + 최대 62일 클램프
function resolveRange(fromRaw?: string, toRaw?: string): { from: string; to: string } {
  const today = kstToday();
  let to = isValidDate(toRaw) ? toRaw : today;
  let from = isValidDate(fromRaw) ? fromRaw : new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(Date.now() - 29 * DAY));
  if (from > to) [from, to] = [to, from];
  // 최대 62일: from이 너무 과거면 to-61일로 당김(양끝 포함 62일)
  const span = Math.round((new Date(to + "T00:00:00+09:00").getTime() - new Date(from + "T00:00:00+09:00").getTime()) / DAY);
  if (span > MAX_DAYS - 1) {
    from = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" })
      .format(new Date(new Date(to + "T00:00:00+09:00").getTime() - (MAX_DAYS - 1) * DAY));
  }
  return { from, to };
}

export default async function AdminOrdersPage({ searchParams }: { searchParams: { from?: string; to?: string } }) {
  const { from, to } = resolveRange(searchParams.from, searchParams.to);
  const fromIso = `${from}T00:00:00+09:00`;
  const toIso = `${to}T23:59:59.999+09:00`;

  const supabase = createClient();
  const { data: orders } = await supabase
    .from("orders")
    .select("id,order_no,email,phone,status,grand_total,currency,customer_type,placed_at")
    .gte("placed_at", fromIso)
    .lte("placed_at", toIso)
    .order("placed_at", { ascending: false })
    .limit(2000);

  const exportHref = `/admin/orders/export?from=${from}&to=${to}`;

  return (
    <main>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">주문 관리</h1>
        <a href={exportHref} className="rounded-full bg-ink px-4 py-2 text-sm text-oat hover:opacity-90" download>
          주문 Export (CSV)
        </a>
      </div>

      {/* 기간 조회 (최대 62일) */}
      <form method="get" className="mb-4 flex flex-wrap items-end gap-3 rounded-card border border-line bg-paper p-4">
        <label className="text-sm">시작일
          <input type="date" name="from" defaultValue={from} className="mt-1 block rounded border px-3 py-1.5 text-sm" />
        </label>
        <label className="text-sm">종료일
          <input type="date" name="to" defaultValue={to} className="mt-1 block rounded border px-3 py-1.5 text-sm" />
        </label>
        <button className="rounded-full bg-black px-4 py-2 text-sm text-white">조회</button>
        <span className="text-xs text-neutral-400">최대 {MAX_DAYS}일까지 조회 가능. 선택 기간의 주문만 표시·Export됩니다.</span>
      </form>

      <p className="mb-3 text-sm text-neutral-500">{from} ~ {to} · {orders?.length ?? 0}건</p>
      <OrdersTable orders={orders ?? []} />
      <p className="mt-4 text-xs text-neutral-400">출고 처리 시 재고 차감·송장 생성·고객 출고 알림 이메일이 발송됩니다(이메일 프로바이더 env 설정 시).</p>
    </main>
  );
}
