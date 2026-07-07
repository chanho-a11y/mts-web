"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatKRW } from "@/lib/i18n";
import { cancelOrderAction } from "@/app/admin/orders/actions";

interface PanelItem { id: string; title: string; unit_price: number; qty: number; cancelled_qty: number; currency: string }

function money(a: number, cur: string) { return cur === "USD" ? `$${a}` : formatKRW(a); }

export default function OrderCancelPanel({ orderId, items, remaining, currency }: {
  orderId: string; items: PanelItem[]; remaining: number; currency: string;
}) {
  const router = useRouter();
  const [qty, setQty] = useState<Record<string, number>>({});
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const avail = (it: PanelItem) => it.qty - it.cancelled_qty;
  const selectedAmount = items.reduce((s, it) => s + it.unit_price * (qty[it.id] || 0), 0);
  const anySelected = selectedAmount > 0;

  function setQ(id: string, v: number, max: number) {
    const n = Math.max(0, Math.min(max, Math.floor(v || 0)));
    setQty((q) => ({ ...q, [id]: n }));
  }

  async function run(mode: "full" | "partial") {
    if (busy) return;
    const confirmMsg = mode === "full"
      ? `잔여 전액(${money(remaining, currency)})을 이니시스에서 취소합니다. 진행할까요?`
      : `선택 품목 ${money(selectedAmount, currency)}을 부분취소합니다. 진행할까요?`;
    if (!window.confirm(confirmMsg)) return;
    setBusy(true); setMsg(null);
    const items_ = mode === "partial"
      ? items.filter((it) => (qty[it.id] || 0) > 0).map((it) => ({ order_item_id: it.id, qty: qty[it.id] }))
      : undefined;
    const res = await cancelOrderAction({ order_id: orderId, mode, items: items_, reason: reason.trim() || undefined });
    setMsg(res.message);
    setBusy(false);
    if (res.ok) { setQty({}); setReason(""); router.refresh(); }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-neutral-500">부분취소는 품목별 수량을 선택하면 금액이 자동 계산됩니다. 취소 성공 시 이니시스 승인취소 → 취소이력 기록 → (출고된 건) 재고 자동복원.</p>

      <table className="w-full text-sm">
        <thead><tr className="border-b text-left text-neutral-400">
          <th className="py-1">품목</th><th>단가</th><th>취소가능</th><th>취소수량</th><th className="text-right">취소액</th>
        </tr></thead>
        <tbody>
          {items.map((it) => {
            const max = avail(it);
            const q = qty[it.id] || 0;
            return (
              <tr key={it.id} className="border-b">
                <td className="py-1.5">{it.title}</td>
                <td>{money(it.unit_price, currency)}</td>
                <td>{max}</td>
                <td>
                  <div className="inline-flex items-center gap-1">
                    <button type="button" disabled={busy || max === 0} onClick={() => setQ(it.id, q - 1, max)} className="h-6 w-6 rounded border disabled:opacity-30">−</button>
                    <input type="number" min={0} max={max} value={q} disabled={busy || max === 0}
                      onChange={(e) => setQ(it.id, Number(e.target.value), max)}
                      className="w-14 rounded border px-2 py-0.5 text-center" />
                    <button type="button" disabled={busy || q >= max} onClick={() => setQ(it.id, q + 1, max)} className="h-6 w-6 rounded border disabled:opacity-30">+</button>
                  </div>
                </td>
                <td className="text-right">{q > 0 ? money(it.unit_price * q, currency) : "-"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <label className="block text-sm">취소 사유
        <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={80} placeholder="예: 고객 요청, 재고 부족"
          className="mt-1 w-full rounded border px-3 py-2 text-sm" />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={busy || !anySelected} onClick={() => run("partial")}
          className="rounded-full border px-4 py-2 text-sm disabled:opacity-40">
          부분 취소{anySelected ? ` (${money(selectedAmount, currency)})` : ""}
        </button>
        <button type="button" disabled={busy} onClick={() => run("full")}
          className="rounded-full bg-red-600 px-4 py-2 text-sm text-white disabled:opacity-40">
          전체 취소 ({money(remaining, currency)})
        </button>
        {busy && <span className="text-sm text-neutral-400">처리 중…</span>}
      </div>

      {msg && <p className="rounded bg-neutral-100 p-3 text-sm">{msg}</p>}
    </div>
  );
}
