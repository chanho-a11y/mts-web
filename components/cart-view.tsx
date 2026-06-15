"use client";
import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/components/cart-provider";
import { subtotal, tipAmount, TIP_PERCENTS } from "@/lib/cart";
import { formatKRW } from "@/lib/i18n";

export default function CartView({ showTip }: { showTip: boolean }) {
  const { items, setQty, remove } = useCart();
  const [tipPct, setTipPct] = useState(0);
  const [customTip, setCustomTip] = useState("");

  if (items.length === 0)
    return <p className="py-16 text-center text-neutral-500">장바구니가 비어 있습니다. <Link href="/collections/all" className="underline">쇼핑하기</Link></p>;

  const sub = subtotal(items);
  const pct = customTip ? Math.max(0, Math.min(100, +customTip)) : tipPct;
  const tip = showTip ? tipAmount(items, pct) : 0;
  const total = sub + tip;

  return (
    <div className="grid gap-8 md:grid-cols-3">
      <div className="md:col-span-2">
        {items.map((i) => (
          <div key={i.variantId} className="flex items-center gap-4 border-b py-4">
            <div className="flex-1">
              <p className="text-sm font-medium">{i.title}</p>
              {i.option && <p className="text-xs text-neutral-500">{i.option}</p>}
              <p className="text-sm">{formatKRW(i.price)}</p>
            </div>
            <input type="number" min={1} value={i.qty} onChange={(e) => setQty(i.variantId, +e.target.value)}
              className="w-16 rounded border px-2 py-1 text-sm" />
            <button onClick={() => remove(i.variantId)} className="text-xs text-neutral-400">삭제</button>
          </div>
        ))}
      </div>

      <aside className="h-fit rounded-xl border p-5 text-sm">
        <div className="flex justify-between py-1"><span>소계</span><span>{formatKRW(sub)}</span></div>

        {showTip && (
          <div className="mt-3">
            <p className="mb-2 text-xs text-neutral-500">팁 (바리스타·로스터 응원)</p>
            <div className="flex flex-wrap gap-2">
              {TIP_PERCENTS.map((p) => (
                <button key={p} onClick={() => { setTipPct(p); setCustomTip(""); }}
                  className={`rounded-full border px-3 py-1 text-xs ${pct === p && !customTip ? "border-black bg-black text-white" : ""}`}>{p}%</button>
              ))}
              <button onClick={() => { setTipPct(0); setCustomTip(""); }}
                className={`rounded-full border px-3 py-1 text-xs ${pct === 0 ? "border-black" : ""}`}>없음</button>
              <input value={customTip} onChange={(e) => setCustomTip(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="직접%" className="w-16 rounded border px-2 py-1 text-xs" />
            </div>
            {tip > 0 && <div className="mt-2 flex justify-between"><span>팁 ({pct}%)</span><span>{formatKRW(tip)}</span></div>}
          </div>
        )}

        <div className="mt-3 flex justify-between border-t pt-3 font-bold"><span>합계</span><span>{formatKRW(total)}</span></div>
        <p className="mt-1 text-xs text-neutral-400">배송비는 체크아웃에서 계산됩니다.</p>
        <Link href={`/checkout?tip=${tip}`} className="mt-4 block rounded-full bg-black py-3 text-center text-white">체크아웃</Link>
      </aside>
    </div>
  );
}
