import { createClient } from "@/lib/supabase/server";
import { formatKRW } from "@/lib/i18n";

export const dynamic = "force-dynamic";

const PAID = ["paid", "preparing", "shipped", "in_transit", "delivered"];

export default async function AdminAnalyticsPage() {
  const supabase = createClient();
  const { data: orders } = await supabase
    .from("orders")
    .select("status,grand_total,currency,customer_type,placed_at")
    .order("placed_at", { ascending: false })
    .limit(1000);
  const rows = orders ?? [];

  const krw = rows.filter((o) => o.currency === "KRW");
  const sales = krw.filter((o) => PAID.includes(o.status)).reduce((s, o) => s + o.grand_total, 0);
  const paidCount = rows.filter((o) => PAID.includes(o.status)).length;
  const avg = paidCount ? Math.round(sales / paidCount) : 0;

  const byStatus = new Map<string, number>();
  rows.forEach((o) => byStatus.set(o.status, (byStatus.get(o.status) ?? 0) + 1));

  const [{ count: total }, { count: biz }, { count: pendingBiz }] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "business"),
    supabase.from("business_accounts").select("*", { count: "exact", head: true }).eq("status", "pending"),
  ]);

  const cards = [
    { label: "총 매출(KRW, 결제완료+)", value: formatKRW(sales) },
    { label: "결제완료 주문", value: paidCount },
    { label: "평균 주문금액", value: formatKRW(avg) },
    { label: "전체 주문", value: rows.length },
    { label: "회원 수", value: total ?? 0 },
    { label: "기업회원(승인)", value: biz ?? 0 },
  ];

  return (
    <main>
      <h1 className="mb-6 text-2xl font-bold">분석</h1>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border p-5">
            <p className="text-xs text-neutral-500">{c.label}</p>
            <p className="mt-1 text-xl font-bold">{c.value}</p>
          </div>
        ))}
      </div>

      <section className="mt-8">
        <h2 className="mb-3 font-bold">주문 상태 분포</h2>
        <table className="w-full max-w-md text-sm">
          <tbody>
            {[...byStatus.entries()].map(([s, n]) => (
              <tr key={s} className="border-b"><td className="py-2">{s}</td><td className="text-right">{n}</td></tr>
            ))}
            {byStatus.size === 0 && <tr><td className="py-4 text-neutral-400">주문 데이터 없음</td></tr>}
          </tbody>
        </table>
        {(pendingBiz ?? 0) > 0 && <p className="mt-4 text-sm text-amber-600">사업자 승인 대기 {pendingBiz}건</p>}
      </section>
      <p className="mt-6 text-xs text-neutral-400">※ 채널·인플루언서·기간별 상세 분석은 P6에서 확장(주문 brand/channel 태그 기반).</p>
    </main>
  );
}
