import { createClient } from "@/lib/supabase/server";
import { formatKRW } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const supabase = createClient();
  const { data: orders } = await supabase
    .from("orders")
    .select("order_no,email,phone,status,grand_total,currency,placed_at")
    .order("placed_at", { ascending: false })
    .limit(100);
  return (
    <main>
      <h1 className="mb-6 text-2xl font-bold">주문 관리</h1>
      <table className="w-full text-sm">
        <thead><tr className="border-b text-left text-neutral-500">
          <th className="py-2">주문번호</th><th>고객</th><th>금액</th><th>상태</th><th>일시</th>
        </tr></thead>
        <tbody>
          {(orders ?? []).map((o) => (
            <tr key={o.order_no} className="border-b">
              <td className="py-3 font-mono text-xs">{o.order_no}</td>
              <td>{o.email}<br /><span className="text-xs text-neutral-400">{o.phone}</span></td>
              <td>{o.currency === "USD" ? `$${o.grand_total}` : formatKRW(o.grand_total)}</td>
              <td>{o.status}</td>
              <td className="text-xs text-neutral-400">{new Date(o.placed_at).toLocaleString("ko-KR")}</td>
            </tr>
          ))}
          {(!orders || orders.length === 0) && <tr><td colSpan={5} className="py-6 text-center text-neutral-400">주문이 없습니다.</td></tr>}
        </tbody>
      </table>
    </main>
  );
}
