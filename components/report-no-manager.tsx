"use client";
import { useEffect, useState } from "react";

interface Row { id?: string; report_no: string; product_name: string; material: string; origin?: string | null; position?: number }

const EMPTY: Row = { report_no: "", product_name: "", material: "커피원두(100%)", origin: "", position: 999 };

// 품목보고번호 관리 — 제품 관리 페이지의 버튼으로 열리는 팝업(테이블·추가/변경/삭제).
// 여기서 저장한 마스터는 제품 등록/수정 폼의 '품목보고번호(라벨)' 드롭다운과 레이블 스튜디오에 연결된다.
export default function ReportNoManager() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [edit, setEdit] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function load() {
    setBusy(true); setMsg("");
    try {
      const r = await fetch("/api/admin/report-nos", { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "불러오기 실패");
      setRows(j.items ?? []);
    } catch (e: any) { setMsg(e?.message ?? "불러오기 실패"); }
    finally { setBusy(false); }
  }

  useEffect(() => { if (open) load(); }, [open]);

  async function save() {
    if (!edit) return;
    if (!edit.report_no.replace(/\s+/g, "").trim()) { setMsg("품목보고번호를 입력하세요"); return; }
    setBusy(true); setMsg("");
    try {
      const r = await fetch("/api/admin/report-nos", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(edit),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "저장 실패");
      setEdit(null); await load();
    } catch (e: any) { setMsg(e?.message ?? "저장 실패"); }
    finally { setBusy(false); }
  }

  async function del(id?: string) {
    if (!id || !confirm("이 품목보고번호를 삭제할까요? (이미 사용 중인 제품에는 영향 없음)")) return;
    setBusy(true); setMsg("");
    try {
      const r = await fetch("/api/admin/report-nos", {
        method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "삭제 실패");
      await load();
    } catch (e: any) { setMsg(e?.message ?? "삭제 실패"); }
    finally { setBusy(false); }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="rounded-full border px-4 py-2 text-sm hover:bg-neutral-100">품목보고번호 관리</button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4" onClick={() => { setOpen(false); setEdit(null); }}>
          <div className="mt-10 w-full max-w-3xl rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">품목보고번호 관리</h2>
                <p className="text-xs text-neutral-500">식약처 품목보고 정본 · 제품 등록/수정·레이블 원재료명과 연동됩니다.</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEdit({ ...EMPTY, position: (rows.length ? Math.max(...rows.map((r) => r.position ?? 0)) : 0) + 1 })} className="rounded-full bg-black px-3 py-1.5 text-xs text-white">+ 추가</button>
                <button onClick={() => { setOpen(false); setEdit(null); }} className="rounded-full border px-3 py-1.5 text-xs">닫기</button>
              </div>
            </div>

            {edit && (
              <div className="mb-4 grid grid-cols-2 gap-2 rounded-lg border bg-neutral-50 p-3 sm:grid-cols-4">
                <label className="col-span-2 text-xs sm:col-span-1">품목보고번호*
                  <input value={edit.report_no} onChange={(e) => setEdit({ ...edit, report_no: e.target.value })} placeholder="20220264913101" className="mt-1 w-full rounded border px-2 py-1.5 text-sm" />
                </label>
                <label className="col-span-2 text-xs sm:col-span-1">제품명(참고)
                  <input value={edit.product_name} onChange={(e) => setEdit({ ...edit, product_name: e.target.value })} placeholder="에티오피아 싱글오리진" className="mt-1 w-full rounded border px-2 py-1.5 text-sm" />
                </label>
                <label className="col-span-2 text-xs">원재료명
                  <input value={edit.material} onChange={(e) => setEdit({ ...edit, material: e.target.value })} placeholder="커피원두(100%)" className="mt-1 w-full rounded border px-2 py-1.5 text-sm" />
                </label>
                <div className="col-span-2 flex items-end justify-end gap-2 sm:col-span-4">
                  <button onClick={() => setEdit(null)} className="rounded-full border px-4 py-1.5 text-xs">취소</button>
                  <button onClick={save} disabled={busy} className="rounded-full bg-black px-4 py-1.5 text-xs text-white disabled:opacity-40">{busy ? "저장 중…" : "저장"}</button>
                </div>
              </div>
            )}

            {msg && <p className="mb-2 text-xs text-red-600">{msg}</p>}

            <div className="max-h-[55vh] overflow-y-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left text-neutral-500"><th className="py-2">품목보고번호</th><th>제품명</th><th>원재료명</th><th className="text-right">관리</th></tr></thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b align-top">
                      <td className="py-2 font-mono text-xs">{r.report_no}</td>
                      <td>{r.product_name}</td>
                      <td className="text-xs text-neutral-600">{r.material}</td>
                      <td className="text-right">
                        <div className="inline-flex gap-1">
                          <button onClick={() => setEdit({ ...r })} className="rounded border px-2 py-1 text-xs hover:bg-neutral-100">수정</button>
                          <button onClick={() => del(r.id)} className="rounded border px-2 py-1 text-xs text-red-500 hover:bg-red-50">삭제</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && !busy && <tr><td colSpan={4} className="py-6 text-center text-xs text-neutral-400">등록된 품목보고번호가 없습니다.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
