"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { setOrderStatusAction, bulkOrdersAction } from "@/app/admin/orders/actions";
import { formatKRW } from "@/lib/i18n";

export interface OrderRow {
  id: string; order_no: string; email: string | null; phone: string | null;
  status: string; grand_total: number; currency: string; customer_type: string | null; placed_at: string;
  customer: string; items: { title: string; qty: number }[];
}
const STATUS: Record<string, string> = {
  created: "미결제", paid: "결제완료", preparing: "확인", shipped: "출고", in_transit: "배송중", delivered: "완료",
  cancelled: "취소", refunded: "환불", partial_refunded: "부분취소",
};

export default function OrdersTable({ orders }: { orders: OrderRow[] }) {
  const router = useRouter();
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const toggle = (id: string) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allChecked = orders.length > 0 && sel.size === orders.length;

  async function bulk(action: "confirm" | "ship") {
    if (sel.size === 0) return;
    setBusy(true);
    await bulkOrdersAction([...sel], action);
    setSel(new Set()); setBusy(false); router.refresh();
  }

  return (
    <div>
      <div className="mb-3 flex gap-2">
        <button disabled={busy || sel.size === 0} onClick={() => bulk("confirm")} className="rounded border px-3 py-1.5 text-sm disabled:opacity-40">일괄 확인</button>
        <button disabled={busy || sel.size === 0} onClick={() => bulk("ship")} className="rounded bg-black px-3 py-1.5 text-sm text-white disabled:opacity-40">일괄 출고</button>
        <span className="self-center text-xs text-neutral-400">{sel.size}건 선택</span>
      </div>
      <table className="w-full text-sm">
        <thead><tr className="border-b text-left text-neutral-500">
          <th className="py-2"><input type="checkbox" checked={allChecked} onChange={() => setSel(allChecked ? new Set() : new Set(orders.map((o) => o.id)))} /></th>
          <th>주문번호</th><th>고객</th><th>제품 · 수량</th><th>구분</th><th>금액</th><th>상태</th><th></th>
        </tr></thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} className="border-b align-top">
              <td className="py-2"><input type="checkbox" checked={sel.has(o.id)} onChange={() => toggle(o.id)} /></td>
              <td className="font-mono text-xs"><Link href={`/admin/orders/${o.id}`} className="text-ink underline-offset-2 hover:underline">{o.order_no}</Link></td>
              <td>{o.customer}</td>
              <td>
                {o.items.length === 0 ? (
                  <span className="text-neutral-400">-</span>
                ) : (
                  <div className="space-y-0.5">
                    {o.items.map((it, i) => (
                      <div key={i}>
                        {it.title} <span className="text-neutral-500">×{it.qty}</span>
                      </div>
                    ))}
                  </div>
                )}
              </td>
              <td>{o.customer_type === "business" ? "기업" : o.customer_type === "guest" ? "비회원" : "일반"}</td>
              <td>{o.currency === "USD" ? `$${o.grand_total}` : formatKRW(o.grand_total)}</td>
              <td>{STATUS[o.status] ?? o.status}</td>
              <td className="text-right">
                {o.status === "paid" && <StatusBtn id={o.id} to="preparing" label="확인" />}
                {o.status === "preparing" && <StatusBtn id={o.id} to="shipped" label="출고" />}
                {o.status === "created" && <span className="text-xs text-neutral-400">결제대기</span>}
              </td>
            </tr>
          ))}
          {orders.length === 0 && <tr><td colSpan={8} className="py-6 text-center text-neutral-400">주문이 없습니다.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function StatusBtn({ id, to, label }: { id: string; to: string; label: string }) {
  return (
    <form action={setOrderStatusAction} className="inline">
      <input type="hidden" name="order_id" value={id} />
      <input type="hidden" name="status" value={to} />
      <button className="rounded border px-3 py-1 text-xs">{label} 처리</button>
    </form>
  );
}
