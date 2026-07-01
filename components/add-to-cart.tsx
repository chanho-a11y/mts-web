"use client";
import { useState } from "react";
import { useCart } from "@/components/cart-provider";
import { formatKRW, t, type Locale } from "@/lib/i18n";

interface V { id: string; base_price: number; option: string | null; }
export default function AddToCart({
  slug, title, image, variants, label, locale = "ko",
}: { slug: string; title: string; image: string | null; variants: V[]; label: string; locale?: Locale }) {
  const { add } = useCart();
  const tt = t(locale);
  const [vid, setVid] = useState(variants[0]?.id);
  const [qty, setQty] = useState(1);
  const [done, setDone] = useState(false);
  const v = variants.find((x) => x.id === vid) ?? variants[0];
  if (!v) return null;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {variants.length > 1 && (
        <select value={vid} onChange={(e) => setVid(e.target.value)} className="rounded-card border border-line bg-paper px-3 py-2 text-sm">
          {variants.map((x) => <option key={x.id} value={x.id}>{x.option ?? tt.optionDefault} · {formatKRW(x.base_price)}</option>)}
        </select>
      )}
      <input type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, +e.target.value))}
        className="w-16 rounded-card border border-line bg-paper px-2 py-2 text-sm" />
      <button
        onClick={() => { add({ variantId: v.id, slug, title, option: v.option, price: v.base_price, image, qty }); setDone(true); setTimeout(() => setDone(false), 1500); }}
        className="rounded-card bg-ink px-6 py-3 text-sm font-semibold tracking-wide text-oat hover:bg-[#4A443A]">
        {done ? tt.addedToCart : label}
      </button>
    </div>
  );
}
