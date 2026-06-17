import { createClient } from "@/lib/supabase/server";
import { formatKRW } from "@/lib/i18n";

export const dynamic = "force-dynamic";

const PAID = ["paid", "preparing", "shipped", "in_transit", "delivered", "confirmed"];
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
