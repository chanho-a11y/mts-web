import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatKRW } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function OrderDetail({ params }: { params: { no: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/account/login");

  const { data: order } = await supabase
    .from("orders")
    .select("order_no,status,email,phone,shipping_address,items_subtotal,discount_total,tip_amount,shipping_fee,tax_amount,grand_total,currency,placed_at,order_item(sku,title_snapshot,unit_price,qty,line_total)")
    .eq("order_no", params.no)
    .maybeSingle();
  if (!order) notFound();

  const cur = (n: number) => order.currency === "USD" ? `$${n}` : formatKRW(n);
  const items = (order as any).order_item ?? [];
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-bold">주문 {order.order_no}</h1>
      <p className="mt-1 text-sm text-neutral-500">{order.status} · {new Date(order.placed_at).toLocaleString("ko-KR")}</p>

      <table className="mt-6 w-full text-sm">
        <tbody>
          {items.map((it: any, i: number) => (
            <tr key={i} className="border-b">
              <td className="py-2">{it.title_snapshot}<br /><span className="text-xs text-neutral-400">{it.sku} × {it.qty}</span></td>
              <td className="text-right">{cur(it.line_total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <dl className="mt-4 space-y-1 text-sm">
        <Row k="소계" v={cur(order.items_subtotal)} />
        {order.discount_total > 0 && <Row k="할인" v={"-" + cur(order.discount_total)} />}
        {order.tip_amount > 0 && <Row k="팁" v={cur(order.tip_amount)} />}
        <Row k="배송비" v={cur(order.shipping_fee)} />
        <Row k="합계" v={cur(order.grand_total)} bold />
      </dl>
    </main>
  );
}
function Row({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return <div className={`flex justify-between ${bold ? "border-t pt-2 font-bold" : ""}`}><dt>{k}</dt><dd>{v}</dd></div>;
}
