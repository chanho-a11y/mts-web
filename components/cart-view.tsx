"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useCart } from "@/components/cart-provider";
import { TIP_PERCENTS } from "@/lib/cart";
import { resolveCartPricesAction } from "@/app/checkout/price-actions";
import { formatKRW, t, type Locale } from "@/lib/i18n";

export default function CartView({ showTip, locale = "ko" }: { showTip: boolean; locale?: Locale }) {
  const { items, setQty, remove } = useCart();
  const tt = t(locale);
  const [tipPct, setTipPct] = useState(0);
  const [customTip, setCustomTip] = useState("");
  // 로그인 고객의 개별가/등급가 실적용가 맵 (없으면 담을 때 저장된 정가로 폴백)
  const [priceMap, setPriceMap] = useState<Record<string, number>>({});

  const itemsSig = items.map((i) => i.variantId).join(",");
  useEffect(() => {
    if (items.length === 0) { setPriceMap({}); return; }
    let alive = true;
    resolveCartPricesAction(items.map((i) => ({ variantId: i.variantId })))
      .then((m) => { if (alive) setPriceMap(m); })
      .catch(() => { /* 실패 시 저장된 정가로 표시 (주문 시 서버가 재계산) */ });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsSig]);

  if (items.length === 0)
    return <p className="py-16 text-center text-neutral-500">{tt.cartEmpty} <Link href="/collections/all" className="underline">{tt.goShopping}</Link></p>;

  const eff = (variantId: string, fallback: number) => priceMap[variantId] ?? fallback;
  const sub = items.reduce((s, i) => s + eff(i.variantId, i.price) * i.qty, 0);
  const pct = customTip ? Math.max(0, Math.min(100, +customTip)) : tipPct;
  const tip = showTip ? Math.round((sub * pct) / 100) : 0;
  const total = sub + tip;

  return (
    <div className="grid gap-8 md:grid-cols-3">
      <div className="md:col-span-2">
        {items.map((i) => {
          const price = eff(i.variantId, i.price);
          const discounted = price < i.price;
          return (
            <div key={i.variantId} className="flex items-center gap-4 border-b py-4">
              <div className="flex-1">
                <p className="text-sm font-medium">{i.title}</p>
                {i.option && <p className="text-xs text-neutral-500">{i.option}</p>}
                <p className="text-sm">
                  {discounted ? (
                    <><span className="text-neutral-400 line-through">{formatKRW(i.price)}</span> <span className="font-medium">{formatKRW(price)}</span></>
                  ) : formatKRW(price)}
                </p>
              </div>
              <input type="number" min={1} value={i.qty} onChange={(e) => setQty(i.variantId, +e.target.value)}
                className="w-16 rounded border px-2 py-1 text-sm" />
              <button onClick={() => remove(i.variantId)} className="text-xs text-neutral-400">{tt.remove}</button>
            </div>
          );
        })}
      </div>

      <aside className="h-fit rounded-xl border p-5 text-sm">
        <div className="flex justify-between py-1"><span>{tt.subtotalLabel}</span><span>{formatKRW(sub)}</span></div>

        {showTip && (
          <div className="mt-3">
            <p className="mb-2 text-xs text-neutral-500">{tt.tipLabel}</p>
            <div className="flex flex-wrap gap-2">
              {TIP_PERCENTS.map((p) => (
                <button key={p} onClick={() => { setTipPct(p); setCustomTip(""); }}
                  className={`rounded-full border px-3 py-1 text-xs ${pct === p && !customTip ? "border-black bg-black text-white" : ""}`}>{p}%</button>
              ))}
              <button onClick={() => { setTipPct(0); setCustomTip(""); }}
                className={`rounded-full border px-3 py-1 text-xs ${pct === 0 ? "border-black" : ""}`}>{tt.tipNone}</button>
              <input value={customTip} onChange={(e) => setCustomTip(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder={tt.tipCustom} className="w-16 rounded border px-2 py-1 text-xs" />
            </div>
            {tip > 0 && <div className="mt-2 flex justify-between"><span>{tt.tipWord} ({pct}%)</span><span>{formatKRW(tip)}</span></div>}
          </div>
        )}

        <div className="mt-3 flex justify-between border-t pt-3 font-bold"><span>{tt.totalLabel}</span><span>{formatKRW(total)}</span></div>
        <p className="mt-1 text-xs text-neutral-400">{tt.shippingCalcCheckout}</p>
        <Link href={`/checkout?tip=${tip}`} className="mt-4 block rounded-full bg-black py-3 text-center text-white">{tt.checkout}</Link>
      </aside>
    </div>
  );
}
