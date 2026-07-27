"use client";
import { useEffect, useState } from "react";

type BulkAction = "archive" | "restore" | "delete" | "settype" | "setstatus";

// 제품 일괄 작업 바 — 행의 input.bulk-prod 체크박스를 읽어 발행/초안/보관/복원/삭제/유형변경.
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

  function actionLabel(action: BulkAction, extra: Record<string, string>) {
    if (action === "delete") return "삭제";
    if (action === "archive") return "보관";
    if (action === "restore") return "게시";
    if (action === "settype") return "유형변경";
    return extra.status === "draft" ? "초안으로 변경" : "발행";
  }

  async function run(action: BulkAction, extra: Record<string, string> = {}) {
    const slugs = boxes().filter((b) => b.checked).map((b) => b.value);
    if (!slugs.length) return;
    const label = actionLabel(action, extra);
    const note = action === "delete"
      ? "\n(주문에 사용된 제품은 완전삭제 대신 보관 처리됩니다)"
      : action === "setstatus" && extra.status === "draft"
        ? "\n(초안 = 스토어프론트에서 숨김 · 관리자에서는 계속 보임)"
        : "";
    if (!confirm(`선택한 제품 ${slugs.length}개를 ${label}할까요?` + note)) return;
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
        <>
          <span className="flex items-center gap-1">
            <select value={cat} onChange={(e) => setCat(e.target.value)} className="rounded border px-2 py-1 text-xs">
              {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
            </select>
            <button disabled={busy || !count} onClick={() => run("settype", { category: cat })} className="rounded-full border px-3 py-1 disabled:opacity-40">유형변경</button>
          </span>
          <span className="flex items-center gap-1 rounded-full border border-neutral-300 bg-white px-2 py-0.5">
            <span className="text-xs text-neutral-400">상태</span>
            <button disabled={busy || !count} onClick={() => run("setstatus", { status: "active" })} className="rounded-full bg-black px-3 py-1 text-xs text-white disabled:opacity-40" title="선택 제품을 발행(active) — 스토어프론트 노출">발행</button>
            <button disabled={busy || !count} onClick={() => run("setstatus", { status: "draft" })} className="rounded-full border px-3 py-1 text-xs disabled:opacity-40" title="선택 제품을 초안(draft) — 스토어프론트 숨김">초안</button>
          </span>
        </>
      )}
      {showArchived && (
        <button disabled={busy || !count} onClick={() => run("restore")} className="rounded-full border px-3 py-1 disabled:opacity-40" title="선택 제품을 발행(활성) 상태로 복구">일괄 복구(발행)</button>
      )}
      {!showArchived && (
        <button disabled={busy || !count} onClick={() => run("archive")} className="rounded-full border px-3 py-1 disabled:opacity-40" title="선택 제품을 보관(스토어프론트 숨김)">일괄 보관</button>
      )}
      <button disabled={busy || !count} onClick={() => run("delete")} className="rounded-full border border-red-200 px-3 py-1 text-red-600 disabled:opacity-40">일괄 삭제</button>
    </div>
  );
}
