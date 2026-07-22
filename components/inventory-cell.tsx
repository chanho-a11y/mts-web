"use client";
import { useState, useTransition } from "react";
import { setStockAction } from "@/app/admin/products/actions";
import { adminToast } from "@/components/admin-toast";

// 제품 관리 테이블 인라인 재고 입력 — 절대값 입력 후 Enter/포커스 아웃 시 자동 저장.
// 서버에서 현재고 대비 delta 를 계산해 inventory_ledger 에 기록(reason: 'adjust').
export default function InventoryCell({ variantId, sku, initial }: { variantId: string; sku: string; initial: number }) {
  const [val, setVal] = useState(String(initial));
  const [saved, setSaved] = useState(initial);
  const [pending, startTransition] = useTransition();

  function save() {
    const n = parseInt(val, 10);
    if (isNaN(n) || n < 0) { setVal(String(saved)); return; }
    if (n === saved) return;
    startTransition(async () => {
      const res = await setStockAction(variantId, n);
      if (res.ok) {
        setSaved(res.stock);
        setVal(String(res.stock));
        adminToast(`재고 저장됨 — ${sku}: ${res.stock.toLocaleString()}`);
      } else {
        setVal(String(saved));
        adminToast(res.error ?? "재고 저장 실패");
      }
    });
  }

  return (
    <input
      type="number"
      min={0}
      value={val}
      disabled={pending}
      onChange={(e) => setVal(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
      title={`${sku} 현재고 — 수정 후 Enter 또는 칸 밖 클릭 시 저장`}
      className={`w-20 rounded border px-2 py-1 text-right text-xs tabular-nums ${pending ? "opacity-50" : ""} ${Number(val) !== saved ? "border-amber-400 bg-amber-50" : ""}`}
    />
  );
}
