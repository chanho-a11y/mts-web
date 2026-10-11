"use client";
// D-142 롯데 송장 등록 화면: 엑셀 읽기(브라우저) → 매칭 미리보기(서버) → 연결 수정 → 등록(서버)
import { useMemo, useRef, useState } from "react";
import { parseLotteDetail, lotteTrackingUrl, type WaybillMatch } from "@/lib/lotte";
import {
  previewTrackingAction, confirmTrackingAction,
  type PoolOrder, type ConfirmResultRow,
} from "@/app/admin/orders/tracking/actions";

async function loadSheetJS(): Promise<any> {
  const mod: any = await import("xlsx");
  return mod.default ?? mod;
}

const STATUS: Record<string, string> = { paid: "결제완료", preparing: "확인", shipped: "출고", in_transit: "배송중", delivered: "완료" };
const CONF: Record<WaybillMatch["confidence"], { label: string; cls: string }> = {
  sure: { label: "확실", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  check: { label: "확인 필요", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  none: { label: "미연결", cls: "bg-neutral-50 text-neutral-500 border-neutral-200" },
};

export default function TrackingRegister() {
  const [fileName, setFileName] = useState("");
  const [matches, setMatches] = useState<WaybillMatch[]>([]);
  const [pool, setPool] = useState<PoolOrder[]>([]);
  const [registered, setRegistered] = useState<Record<string, string>>({});
  const [links, setLinks] = useState<Record<string, string[]>>({}); // tracking_no → order ids
  const [sendMail, setSendMail] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [results, setResults] = useState<ConfirmResultRow[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const poolById = useMemo(() => new Map(pool.map((o) => [o.id, o])), [pool]);
  const linkedOrderIds = useMemo(() => new Set(Object.values(links).flat()), [links]);
  const openUnlinked = pool.filter((o) => (o.status === "paid" || o.status === "preparing") && !linkedOrderIds.has(o.id));
  const pairCount = Object.values(links).reduce((s, l) => s + l.length, 0);
  const mailTargets = Array.from(linkedOrderIds).filter((id) => !poolById.get(id)?.notified).length;

  async function onFile(f: File | undefined) {
    if (!f) return;
    setFileName(f.name); setMsg(""); setResults([]); setMatches([]); setBusy(true);
    try {
      const XLSX = await loadSheetJS();
      const wb = XLSX.read(await f.arrayBuffer(), { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "" });
      const { waybills, error } = parseLotteDetail(rows);
      if (error) { setMsg(error); return; }
      const res = await previewTrackingAction(waybills);
      if (!res.ok) { setMsg(res.message ?? "미리보기 실패"); return; }
      setMatches(res.matches); setPool(res.pool); setRegistered(res.registered);
      setLinks(Object.fromEntries(res.matches.map((m) => [m.waybill.tracking_no, m.selected])));
    } catch (e) {
      setMsg(`파일을 읽지 못했습니다: ${(e as Error).message}`);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const add = (tn: string, id: string) => id && setLinks((l) => ({ ...l, [tn]: Array.from(new Set([...(l[tn] ?? []), id])) }));
  const remove = (tn: string, id: string) => setLinks((l) => ({ ...l, [tn]: (l[tn] ?? []).filter((x) => x !== id) }));

  async function submit() {
    const pairs = Object.entries(links).flatMap(([tracking_no, ids]) => ids.map((order_id) => ({ tracking_no, order_id })));
    if (pairs.length === 0) return;
    const ok = window.confirm(
      `${linkedOrderIds.size}개 주문에 송장 ${Object.values(links).filter((l) => l.length).length}개를 등록합니다.\n` +
      (sendMail ? `출고 메일 발송 대상: ${mailTargets}건 (이미 안내된 주문 제외)` : "메일은 보내지 않습니다."),
    );
    if (!ok) return;
    setBusy(true); setMsg("");
    try {
      const res = await confirmTrackingAction({ pairs, sendMail });
      if (!res.ok) { setMsg(res.message ?? "등록 실패"); return; }
      setResults(res.rows); setMatches([]); setLinks({});
    } catch (e) {
      setMsg(`등록 실패: ${(e as Error).message}`);
    } finally { setBusy(false); }
  }

  return (
    <div className="mt-6 space-y-6">
      <div className="flex flex-wrap items-center gap-3 rounded-card border border-line bg-paper p-4">
        <input ref={fileRef} type="file" accept=".xlsx,.xls" disabled={busy} onChange={(e) => onFile(e.target.files?.[0])} className="text-sm" />
        {fileName && <span className="text-xs text-neutral-500">{fileName}</span>}
        {busy && <span className="text-xs text-neutral-500">처리 중…</span>}
      </div>
      {msg && <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{msg}</p>}

      {results.length > 0 && (
        <section>
          <h2 className="mb-2 font-bold">등록 결과</h2>
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-neutral-500"><th className="py-2">주문번호</th><th>운송장</th><th>결과</th><th>메일</th></tr></thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.order_no} className="border-b align-top">
                  <td className="py-2 font-mono text-xs">{r.order_no}</td>
                  <td className="font-mono text-xs">{r.trackings.join(", ")}</td>
                  <td className={r.result === "ok" ? "" : "text-red-600"}>{r.message}</td>
                  <td>{r.mailed ? "발송" : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {matches.length > 0 && (
        <section>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-bold">
              송장 {matches.length}건
              <span className="ml-2 text-sm font-normal text-neutral-500">
                확실 {matches.filter((m) => m.confidence === "sure").length} / 확인 필요 {matches.filter((m) => m.confidence === "check").length} / 미연결 {matches.filter((m) => (links[m.waybill.tracking_no] ?? []).length === 0).length}
              </span>
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead><tr className="border-b text-left text-neutral-500">
                <th className="py-2">운송장</th><th>수하인 / 주문자</th><th>주소 / 상품</th><th>매칭</th><th className="w-[300px]">연결 주문</th>
              </tr></thead>
              <tbody>
                {matches.map((m) => {
                  const w = m.waybill;
                  const linked = links[w.tracking_no] ?? [];
                  const scoreOf = (id: string) => m.candidates.find((c) => c.order_id === id);
                  const options = [...pool].sort((a, b) => (scoreOf(b.id)?.score ?? 0) - (scoreOf(a.id)?.score ?? 0));
                  return (
                    <tr key={w.tracking_no} className="border-b align-top">
                      <td className="py-2 font-mono text-xs">
                        <a href={lotteTrackingUrl(w.tracking_no)} target="_blank" rel="noreferrer" className="hover:underline">{w.tracking_no}</a>
                        {registered[w.tracking_no] && <div className="mt-1 text-[11px] text-neutral-400">이미 등록됨 ({registered[w.tracking_no]})</div>}
                      </td>
                      <td>{w.receiver}{w.orderer && w.orderer !== w.receiver && <div className="text-xs text-neutral-500">주문자 {w.orderer}</div>}</td>
                      <td className="text-xs">{w.address}<div className="text-neutral-500">{w.product}</div></td>
                      <td>
                        <span className={`inline-block rounded-full border px-2 py-0.5 text-[11px] ${CONF[linked.length ? m.confidence === "none" ? "check" : m.confidence : "none"].cls}`}>
                          {CONF[linked.length ? m.confidence === "none" ? "check" : m.confidence : "none"].label}
                        </span>
                      </td>
                      <td>
                        <div className="space-y-1">
                          {linked.map((id) => {
                            const o = poolById.get(id);
                            const c = scoreOf(id);
                            return (
                              <div key={id} className="flex items-start justify-between gap-2 rounded border border-line px-2 py-1">
                                <div className="text-xs">
                                  <span className="font-mono">{o?.order_no}</span> {o?.recipient}{o?.company && o.company !== o.recipient ? ` (${o.company})` : ""}
                                  <div className="text-neutral-500">{o?.region} · {STATUS[o?.status ?? ""] ?? o?.status}{o?.notified ? " · 안내됨" : ""}</div>
                                  {c && <div className="text-neutral-400">{c.reasons.join(", ")}</div>}
                                </div>
                                <button onClick={() => remove(w.tracking_no, id)} className="text-xs text-neutral-400 hover:text-red-600" aria-label="연결 해제">✕</button>
                              </div>
                            );
                          })}
                          <select value="" onChange={(e) => add(w.tracking_no, e.target.value)} className="w-full rounded border px-2 py-1 text-xs">
                            <option value="">+ 주문 연결</option>
                            {options.filter((o) => !linked.includes(o.id)).map((o) => (
                              <option key={o.id} value={o.id}>
                                {scoreOf(o.id) ? "★ " : ""}{o.order_no} {o.recipient}{o.company ? ` (${o.company})` : ""} {o.region}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {openUnlinked.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-2 text-sm font-bold">송장이 연결되지 않은 결제 주문 {openUnlinked.length}건</h3>
              <ul className="space-y-1 text-sm">
                {openUnlinked.map((o) => (
                  <li key={o.id} className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs">{o.order_no}</span>
                    <span>{o.recipient}{o.company ? ` (${o.company})` : ""}</span>
                    <span className="text-xs text-neutral-500">{o.region} · {o.items}</span>
                    <select value="" onChange={(e) => add(e.target.value, o.id)} className="rounded border px-2 py-0.5 text-xs">
                      <option value="">송장 연결…</option>
                      {matches.map((m) => (
                        <option key={m.waybill.tracking_no} value={m.waybill.tracking_no}>{m.waybill.tracking_no} {m.waybill.receiver}</option>
                      ))}
                    </select>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-4 rounded-card border border-line bg-oat p-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={sendMail} onChange={(e) => setSendMail(e.target.checked)} />
              고객에게 출고 메일 발송 (운송장번호와 배송조회 링크 포함, 주문당 1회)
            </label>
            <button disabled={busy || pairCount === 0} onClick={submit} className="rounded-full bg-ink px-5 py-2 text-sm text-oat disabled:opacity-40">
              {linkedOrderIds.size}개 주문 등록{sendMail ? ` (메일 ${mailTargets}건)` : ""}
            </button>
            {!sendMail && <span className="text-xs text-neutral-500">메일 없이 저장한 주문은 이후에도 자동 발송되지 않습니다.</span>}
          </div>
        </section>
      )}
    </div>
  );
}
