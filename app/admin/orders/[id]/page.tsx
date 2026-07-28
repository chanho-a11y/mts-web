import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatKRW } from "@/lib/i18n";
import OrderCancelPanel from "@/components/order-cancel-panel";

export const dynamic = "force-dynamic";

const ORDER_STATUS: Record<string, string> = {
  created: "결제대기", paid: "결제완료", preparing: "확인", shipped: "출고", in_transit: "배송중",
  delivered: "완료", cancelled: "전체취소", refunded: "환불", partial_refunded: "부분취소", expired: "기간만료",
};
const PAY_STATUS: Record<string, string> = {
  ready: "대기", paid: "완료", failed: "실패", cancelled: "취소", partial_cancelled: "부분취소", refunded: "환불",
};

function money(amount: number, currency: string) {
  return currency === "USD" ? `$${amount}` : formatKRW(amount);
}

export default async function AdminOrderDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: order } = await supabase
    .from("orders")
    .select("id,order_no,status,email,phone,customer_type,shipping_address,items_subtotal,discount_total,tip_amount,shipping_fee,tax_amount,grand_total,currency,coupon_code,placed_at,paid_at")
    .eq("id", params.id)
    .maybeSingle();
  if (!order) notFound();

  const [{ data: items }, { data: pay }, { data: shp }] = await Promise.all([
    supabase.from("order_item").select("id,title_snapshot,option_snapshot,sku,unit_price,qty,cancelled_qty,line_total").eq("order_id", order.id).order("id"),
    supabase.from("payment").select("id,provider,status,amount,pg_tid,capture_id,approved_at").eq("order_id", order.id).maybeSingle(),
    supabase.from("shipment").select("id").eq("order_id", order.id).maybeSingle(),
  ]);

  // 취소 이력(refund는 payment_id 기준)
  const { data: refundRows } = pay
    ? await supabase.from("refund").select("amount,reason,status,pg_cancel_id,created_at").eq("payment_id", pay.id).order("created_at", { ascending: false })
    : { data: [] as { amount: number; reason: string | null; status: string; pg_cancel_id: string | null; created_at: string }[] };

  const cur = order.currency;
  const alreadyCancelled = (refundRows ?? []).filter((r) => r.status === "success").reduce((s, r) => s + (r.amount || 0), 0);
  const paidAmount = pay?.amount ?? order.grand_total;
  const remaining = paidAmount - alreadyCancelled;
  const shipAddr = order.shipping_address as { recipient?: string; phone?: string; zipcode?: string; addr1?: string; addr2?: string } | null;

  const providerCancelable =
    (pay?.provider === "inicis" && !!pay?.pg_tid) ||
    (pay?.provider === "paypal" && !!pay?.capture_id);
  const canCancel =
    providerCancelable &&
    ["paid", "partial_cancelled"].includes(pay?.status ?? "") &&
    remaining > 0;

  const panelItems = (items ?? []).map((it) => ({
    id: it.id,
    title: it.title_snapshot ?? it.sku ?? "품목",
    unit_price: it.unit_price,
    qty: it.qty,
    cancelled_qty: it.cancelled_qty ?? 0,
    currency: cur,
  }));

  return (
    <main className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/orders" className="text-sm text-neutral-500 hover:underline">← 주문 관리</Link>
          <h1 className="mt-1 text-2xl font-bold font-mono">{order.order_no}</h1>
        </div>
        <span className="rounded-full border px-3 py-1 text-sm">{ORDER_STATUS[order.status] ?? order.status}</span>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 주문/배송 */}
        <section className="rounded-card border border-line p-4 text-sm">
          <h2 className="mb-3 font-bold">주문 정보</h2>
          <dl className="space-y-1">
            <div className="flex justify-between"><dt className="text-neutral-500">주문일</dt><dd>{order.placed_at ? new Date(order.placed_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }) : "-"}</dd></div>
            <div className="flex justify-between"><dt className="text-neutral-500">결제일</dt><dd>{order.paid_at ? new Date(order.paid_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }) : "-"}</dd></div>
            <div className="flex justify-between"><dt className="text-neutral-500">고객</dt><dd>{order.email ?? "-"}</dd></div>
            <div className="flex justify-between"><dt className="text-neutral-500">구분</dt><dd>{order.customer_type === "business" ? "기업" : order.customer_type === "guest" ? "비회원" : "일반"}</dd></div>
          </dl>
          <h2 className="mb-2 mt-4 font-bold">배송지</h2>
          <p className="text-neutral-700">
            {shipAddr?.recipient} · {shipAddr?.phone}<br />
            ({shipAddr?.zipcode}) {shipAddr?.addr1} {shipAddr?.addr2}
          </p>
        </section>

        {/* 결제 */}
        <section className="rounded-card border border-line p-4 text-sm">
          <h2 className="mb-3 font-bold">결제 정보</h2>
          <dl className="space-y-1">
            <div className="flex justify-between"><dt className="text-neutral-500">PG</dt><dd>{pay?.provider ?? "-"}</dd></div>
            <div className="flex justify-between"><dt className="text-neutral-500">결제상태</dt><dd>{PAY_STATUS[pay?.status ?? ""] ?? pay?.status ?? "-"}</dd></div>
            <div className="flex justify-between"><dt className="text-neutral-500">TID</dt><dd className="truncate font-mono text-xs">{pay?.pg_tid ?? "-"}</dd></div>
            <div className="flex justify-between"><dt className="text-neutral-500">결제금액</dt><dd>{money(paidAmount, cur)}</dd></div>
            {alreadyCancelled > 0 && <div className="flex justify-between text-red-600"><dt>취소액</dt><dd>-{money(alreadyCancelled, cur)}</dd></div>}
            <div className="flex justify-between border-t pt-1 font-bold"><dt>잔여</dt><dd>{money(remaining, cur)}</dd></div>
          </dl>
          <p className="mt-2 text-xs text-neutral-400">출고 여부: {shp ? "출고됨(취소 시 재고 복원)" : "미출고"}</p>
        </section>
      </div>

      {/* 품목 */}
      <section className="rounded-card border border-line p-4">
        <h2 className="mb-3 font-bold">주문 품목</h2>
        <table className="w-full text-sm">
          <thead><tr className="border-b text-left text-neutral-500">
            <th className="py-2">품목</th><th>단가</th><th>수량</th><th>취소</th><th className="text-right">금액</th>
          </tr></thead>
          <tbody>
            {(items ?? []).map((it) => (
              <tr key={it.id} className="border-b">
                <td className="py-2">{it.title_snapshot ?? it.sku}</td>
                <td>{money(it.unit_price, cur)}</td>
                <td>{it.qty}</td>
                <td>{(it.cancelled_qty ?? 0) > 0 ? <span className="text-red-600">-{it.cancelled_qty}</span> : "-"}</td>
                <td className="text-right">{money(it.line_total, cur)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <dl className="mt-3 space-y-1 text-sm">
          <div className="flex justify-between"><dt className="text-neutral-500">상품합계</dt><dd>{money(order.items_subtotal, cur)}</dd></div>
          {order.discount_total > 0 && <div className="flex justify-between text-neutral-500"><dt>할인{order.coupon_code ? ` (${order.coupon_code})` : ""}</dt><dd>-{money(order.discount_total, cur)}</dd></div>}
          {order.shipping_fee > 0 && <div className="flex justify-between text-neutral-500"><dt>배송비</dt><dd>{money(order.shipping_fee, cur)}</dd></div>}
          <div className="flex justify-between border-t pt-1 font-bold"><dt>결제금액</dt><dd>{money(order.grand_total, cur)}</dd></div>
        </dl>
      </section>

      {/* 취소/부분취소 */}
      <section className="rounded-card border border-line p-4">
        <h2 className="mb-3 font-bold">취소 / 부분취소</h2>
        {canCancel ? (
          <OrderCancelPanel orderId={order.id} items={panelItems} remaining={remaining} currency={cur} provider={pay?.provider ?? ""} />
        ) : (
          <p className="text-sm text-neutral-500">
            {pay?.provider && !["inicis", "paypal"].includes(pay.provider)
              ? "이니시스·페이팔 결제만 취소를 지원합니다."
              : remaining <= 0
                ? "이미 전액 취소되었습니다."
                : "현재 상태에서는 취소할 수 없습니다."}
          </p>
        )}

        {(refundRows ?? []).length > 0 && (
          <div className="mt-4">
            <h3 className="mb-2 text-sm font-bold text-neutral-600">취소 이력</h3>
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-neutral-400">
                <th className="py-1">일시</th><th>금액</th><th>사유</th><th>취소TID</th><th>상태</th>
              </tr></thead>
              <tbody>
                {(refundRows ?? []).map((r, i) => (
                  <tr key={i} className="border-b">
                    <td className="py-1">{new Date(r.created_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}</td>
                    <td>{money(r.amount, cur)}</td>
                    <td>{r.reason}</td>
                    <td className="font-mono text-xs">{r.pg_cancel_id ?? "-"}</td>
                    <td>{r.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
