"use client";
import { useState } from "react";

// 다중 이미지 첨부(홈 슬라이드 등) — 여러 장 업로드/순서 관리. hidden input[name]에 줄바꿈 구분 URL로 저장.
export default function MultiImageUpload({
  name, defaultValue = "", folder = "slides", label = "이미지 슬라이드",
}: { name: string; defaultValue?: string; folder?: string; label?: string }) {
  const init = defaultValue.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
  const [urls, setUrls] = useState<string[]>(init);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function add(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setBusy(true); setErr("");
    try {
      const added: string[] = [];
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file); fd.append("folder", folder);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const j = await res.json();
        if (!res.ok) throw new Error(j.error || "업로드 실패");
        added.push(j.url);
      }
      setUrls((prev) => [...prev, ...added]);
    } catch (e: any) { setErr(e?.message ?? "업로드 실패"); }
    finally { setBusy(false); e.target.value = ""; }
  }
  const remove = (i: number) => setUrls((prev) => prev.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) => setUrls((prev) => {
    const next = [...prev]; const j = i + dir;
    if (j < 0 || j >= next.length) return prev;
    [next[i], next[j]] = [next[j], next[i]]; return next;
  });

  return (
    <div className="text-sm">
      <div className="mb-1 font-medium">{label} <span className="font-normal text-neutral-400">(여러 장 · 순서 조정 가능)</span></div>
      <div className="flex flex-wrap gap-2">
        {urls.map((u, i) => (
          <div key={i} className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={u} alt="" className="h-20 w-20 rounded border object-cover" />
            <div className="mt-1 flex justify-center gap-1 text-[10px]">
              <button type="button" onClick={() => move(i, -1)} className="rounded border px-1">←</button>
              <button type="button" onClick={() => remove(i)} className="rounded border px-1 text-red-500">✕</button>
              <button type="button" onClick={() => move(i, 1)} className="rounded border px-1">→</button>
            </div>
          </div>
        ))}
        <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center rounded border border-dashed text-[11px] text-neutral-500 hover:bg-neutral-50">
          {busy ? "업로드…" : "+ 추가"}
          <input type="file" accept="image/*" multiple onChange={add} className="hidden" disabled={busy} />
        </label>
      </div>
      {err && <p className="mt-1 text-xs text-red-600">{err}</p>}
      <input type="hidden" name={name} value={urls.join("\n")} />
    </div>
  );
}
