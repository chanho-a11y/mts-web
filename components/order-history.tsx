"use client";
import { useState } from "react";
import ReorderButton from "@/components/reorder-button";
import { formatKRW, t, type Locale } from "@/lib/i18n";

export interface HistoryItem { title_snapshot: string | null; sku: string | null; qty: number; unit_price: number; line_total: number }
export interface HistoryOrder {
  order_no: string; status: string; grand_total: number; currency: string; placed_at: string;
  items: HistoryItem[];
}

const STATUS: Record<string, string> = {
  created: "결제대기", paid: "결제완료", preparing: "확인", shipped: "출고", in_transit: "배송중",
  delivered: "완료", cancelled: "취소", refunded: "환불", partial_refunded: "부분취소", expired: "기간만료",
};
const STATUS_EN: Record<string, string> = {
  created: "Pending", paid: "Paid", preparing: "Preparing", shipped: "Shipped", in_transit: "In transit",
  delivered: "Delivered", cancelled: "Cancelled", refunded: "Refunded", partial_refunded: "Partial refund", expired: "Expired",
};

export default function OrderHistory({ orders, locale = "ko" }: { orders: HistoryOrder[]; locale?: Locale }) {
  const tt = t(locale);
  const en = locale === "en";
  const [open, setOpen] = useState<HistoryOrder | null>(null);
  const money = (n: number, cur: string) => (cur === "USD" ? `$${n}` : formatKRW(n));
  const label = (s: string) => (en ? STATUS_EN[s] ?? s : STATUS[s] ?? s);

  if (!orders.length) return <p className="text-neutral-400">{tt.noOrders}</p>;

  return (
    <>
      <ul className="divide-y">
        {orders.map((o) => (
          <li key={o.order_no} className="flex items-center justify-between gap-3 py-2">
            <button type="button" onClick={() => setOpen(o)}
              className="flex flex-1 items-center justify-between gap-3 text-left hover:opacity-70">
              <span className="font-mono text-xs underline-offset-2 hover:underline">{o.order_no}</span>
              <span className="text-xs text-neutral-500">{new Date(o.placed_at).toLocaleDateString(en ? "en-US" : "ko-KR", { timeZone: "Asia/Seoul" })}</span>
              <span className="text-xs">{label(o.status)}</span>
              <span className="min-w-[80px] text-right">{money(o.grand_total, o.currency)}</span>
            </button>
            <ReorderButton orderNo={o.order_no} locale={locale} />
          </li>
        ))}
      </ul>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(null)}>
          <div className="max-h-[80vh] w-full max-w-md overflow-auto rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-start justify-between">
              <div>
                <p className="font-mono text-xs text-neutral-500">{open.order_no}</p>
                <p className="text-sm">{new Date(open.placed_at).toLocaleString(en ? "en-US" : "ko-KR", { timeZone: "Asia/Seoul" })} · {label(open.status)}</p>
              </div>
              <button onClick={() => setOpen(null)} className="text-neutral-400 hover:text-black" aria-label="close">✕</button>
            </div>

            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-neutral-400">
                <th className="py-1">{en ? "Item" : "제품"}</th><th className="text-center">{en ? "Qty" : "수량"}</th><th className="text-right">{en ? "Amount" : "금액"}</th>
              </tr></thead>
              <tbody>
                {open.items.map((it, i) => (
                  <tr key={i} className="border-b">
                    <td className="py-1.5">{it.title_snapshot ?? it.sku ?? "-"}</td>
                    <td className="text-center">{it.qty}</td>
                    <td className="text-right">{money(it.line_total, open.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-3 flex items-center justify-between border-t pt-3">
              <span className="font-bold">{en ? "Total" : "합계"} {money(open.grand_total, open.currency)}</span>
              <ReorderButton orderNo={open.order_no} locale={locale} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
