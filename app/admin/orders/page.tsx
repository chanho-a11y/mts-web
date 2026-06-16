import { createClient } from "@/lib/supabase/server";
import OrdersTable from "@/components/orders-table";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const supabase = createClient();
  const { data: orders } = await supabase
    .from("orders")
    .select("id,order_no,email,phone,status,grand_total,currency,customer_type,placed_at")
    .order("placed_at", { ascending: false })
    .limit(200);
  return (
    <main>
      <h1 className="mb-6 text-2xl font-bold">주문 관리</h1>
      <OrdersTable orders={orders ?? []} />
      <p className="mt-4 text-xs text-neutral-400">출고 처리 시 재고가 차감되고 송장이 생성됩니다. 고객 출고 알림 이메일은 Gmail 연동 후 자동 발송됩니다.</p>
    </main>
  );
}
