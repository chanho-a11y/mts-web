import { createClient } from "@/lib/supabase/server";
import OrdersTable from "@/components/orders-table";

export const dynamic = "force-dynamic";

const MAX_DAYS = 62;
const DAY = 86400000;

// YYYY-MM-DD (KST 기준 오늘)
function kstToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
// YYYY-MM-DD (KST 기준 n일 전)
function kstDaysAgo(n: number): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(Date.now() - n * DAY));
}
function isValidDate(s?: string): s is string {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(new Date(s + "T00:00:00+09:00").getTime());
}

// from/to(YYYY-MM-DD)를 정규화 — 유효성·순서 보정 + 최대 62일 클램프
function resolveRange(fromRaw?: string, toRaw?: string): { from: string; to: string } {
  const today = kstToday();
  let to = isValidDate(toRaw) ? toRaw : today;
  // 기본값: 별도 지정이 없으면 '오늘'만 조회 (from=to=오늘).
  let from = isValidDate(fromRaw) ? fromRaw : today;
  if (from > to) [from, to] = [to, from];
  // 최대 62일: from이 너무 과거면 to-61일로 당김(양끝 포함 62일)
  const span = Math.round((new Date(to + "T00:00:00+09:00").getTime() - new Date(from + "T00:00:00+09:00").getTime()) / DAY);
  if (span > MAX_DAYS - 1) {
    from = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" })
      .format(new Date(new Date(to + "T00:00:00+09:00").getTime() - (MAX_DAYS - 1) * DAY));
  }
  return { from, to };
}

export default async function AdminOrdersPage({ searchParams }: { searchParams: { from?: string; to?: string; view?: string } }) {
  const { from, to } = resolveRange(searchParams.from, searchParams.to);
  const fromIso = `${from}T00:00:00+09:00`;
  const toIso = `${to}T23:59:59.999+09:00`;
  // 기본은 결제완료 이상만 표시. "미결제 포함" 체크 시 created(결제 대기·중도이탈)도 표시.
  const view = searchParams.view === "all" ? "all" : "paid";

  const supabase = createClient();
  const { data: allOrders } = await supabase
    .from("orders")
    .select("id,order_no,email,phone,status,grand_total,currency,customer_type,placed_at,shipping_address,order_item(title_snapshot,qty)")
    .gte("placed_at", fromIso)
    .lte("placed_at", toIso)
    .order("placed_at", { ascending: false })
    .limit(2000);

  // 화면 표시용으로 고객명(배송지 수령인)과 품목·수량을 함께 실어 보낸다.
  const all = (allOrders ?? []).map((o) => {
    const addr = (o.shipping_address ?? {}) as { recipient?: string };
    const items = ((o.order_item ?? []) as { title_snapshot: string | null; qty: number }[])
      .map((it) => ({ title: it.title_snapshot ?? "", qty: it.qty }));
    return {
      id: o.id, order_no: o.order_no, email: o.email, phone: o.phone,
      status: o.status, grand_total: o.grand_total, currency: o.currency,
      customer_type: o.customer_type, placed_at: o.placed_at,
      customer: addr.recipient || o.email || "-",
      items,
    };
  });
  // 기본 보기에서 숨기는 상태: created(결제 대기·중도이탈) + expired(24h 경과 자동 만료)
  const UNPAID_STATUSES = ["created", "expired"];
  const orders = view === "all" ? all : all.filter((o) => !UNPAID_STATUSES.includes(o.status));
  const hiddenUnpaid = all.length - orders.length;

  // 빠른 조회 버튼용 날짜/파라미터 (미결제 포함 상태 유지)
  const viewParam = view === "all" ? "&view=all" : "";
  // Export 도 화면과 동일 규칙 — 기본은 결제 완료 건만, '미결제 포함' 보기일 때만 전체.
  const exportHref = `/admin/orders/export?from=${from}&to=${to}${viewParam}`;
  const todayStr = kstToday();
  const weekAgoStr = kstDaysAgo(6);

  return (
    <main>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">주문 관리</h1>
        <a href={exportHref} className="rounded-full bg-ink px-4 py-2 text-sm text-oat hover:opacity-90" download>
          주문 Export (CSV){view === "all" ? " · 미결제 포함" : " · 결제 완료분"}
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
        <label className="flex items-center gap-1.5 text-sm">
          <input type="checkbox" name="view" value="all" defaultChecked={view === "all"} /> 미결제 포함
        </label>
        <button className="rounded-full bg-black px-4 py-2 text-sm text-white">조회</button>
        <a href={`/admin/orders?from=${todayStr}&to=${todayStr}${viewParam}`} className="rounded-full border border-line px-4 py-2 text-sm hover:bg-neutral-50">오늘</a>
        <a href={`/admin/orders?from=${weekAgoStr}&to=${todayStr}${viewParam}`} className="rounded-full border border-line px-4 py-2 text-sm hover:bg-neutral-50">7일간</a>
        <span className="text-xs text-neutral-400">최대 {MAX_DAYS}일까지 조회 가능. 기본은 결제완료 이상만 표시(미결제는 체크 시 포함).</span>
      </form>

      <p className="mb-3 text-sm text-neutral-500">
        {from} ~ {to} · {orders.length}건
        {view === "paid" && hiddenUnpaid > 0 && <span className="text-neutral-400"> · 미결제 {hiddenUnpaid}건 숨김</span>}
      </p>
      <OrdersTable orders={orders ?? []} />
      <p className="mt-4 text-xs text-neutral-400">출고 처리 시 재고 차감·송장 생성·고객 출고 알림 이메일이 발송됩니다(이메일 프로바이더 env 설정 시).</p>
    </main>
  );
}
