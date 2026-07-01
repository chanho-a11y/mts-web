"use client";
import { useEffect, useMemo, useState } from "react";
import { saveCustomerPriceAction } from "@/app/admin/products/actions";

export interface DiscVariant { id: string; sku: string; base_price: number }
export interface DiscCustomer { id: string; name: string | null; email: string }

// 사업자 전용 — 고객별 납품가/할인가 설정 팝업.
// 납품가(원) 또는 할인가(=할인 금액, 원) 한쪽을 입력하면 나머지가 자동 계산됩니다. (기준: 소비자가 base_price)
export default function DiscountModal({
  slug, variants, customers,
}: { slug: string; variants: DiscVariant[]; customers: DiscCustomer[] }) {
  const [open, setOpen] = useState(false);
  const [variantId, setVariantId] = useState(variants[0]?.id ?? "");
  const [supply, setSupply] = useState<string>("");   // 납품가
  const [discount, setDiscount] = useState<string>(""); // 할인가(금액)

  const base = useMemo(() => variants.find((v) => v.id === variantId)?.base_price ?? 0, [variantId, variants]);
  const rate = base > 0 && supply !== "" ? Math.round((1 - Number(supply) / base) * 1000) / 10 : null;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function onSupply(v: string) {
    setSupply(v);
    if (v === "" || base <= 0) { setDiscount(""); return; }
    setDiscount(String(Math.max(0, base - Number(v))));
  }
  function onDiscount(v: string) {
    setDiscount(v);
    if (v === "" || base <= 0) { setSupply(""); return; }
    setSupply(String(Math.max(0, base - Number(v))));
  }

  if (variants.length === 0) {
    return <p className="text-sm text-neutral-400">SKU·가격이 등록된 변형이 없어 할인을 설정할 수 없습니다.</p>;
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="rounded-full bg-ink px-4 py-2 text-sm text-oat hover:bg-[#4A443A]">
        고객별 할인 설정
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/60 p-4" onClick={() => setOpen(false)} role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-card border border-line bg-paper p-6 shadow-card" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-ink">고객별 할인 설정</h3>
              <button type="button" onClick={() => setOpen(false)} className="rounded-full border px-3 py-1 text-sm text-neutral-500">✕</button>
            </div>

            <form action={saveCustomerPriceAction} className="space-y-3 text-sm">
              <input type="hidden" name="slug" value={slug} />

              <label className="block">고객
                <select name="profile_id" required className="mt-1 w-full rounded border px-3 py-2">
                  <option value="">— 고객 선택 —</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.name || "(이름없음)"} · {c.email}</option>)}
                </select>
              </label>

              <label className="block">변형(SKU)
                <select name="variant_id" value={variantId} onChange={(e) => { setVariantId(e.target.value); setSupply(""); setDiscount(""); }} className="mt-1 w-full rounded border px-3 py-2">
                  {variants.map((v) => <option key={v.id} value={v.id}>{v.sku} · 소비자가 {v.base_price.toLocaleString()}원</option>)}
                </select>
              </label>

              <p className="rounded bg-neutral-50 px-3 py-2 text-xs text-neutral-500">기준 소비자가: <b>{base.toLocaleString()}원</b>{rate !== null && <> · 할인율 <b>{rate}%</b></>}</p>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">납품가(원)
                  <input name="price" type="number" value={supply} onChange={(e) => onSupply(e.target.value)} required className="mt-1 w-full rounded border px-3 py-2" placeholder="예: 12000" />
                </label>
                <label className="block">할인가(할인 금액, 원)
                  <input type="number" value={discount} onChange={(e) => onDiscount(e.target.value)} className="mt-1 w-full rounded border px-3 py-2" placeholder="자동 계산" />
                </label>
              </div>

              <label className="block">메모(선택)<input name="note" className="mt-1 w-full rounded border px-3 py-2" placeholder="예: 2026 연간 계약가" /></label>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="rounded-full border px-4 py-2">취소</button>
                <button className="rounded-full bg-ink px-5 py-2 text-oat">저장</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
