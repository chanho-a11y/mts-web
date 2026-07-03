"use client";
import { useState } from "react";

type Target = "product" | "category";
type Mode = "amount" | "percent";
interface Row { target: Target; product_slug: string; category: string; mode: Mode; value: string }

export default function CustomerDiscountForm({ profileId, products, categories }: {
  profileId: string;
  products: { slug: string; title: string }[];
  categories: { slug: string; name: string }[];
}) {
  const blank = (): Row => ({ target: "product", product_slug: products[0]?.slug ?? "", category: categories[0]?.slug ?? "", mode: "percent", value: "" });
  const [rows, setRows] = useState<Row[]>([blank()]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const up = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const add = () => setRows((rs) => [...rs, blank()]);
  const remove = (i: number) => setRows((rs) => (rs.length > 1 ? rs.filter((_, j) => j !== i) : rs));

  async function save() {
    const items = rows
      .filter((r) => Number(r.value) > 0)
      .map((r) => ({
        target: r.target,
        product_slug: r.target === "product" ? r.product_slug : undefined,
        category: r.target === "category" ? r.category : undefined,
        mode: r.mode, value: Number(r.value),
      }));
    if (!items.length) { setMsg("할인 값을 입력하세요"); return; }
    setBusy(true); setMsg("저장 중…");
    try {
      const res = await fetch("/api/admin/customers/discounts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profile_id: profileId, items }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "실패");
      setMsg(`적용 완료 · 할인 ${j.applied}건 · 변형 ${j.variantsSet}개`);
      location.reload();
    } catch (e) { setMsg(e instanceof Error ? e.message : "실패"); setBusy(false); }
  }

  const sel = "rounded border px-2 py-1.5 text-sm";
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={i} className="flex flex-wrap items-end gap-2 rounded-lg border bg-neutral-50 p-2">
          <label className="text-xs text-neutral-500">할인 대상
            <select value={r.target} onChange={(e) => up(i, { target: e.target.value as Target })} className={`mt-0.5 block ${sel}`}>
              <option value="product">제품 할인</option>
              <option value="category">카테고리 할인</option>
            </select>
          </label>
          {r.target === "product" ? (
            <label className="text-xs text-neutral-500">제품
              <select value={r.product_slug} onChange={(e) => up(i, { product_slug: e.target.value })} className={`mt-0.5 block ${sel}`} style={{ maxWidth: 220 }}>
                {products.map((p) => <option key={p.slug} value={p.slug}>{p.title}</option>)}
              </select>
            </label>
          ) : (
            <label className="text-xs text-neutral-500">카테고리
              <select value={r.category} onChange={(e) => up(i, { category: e.target.value })} className={`mt-0.5 block ${sel}`}>
                {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
              </select>
            </label>
          )}
          <label className="text-xs text-neutral-500">할인 방식
            <select value={r.mode} onChange={(e) => up(i, { mode: e.target.value as Mode })} className={`mt-0.5 block ${sel}`}>
              <option value="amount">할인 금액(원)</option>
              <option value="percent">할인율(%)</option>
            </select>
          </label>
          <label className="text-xs text-neutral-500">값
            <input type="number" step="1" min="0" value={r.value} onChange={(e) => up(i, { value: e.target.value })}
              placeholder={r.mode === "amount" ? "예: 1000" : "예: 15"} className={`mt-0.5 block ${sel}`} style={{ width: 110 }} />
          </label>
          <button type="button" onClick={() => remove(i)} disabled={rows.length <= 1} className="rounded-full border px-2.5 py-1.5 text-xs text-red-500 disabled:opacity-30" title="이 할인 제거">✕</button>
        </div>
      ))}
      <div className="flex items-center gap-3">
        <button type="button" onClick={add} className="rounded-full border px-4 py-1.5 text-sm hover:bg-neutral-100">＋ 할인 추가</button>
        <button type="button" onClick={save} disabled={busy} className="rounded-full bg-black px-5 py-1.5 text-sm text-white disabled:opacity-40">{busy ? "저장 중…" : "저장"}</button>
        {msg && <span className="text-xs text-neutral-500">{msg}</span>}
      </div>
      <p className="text-[11px] text-neutral-400">카테고리·제품 할인은 해당 변형들의 개별가로 환산되어 저장됩니다. 정가/등급가보다 우선 적용(resolve_price).</p>
    </div>
  );
}
