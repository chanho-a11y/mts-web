import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const supabase = createClient();
  const [{ count: orders }, { count: products }, { count: pending }] = await Promise.all([
    supabase.from("orders").select("*", { count: "exact", head: true }),
    supabase.from("product").select("*", { count: "exact", head: true }),
    supabase.from("business_accounts").select("*", { count: "exact", head: true }).eq("status", "pending"),
  ]);
  const cards = [
    { label: "주문", value: orders ?? 0 },
    { label: "제품", value: products ?? 0 },
    { label: "사업자 승인 대기", value: pending ?? 0 },
  ];
  return (
    <main>
      <h1 className="mb-6 text-2xl font-bold">관리자 대시보드</h1>
      <div className="grid grid-cols-3 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border p-5">
            <p className="text-sm text-neutral-500">{c.label}</p>
            <p className="mt-1 text-2xl font-bold">{c.value}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
