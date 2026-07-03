"use client";
import { useEffect, useState } from "react";

// 제품 일괄 작업 바 — 행의 input.bulk-prod 체크박스를 읽어 보관/복원/삭제/유형변경.
export default function BulkProductBar({ showArchived, categories }: {
  showArchived: boolean;
  categories: { slug: string; name: string }[];
}) {
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [cat, setCat] = useState(categories[0]?.slug ?? "");

  const boxes = () => Array.from(document.querySelectorAll<HTMLInputElement>("input.bulk-prod"));
  const refresh = () => setCount(boxes().filter((b) => b.checked).length);

  useEffect(() => {
    const h = (e: Event) => { if ((e.target as HTMLElement)?.classList?.contains("bulk-prod")) refresh(); };
    document.addEventListener("change", h);
    return () => document.removeEventListener("change", h);
  }, []);

  function toggleAll(e: React.ChangeEvent<HTMLInputElement>) {
    const on = e.target.checked;
    boxes().forEach((b) => { b.checked = on; });
    refresh();
  }

  async function run(action: "archive" | "restore" | "delete" | "settype", extra: Record<string, string> = {}) {
    const slugs = boxes().filter((b) => b.checked).map((b) => b.value);
    if (!slugs.length) return;
    const label = action === "delete" ? "삭제" : action === "archive" ? "보관" : action === "restore" ? "게시" : "유형변경";
    if (!confirm(`선택한 제품 ${slugs.length}개를 ${label}할까요?` + (action === "delete" ? "\n(주문에 사용된 제품은 완전삭제 대신 보관 처리됩니다)" : ""))) return;
    setBusy(true);
    try {
      const r = await fetch("/api/admin/products/bulk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, slugs, ...extra }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "실패");
      location.reload();
    } catch (e) { alert(e instanceof Error ? e.message : "실패"); setBusy(false); }
  }

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border bg-neutral-50 px-3 py-2 text-sm">
      <label className="flex items-center gap-1"><input type="checkbox" onChange={toggleAll} /> 전체선택</label>
      <span className="text-neutral-500">선택 {count}개</span>
      <span className="flex-1" />
      {!showArchived && (
        <span className="flex items-center gap-1">
          <select value={cat} onChange={(e) => setCat(e.target.value)} className="rounded border px-2 py-1 text-xs">
            {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
          </select>
          <button disabled={busy || !count} onClick={() => run("settype", { category: cat })} className="rounded-full border px-3 py-1 disabled:opacity-40">유형변경</button>
        </span>
      )}
      <button disabled={busy || !count} onClick={() => run("restore")} className="rounded-full border px-3 py-1 disabled:opacity-40" title="선택 제품을 발행(활성) 상태로">일괄 게시</button>
      <button disabled={busy || !count} onClick={() => run("archive")} className="rounded-full border px-3 py-1 disabled:opacity-40" title="선택 제품을 보관(스토어프론트 숨김)">일괄 보관</button>
      <button disabled={busy || !count} onClick={() => run("delete")} className="rounded-full border border-red-200 px-3 py-1 text-red-600 disabled:opacity-40">일괄 삭제</button>
    </div>
  );
}
