import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatKRW } from "@/lib/i18n";
import { PAID_STATUSES, PERIOD_PRESETS, resolvePeriod } from "@/lib/analytics";

export const dynamic = "force-dynamic";

const PAID = PAID_STATUSES;
const TYPE_LABEL: Record<string, string> = {
  guest: "비회원", individual: "일반회원", business: "기업회원", influencer: "인플루언서", admin: "관리자",
};

// 주문 아이템 조회 select — 임베디드(orders) 기준 기간 필터를 위해 !inner 사용, 실패 시 좌조인 폴백.
const ITEM_SELECT_INNER = "qty,line_total,order:orders!inner(status,currency,placed_at,profile_id),variant:product_variant(product:product(cost))";
const ITEM_SELECT = "qty,line_total,order:orders(status,currency,placed_at,profile_id),variant:product_variant(product:product(cost))";

export default async function AdminAnalyticsPage({ searchParams }: {
  searchParams: { preset?: string; from?: string; to?: string };
}) {
  // ── 기간 결정 (KST) ──────────────────────────────────────────
  const period = resolvePeriod(searchParams);
  const fromISO = period.fromMs !== null ? new Date(period.fromMs).toISOString() : null;
  const toISO = period.toMs !== null ? new Date(period.toMs).toISOString() : null;
  const inRange = (t?: string | null) => {
    if (!t) return period.fromMs === null && period.toMs === null; // 미결제/미확정 주문은 전체 기간에서만 집계
    const ms = new Date(t).getTime();
    if (Number.isNaN(ms)) return false;
    if (period.fromMs !== null && ms < period.fromMs) return false;
    if (period.toMs !== null && ms >= period.toMs) return false;
    return true;
  };
  const presetHref = (k: string) => `/admin/analytics?preset=${k}`;

  const supabase = createClient();

  // ── 주문 ────────────────────────────────────────────────────
  let oq = supabase
    .from("orders")
    .select("status,grand_total,currency,customer_type,coupon_code,profile_id,placed_at,shipping_address")
    .order("placed_at", { ascending: false })
    .limit(5000);
  if (fromISO) oq = oq.gte("placed_at", fromISO);
  if (toISO) oq = oq.lt("placed_at", toISO);
  const { data: orders } = await oq;
  const rows = (orders ?? []).filter((o) => inRange(o.placed_at));
  const krw = rows.filter((o) => o.currency === "KRW");
  const paid = krw.filter((o) => PAID.includes(o.status));

  const sales = paid.reduce((s, o) => s + o.grand_total, 0);
  const paidCount = paid.length;
  const avg = paidCount ? Math.round(sales / paidCount) : 0;

  // ── 주문 아이템 (원가·수량 집계용) ───────────────────────────
  let items: any[] = [];
  {
    let iq = supabase.from("order_item").select(ITEM_SELECT_INNER).limit(20000);
    if (fromISO) iq = iq.gte("order.placed_at", fromISO);
    if (toISO) iq = iq.lt("order.placed_at", toISO);
    const { data, error } = await iq;
    if (error) {
      const fb = await supabase.from("order_item").select(ITEM_SELECT).limit(20000);
      items = (fb.data ?? []) as any[];
    } else {
      items = (data ?? []) as any[];
    }
  }
  const lineItems = items.filter((it) => it.order && inRange(it.order.placed_at));
  const paidItems = lineItems.filter((it) => it.order.currency === "KRW" && PAID.includes(it.order.status));

  // 선택 기간 총이익 = 상품매출 − 제조원가(product.cost × qty)
  let gpRev = 0, gpCogs = 0;
  for (const it of paidItems) {
    gpRev += it.line_total || 0;
    gpCogs += (it.qty || 0) * (it.variant?.product?.cost ?? 0);
  }
  const gross = gpRev - gpCogs;
  const marginPct = gpRev ? Math.round((gross / gpRev) * 1000) / 10 : 0;

  const gaEnabled = !!process.env.NEXT_PUBLIC_GA_ID;

  const byStatus = new Map<string, number>();
  rows.forEach((o) => byStatus.set(o.status, (byStatus.get(o.status) ?? 0) + 1));

  // 세그먼트(고객유형)별 매출/주문
  const seg = new Map<string, { sales: number; count: number }>();
  paid.forEach((o) => {
    const k = o.customer_type ?? "individual";
    const cur = seg.get(k) ?? { sales: 0, count: 0 };
    cur.sales += o.grand_total; cur.count += 1; seg.set(k, cur);
  });

  // 코드별(프로모션/인플루언서) 매출
  const byCode = new Map<string, { sales: number; count: number }>();
  paid.filter((o) => o.coupon_code).forEach((o) => {
    const k = o.coupon_code as string;
    const cur = byCode.get(k) ?? { sales: 0, count: 0 };
    cur.sales += o.grand_total; cur.count += 1; byCode.set(k, cur);
  });

  // 구매 빈도(회원별 결제완료 주문 수 → 버킷)
  const perProfile = new Map<string, number>();
  paid.filter((o) => o.profile_id).forEach((o) => perProfile.set(o.profile_id, (perProfile.get(o.profile_id) ?? 0) + 1));
  const freq = { one: 0, twoThree: 0, fourPlus: 0 };
  perProfile.forEach((n) => { if (n >= 4) freq.fourPlus++; else if (n >= 2) freq.twoThree++; else freq.one++; });
  const repeatRate = perProfile.size ? Math.round(((freq.twoThree + freq.fourPlus) / perProfile.size) * 100) : 0;

  // 아이템당 평균 판매가격 = 결제완료 라인 매출 합 / 수량 합
  let itemQty = 0, itemRev = 0;
  for (const it of paidItems) { itemQty += it.qty || 0; itemRev += it.line_total || 0; }
  const itemAvg = itemQty ? Math.round(itemRev / itemQty) : 0;

  // 지역별 매출 (배송지 시/도 기준 — province/sido, 없으면 주소1 첫 토큰)
  const regionSales = new Map<string, { sales: number; count: number }>();
  paid.forEach((o) => {
    const a = (o.shipping_address ?? {}) as Record<string, string>;
    const region = (a.province || a.sido || a.state || a.city || (a.addr1 ? a.addr1.trim().split(/\s+/)[0] : "") || "기타").trim() || "기타";
    const cur = regionSales.get(region) ?? { sales: 0, count: 0 };
    cur.sales += o.grand_total; cur.count += 1; regionSales.set(region, cur);
  });

  // 고객별 매출/구매수량 (상·하위 5)
  const salesByProfile = new Map<string, number>();
  paid.filter((o) => o.profile_id).forEach((o) => salesByProfile.set(o.profile_id, (salesByProfile.get(o.profile_id) ?? 0) + o.grand_total));
  const qtyByProfile = new Map<string, number>();
  for (const it of paidItems) {
    const pid = it.order?.profile_id;
    if (!pid) continue;
    qtyByProfile.set(pid, (qtyByProfile.get(pid) ?? 0) + (it.qty || 0));
  }
  const pids = Array.from(new Set([...salesByProfile.keys(), ...qtyByProfile.keys()]));
  const nameById = new Map<string, string>();
  if (pids.length) {
    const { data: profs } = await supabase.from("profiles").select("id,name,email").in("id", pids);
    (profs ?? []).forEach((p: any) => nameById.set(p.id, p.name || p.email || String(p.id).slice(0, 8)));
  }
  const rank = (m: Map<string, number>, asc: boolean) =>
    [...m.entries()].filter(([, v]) => v > 0).sort((a, b) => (asc ? a[1] - b[1] : b[1] - a[1])).slice(0, 5);
  const salesTop = rank(salesByProfile, false), salesBottom = rank(salesByProfile, true);
  const qtyTop = rank(qtyByProfile, false), qtyBottom = rank(qtyByProfile, true);

  // 회원 수는 기간과 무관한 현재 시점 스냅샷
  const [{ count: total }, { count: biz }, { count: infl }, { count: pendingBiz }] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "business"),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "influencer"),
    supabase.from("business_accounts").select("*", { count: "exact", head: true }).eq("status", "pending"),
  ]);

  const cards = [
    { label: "총 매출(KRW, 결제완료+)", value: formatKRW(sales) },
    { label: "결제완료 주문", value: paidCount },
    { label: "평균 주문금액", value: formatKRW(avg) },
    { label: "아이템당 평균 판매가", value: formatKRW(itemAvg) },
    { label: "재구매율", value: `${repeatRate}%` },
    { label: "회원 수 (전체)", value: total ?? 0 },
    { label: "기업회원 (전체)", value: biz ?? 0 },
    { label: "인플루언서 (전체)", value: infl ?? 0 },
    { label: "전체 주문", value: rows.length },
  ];

  const tableCls = "w-full max-w-lg text-sm";
  const periodNote = <span className="text-xs font-normal text-neutral-400">({period.label})</span>;

  return (
    <main className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">분석</h1>
        <p className="mt-1 text-sm text-neutral-500">기준 기간: <b className="text-neutral-800">{period.label}</b> · 아래 모든 지표에 동일하게 적용됩니다(회원 수 제외).</p>
      </div>

      {/* 기간 선택 */}
      <section className="rounded-xl border bg-neutral-50 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-neutral-500">기간</span>
          {PERIOD_PRESETS.map((pr) => (
            <Link
              key={pr.key}
              href={presetHref(pr.key)}
              className={`rounded-full border px-3 py-1 text-xs ${period.preset === pr.key ? "bg-black text-white" : "bg-white hover:bg-neutral-100"}`}
            >
              {pr.label}
            </Link>
          ))}
        </div>
        <form method="get" action="/admin/analytics" className="mt-3 flex flex-wrap items-center gap-2">
          <input type="hidden" name="preset" value="custom" />
          <span className="text-sm text-neutral-500">직접 선택</span>
          <input type="date" name="from" defaultValue={period.fromInput} className="rounded border px-2 py-1 text-xs" />
          <span className="text-neutral-400">~</span>
          <input type="date" name="to" defaultValue={period.toInput} className="rounded border px-2 py-1 text-xs" />
          <button type="submit" className="rounded-full bg-black px-4 py-1.5 text-xs text-white">적용</button>
          {period.preset === "custom" && (
            <Link href={presetHref("all")} className="rounded-full border bg-white px-3 py-1 text-xs hover:bg-neutral-100">초기화</Link>
          )}
        </form>
        <p className="mt-2 text-[11px] text-neutral-400">시작·종료일 모두 포함(KST 자정 기준). 한쪽만 입력하면 그 방향으로 열린 구간이 됩니다.</p>
      </section>

      {/* 선택 기간 매출 · 총이익 */}
      <section>
        <h2 className="mb-1 font-bold">기간별 매출 · 총이익 {periodNote}</h2>
        <p className="mb-3 text-xs text-neutral-400">
          KRW · 결제완료 기준. 총이익 = 상품매출 − 제조원가(제품별 원가는 <a href="/admin/products" className="underline">제품 관리</a>에서 입력, 미입력 시 0으로 계산).
        </p>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-xl border p-5">
            <p className="text-sm text-neutral-500">매출</p>
            <p className="mt-1 text-xl font-bold">{formatKRW(sales)}</p>
            <p className="mt-1 text-[11px] text-neutral-400">결제완료 {paidCount}건</p>
          </div>
          <div className="rounded-xl border p-5">
            <p className="text-sm text-neutral-500">총이익 (Gross Profit)</p>
            <p className="mt-1 text-xl font-bold">{formatKRW(gross)}</p>
            <p className="mt-1 text-[11px] text-neutral-400">상품매출 {formatKRW(gpRev)} · 원가 {formatKRW(gpCogs)}</p>
          </div>
          <div className="rounded-xl border p-5">
            <p className="text-sm text-neutral-500">이익률</p>
            <p className="mt-1 text-xl font-bold">{marginPct}%</p>
            <p className="mt-1 text-[11px] text-neutral-400">총이익 ÷ 상품매출</p>
          </div>
          <div className="rounded-xl border p-5">
            <p className="text-sm text-neutral-500">평균 주문금액</p>
            <p className="mt-1 text-xl font-bold">{formatKRW(avg)}</p>
            <p className="mt-1 text-[11px] text-neutral-400">아이템 평균 {formatKRW(itemAvg)}</p>
          </div>
        </div>
      </section>

      {/* Google Analytics 연동 */}
      <section className="rounded-xl border p-5">
        <h2 className="mb-1 font-bold">Google Analytics (트래픽·매출 분석)</h2>
        {gaEnabled ? (
          <p className="text-sm text-green-700">GA4 연동됨 (측정 ID: {process.env.NEXT_PUBLIC_GA_ID}). 상세 리포트는 GA 대시보드에서 확인하세요.</p>
        ) : (
          <p className="text-sm text-neutral-500">
            GA4 연동 자리(코드)가 준비되어 있습니다. 환경변수 <code className="rounded bg-neutral-100 px-1">NEXT_PUBLIC_GA_ID</code>에 측정 ID(G-XXXXXXXXXX)를 설정하면
            전 페이지에 GA 태그가 자동 삽입되고, 트래픽·매출 데이터가 GA 대시보드에 수집됩니다.
          </p>
        )}
      </section>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border p-5">
            <p className="text-xs text-neutral-500">{c.label}</p>
            <p className="mt-1 text-xl font-bold">{c.value}</p>
          </div>
        ))}
      </div>

      <section>
        <h2 className="mb-3 font-bold">세그먼트별 매출 (고객 유형) {periodNote}</h2>
        <table className={tableCls}>
          <thead><tr className="border-b text-left text-neutral-500"><th className="py-2">유형</th><th className="text-right">주문</th><th className="text-right">매출</th></tr></thead>
          <tbody>
            {[...seg.entries()].sort((a, b) => b[1].sales - a[1].sales).map(([k, v]) => (
              <tr key={k} className="border-b"><td className="py-2">{TYPE_LABEL[k] ?? k}</td><td className="text-right">{v.count}</td><td className="text-right">{formatKRW(v.sales)}</td></tr>
            ))}
            {seg.size === 0 && <tr><td colSpan={3} className="py-4 text-neutral-400">데이터 없음</td></tr>}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="mb-3 font-bold">구매 빈도 분석 {periodNote}</h2>
        <table className={tableCls}>
          <tbody>
            <tr className="border-b"><td className="py-2">1회 구매</td><td className="text-right">{freq.one}명</td></tr>
            <tr className="border-b"><td className="py-2">2–3회 구매</td><td className="text-right">{freq.twoThree}명</td></tr>
            <tr className="border-b"><td className="py-2">4회 이상(충성)</td><td className="text-right">{freq.fourPlus}명</td></tr>
            <tr className="border-b font-medium"><td className="py-2">재구매율</td><td className="text-right">{repeatRate}%</td></tr>
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="mb-3 font-bold">코드별 매출 (프로모션 · 인플루언서) {periodNote}</h2>
        <table className={tableCls}>
          <thead><tr className="border-b text-left text-neutral-500"><th className="py-2">코드</th><th className="text-right">주문</th><th className="text-right">매출</th></tr></thead>
          <tbody>
            {[...byCode.entries()].sort((a, b) => b[1].sales - a[1].sales).map(([k, v]) => (
              <tr key={k} className="border-b"><td className="py-2">{k}</td><td className="text-right">{v.count}</td><td className="text-right">{formatKRW(v.sales)}</td></tr>
            ))}
            {byCode.size === 0 && <tr><td colSpan={3} className="py-4 text-neutral-400">코드 사용 주문 없음</td></tr>}
          </tbody>
        </table>
      </section>

      {/* 지역별 매출 */}
      <section>
        <h2 className="mb-3 font-bold">지역별 매출 <span className="text-xs font-normal text-neutral-400">(배송지 시/도 · 결제완료 기준 · {period.label})</span></h2>
        <table className={tableCls}>
          <thead><tr className="border-b text-left text-neutral-500"><th className="py-2">지역</th><th className="text-right">주문</th><th className="text-right">매출</th></tr></thead>
          <tbody>
            {[...regionSales.entries()].sort((a, b) => b[1].sales - a[1].sales).map(([k, v]) => (
              <tr key={k} className="border-b"><td className="py-2">{k}</td><td className="text-right">{v.count}</td><td className="text-right">{formatKRW(v.sales)}</td></tr>
            ))}
            {regionSales.size === 0 && <tr><td colSpan={3} className="py-4 text-neutral-400">데이터 없음</td></tr>}
          </tbody>
        </table>
      </section>

      {/* 고객 순위 (매출·구매수량 상·하위 5) */}
      <section>
        <h2 className="mb-3 font-bold">고객 순위 <span className="text-xs font-normal text-neutral-400">(결제완료 기준 · {period.label})</span></h2>
        <div className="grid gap-6 md:grid-cols-2">
          {([
            { title: "매출 상위 5 고객", data: salesTop, money: true },
            { title: "매출 하위 5 고객", data: salesBottom, money: true },
            { title: "구매 수량 상위 5 고객", data: qtyTop, money: false },
            { title: "구매 수량 하위 5 고객", data: qtyBottom, money: false },
          ] as { title: string; data: [string, number][]; money: boolean }[]).map((blk) => (
            <div key={blk.title}>
              <p className="mb-2 text-sm font-semibold">{blk.title}</p>
              <table className="w-full text-sm">
                <tbody>
                  {blk.data.map(([pid, v], idx) => (
                    <tr key={pid} className="border-b">
                      <td className="py-1.5 text-neutral-400">{idx + 1}</td>
                      <td className="py-1.5">{nameById.get(pid) ?? pid.slice(0, 8)}</td>
                      <td className="py-1.5 text-right">{blk.money ? formatKRW(v) : `${v}개`}</td>
                    </tr>
                  ))}
                  {blk.data.length === 0 && <tr><td colSpan={3} className="py-3 text-neutral-400">데이터 없음</td></tr>}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-bold">주문 상태 분포 {periodNote}</h2>
        <table className={tableCls}>
          <tbody>
            {[...byStatus.entries()].map(([s, n]) => (
              <tr key={s} className="border-b"><td className="py-2">{s}</td><td className="text-right">{n}</td></tr>
            ))}
            {byStatus.size === 0 && <tr><td colSpan={2} className="py-4 text-neutral-400">데이터 없음</td></tr>}
          </tbody>
        </table>
        {(pendingBiz ?? 0) > 0 && <p className="mt-4 text-sm text-amber-600">사업자 승인 대기 {pendingBiz}건 <span className="text-xs text-neutral-400">(기간 무관·현재 시점)</span></p>}
      </section>
    </main>
  );
}
