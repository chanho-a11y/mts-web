import { createClient } from "@/lib/supabase/server";
import { formatKRW } from "@/lib/i18n";
import { periodRevenue, kstPeriodBounds, PAID_STATUSES } from "@/lib/analytics";

export const dynamic = "force-dynamic";

const PAID = PAID_STATUSES;
const TYPE_LABEL: Record<string, string> = {
  guest: "비회원", individual: "일반회원", business: "기업회원", influencer: "인플루언서", admin: "관리자",
};

export default async function AdminAnalyticsPage() {
  const supabase = createClient();
  const { data: orders } = await supabase
    .from("orders")
    .select("status,grand_total,currency,customer_type,coupon_code,profile_id,placed_at")
    .order("placed_at", { ascending: false })
    .limit(2000);
  const rows = orders ?? [];
  const krw = rows.filter((o) => o.currency === "KRW");
  const paid = krw.filter((o) => PAID.includes(o.status));

  const sales = paid.reduce((s, o) => s + o.grand_total, 0);
  const paidCount = paid.length;
  const avg = paidCount ? Math.round(sales / paidCount) : 0;

  // 기간별 매출(오늘/이번주/이번달/올해)
  const rev = periodRevenue(rows);

  // 기간별 gross profit — order_item(line_total) − 제조원가(product.cost × qty)
  const { data: items } = await supabase
    .from("order_item")
    .select("qty,line_total,order:orders(status,currency,placed_at),variant:product_variant(product:product(cost))")
    .limit(10000);
  const bounds = kstPeriodBounds();
  const grossFrom = (fromMs: number) => {
    let r = 0, cogs = 0;
    for (const it of (items ?? []) as any[]) {
      const o = it.order;
      if (!o || o.currency !== "KRW" || !PAID.includes(o.status) || !o.placed_at) continue;
      if (new Date(o.placed_at).getTime() < fromMs) continue;
      r += it.line_total || 0;
      cogs += (it.qty || 0) * (it.variant?.product?.cost ?? 0);
    }
    return { rev: r, cogs, gross: r - cogs };
  };
  const gp = {
    today: grossFrom(bounds.startOfDayUTC),
    week: grossFrom(bounds.startOfWeekUTC),
    month: grossFrom(bounds.startOfMonthUTC),
    year: grossFrom(bounds.startOfYearUTC),
  };
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
    { label: "재구매율", value: `${repeatRate}%` },
    { label: "회원 수", value: total ?? 0 },
    { label: "기업회원", value: biz ?? 0 },
    { label: "인플루언서", value: infl ?? 0 },
    { label: "전체 주문", value: rows.length },
  ];

  const tableCls = "w-full max-w-lg text-sm";
  return (
    <main className="space-y-8">
      <h1 className="text-2xl font-bold">분석</h1>

      {/* 기간별 매출 */}
      <section>
        <h2 className="mb-3 font-bold">기간별 매출 <span className="text-xs font-normal text-neutral-400">(KRW · 결제완료 기준)</span></h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {([["오늘", rev.today], ["이번주", rev.week], ["이번달", rev.month], ["올해", rev.year]] as [string, number][]).map(([lbl, v]) => (
            <div key={lbl} className="rounded-xl border p-5">
              <p className="text-sm text-neutral-500">{lbl}</p>
              <p className="mt-1 text-xl font-bold">{formatKRW(v)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 기간별 Gross Profit */}
      <section>
        <h2 className="mb-1 font-bold">기간별 총이익 (Gross Profit) <span className="text-xs font-normal text-neutral-400">= 상품매출 − 제조원가</span></h2>
        <p className="mb-3 text-xs text-neutral-400">제품별 제조원가는 <a href="/admin/products" className="underline">제품 관리</a>에서 입력합니다. 원가 미입력 제품은 원가 0으로 계산됩니다.</p>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {([["오늘", gp.today], ["이번주", gp.week], ["이번달", gp.month], ["올해", gp.year]] as [string, { rev: number; cogs: number; gross: number }][]).map(([lbl, v]) => (
            <div key={lbl} className="rounded-xl border p-5">
              <p className="text-sm text-neutral-500">{lbl}</p>
              <p className="mt-1 text-xl font-bold">{formatKRW(v.gross)}</p>
              <p className="mt-1 text-[11px] text-neutral-400">매출 {formatKRW(v.rev)} · 원가 {formatKRW(v.cogs)}</p>
            </div>
          ))}
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
        <h2 className="mb-3 font-bold">세그먼트별 매출 (고객 유형)</h2>
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
        <h2 className="mb-3 font-bold">구매 빈도 분석</h2>
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
        <h2 className="mb-3 font-bold">코드별 매출 (프로모션 · 인플루언서)</h2>
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

      <section>
        <h2 className="mb-3 font-bold">주문 상태 분포</h2>
        <table className={tableCls}>
          <tbody>
            {[...byStatus.entries()].map(([s, n]) => (
              <tr key={s} className="border-b"><td className="py-2">{s}</td><td className="text-right">{n}</td></tr>
            ))}
          </tbody>
        </table>
        {(pendingBiz ?? 0) > 0 && <p className="mt-4 text-sm text-amber-600">사업자 승인 대기 {pendingBiz}건</p>}
      </section>
    </main>
  );
}
