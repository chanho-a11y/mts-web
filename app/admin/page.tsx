import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatKRW } from "@/lib/i18n";
import { periodRevenue } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const supabase = createClient();
  const [{ count: orders }, { count: products }, { count: pending }, { data: paidOrders }] = await Promise.all([
    supabase.from("orders").select("*", { count: "exact", head: true }),
    supabase.from("product").select("*", { count: "exact", head: true }),
    supabase.from("business_accounts").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("orders").select("status,grand_total,currency,placed_at").limit(5000),
  ]);

  const rev = periodRevenue(paidOrders ?? []);

  const todayStr = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul", year: "numeric", month: "long", day: "numeric", weekday: "long",
  }).format(new Date());

  const cards = [
    { label: "주문", value: orders ?? 0, href: "/admin/orders" },
    { label: "제품", value: products ?? 0, href: "/admin/products" },
    { label: "사업자 승인 대기", value: pending ?? 0, href: "/admin/business" },
  ];

  const periods = [
    { label: "오늘", value: rev.today },
    { label: "이번주", value: rev.week },
    { label: "이번달", value: rev.month },
    { label: "올해", value: rev.year },
  ];

  return (
    <main>
      <div className="mb-6 flex items-end justify-between">
        <h1 className="text-2xl font-bold">관리자 대시보드</h1>
        <p className="text-sm text-neutral-500">{todayStr}</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="rounded-xl border p-5 transition hover:border-neutral-400 hover:bg-neutral-50">
            <p className="text-sm text-neutral-500">{c.label}</p>
            <p className="mt-1 text-2xl font-bold">{c.value}</p>
            <p className="mt-2 text-[11px] text-clayDeep">바로가기 →</p>
          </Link>
        ))}
      </div>

      <h2 className="mb-3 mt-10 text-lg font-bold">기간별 매출 <span className="text-xs font-normal text-neutral-400">(KRW · 결제완료 기준)</span></h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {periods.map((p) => (
          <div key={p.label} className="rounded-xl border p-5">
            <p className="text-sm text-neutral-500">{p.label}</p>
            <p className="mt-1 text-xl font-bold">{formatKRW(p.value)}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
