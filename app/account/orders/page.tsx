import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import OrderHistory, { type HistoryItem } from "@/components/order-history";
import { getStorefrontContext } from "@/lib/storefront";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

// 고객 주문 내역 목록. 결제완료 메일·완료화면의 "주문 내역 보기" 버튼 목적지(/account/orders).
export default async function OrdersPage() {
  const { locale } = await getStorefrontContext();
  const tt = t(locale);
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/account/login");

  const { data: orders } = await supabase
    .from("orders")
    .select("order_no,status,grand_total,currency,placed_at,order_item(title_snapshot,sku,qty,unit_price,line_total)")
    .eq("profile_id", user.id)
    .order("placed_at", { ascending: false })
    .limit(50);

  const list = (orders ?? []).map((o) => ({
    order_no: o.order_no, status: o.status, grand_total: o.grand_total, currency: o.currency, placed_at: o.placed_at,
    items: ((o as { order_item?: HistoryItem[] }).order_item ?? []),
  }));

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{tt.purchaseHistory}</h1>
        <Link href="/account" className="rounded border px-4 py-1.5 text-sm hover:bg-neutral-50">{tt.myPage}</Link>
      </div>
      <p className="mb-4 mt-1 text-xs text-neutral-400">
        {locale === "en" ? "Click an order to see items · Reorder available." : "주문을 클릭하면 구매 제품이 보이고, 재구매할 수 있습니다."}
      </p>
      <section className="rounded-xl border p-5 text-sm">
        <OrderHistory orders={list} locale={locale} />
      </section>
    </main>
  );
}
