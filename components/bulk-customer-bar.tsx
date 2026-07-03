"use client";
import { useEffect, useState } from "react";

// 고객 일괄 작업 바 — 행의 input.bulk-cust 체크박스를 읽어 보관/복원/삭제.
export default function BulkCustomerBar({ showArchived }: { showArchived: boolean }) {
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [role, setRole] = useState<"business" | "individual">("business");

  const boxes = () => Array.from(document.querySelectorAll<HTMLInputElement>("input.bulk-cust"));
  const refresh = () => setCount(boxes().filter((b) => b.checked).length);

  useEffect(() => {
    const h = (e: Event) => { if ((e.target as HTMLElement)?.classList?.contains("bulk-cust")) refresh(); };
    document.addEventListener("change", h);
    return () => document.removeEventListener("change", h);
  }, []);

  function toggleAll(e: React.ChangeEvent<HTMLInputElement>) {
    const on = e.target.checked;
    boxes().forEach((b) => { b.checked = on; });
    refresh();
  }

  async function run(action: "archive" | "restore" | "delete" | "setrole", extra: Record<string, string> = {}) {
    const ids = boxes().filter((b) => b.checked).map((b) => b.value);
    if (!ids.length) return;
    const label = action === "delete" ? "삭제" : action === "archive" ? "보관" : action === "restore" ? "복원" : "구분 변경";
    if (!confirm(`선택한 고객 ${ids.length}명을 ${label}할까요?` + (action === "delete" ? "\n(주문 이력이 있으면 완전삭제 대신 보관 처리됩니다)" : ""))) return;
    setBusy(true);
    try {
      const r = await fetch("/api/admin/customers/bulk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ids, ...extra }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "실패");
      location.reload();
    } catch (e) { alert(e instanceof Error ? e.message : "실패"); setBusy(false); }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-neutral-50 px-3 py-2 text-sm">
      <label className="flex items-center gap-1"><input type="checkbox" onChange={toggleAll} /> 전체선택</label>
      <span className="text-neutral-500">선택 {count}명</span>
      <span className="flex-1" />
      {!showArchived && (
        <span className="flex items-center gap-1">
          <select value={role} onChange={(e) => setRole(e.target.value as "business" | "individual")} className="rounded border px-2 py-1 text-xs">
            <option value="business">사업자</option>
            <option value="individual">개인</option>
          </select>
          <button disabled={busy || !count} onClick={() => run("setrole", { role })} className="rounded-full border px-3 py-1 disabled:opacity-40">구분 변경</button>
        </span>
      )}
      {showArchived
        ? <button disabled={busy || !count} onClick={() => run("restore")} className="rounded-full border px-3 py-1 disabled:opacity-40">일괄 복원</button>
        : <button disabled={busy || !count} onClick={() => run("archive")} className="rounded-full border px-3 py-1 disabled:opacity-40">일괄 보관</button>}
      <button disabled={busy || !count} onClick={() => run("delete")} className="rounded-full border border-red-200 px-3 py-1 text-red-600 disabled:opacity-40">일괄 삭제</button>
    </div>
  );
}
