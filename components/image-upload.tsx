"use client";
import { useState } from "react";
import { shrinkImage, readUploadJson } from "@/lib/client-image";

// 이미지 첨부(경로 입력 대체) — 파일 선택 → /api/upload → 공개 URL을 hidden input(name)에 저장.
export default function ImageUpload({
  name, defaultValue = "", folder = "uploads", label = "이미지 첨부",
}: { name: string; defaultValue?: string; folder?: string; label?: string }) {
  const [url, setUrl] = useState(defaultValue);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true); setErr("");
    try {
      const shrunk = await shrinkImage(file); // 업로드 전 축소(4.5MB 한도 회피)
      const fd = new FormData();
      fd.append("file", shrunk);
      fd.append("folder", folder);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const j = await readUploadJson(res);
      if (!res.ok || !j.url) throw new Error(j.error || "업로드 실패");
      setUrl(j.url);
    } catch (e: any) {
      setErr(e?.message ?? "업로드 실패");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  return (
    <div className="text-sm">
      <div className="mb-1 font-medium">{label}</div>
      <div className="flex flex-wrap items-center gap-3">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="h-16 w-16 rounded border object-cover" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded border border-dashed text-[10px] text-neutral-400">없음</div>
        )}
        <label className="cursor-pointer rounded-full border px-3 py-1.5 text-xs hover:bg-neutral-100">
          {busy ? "업로드 중…" : url ? "변경" : "파일 선택"}
          <input type="file" accept="image/*" onChange={onFile} className="hidden" disabled={busy} />
        </label>
        {url && <button type="button" onClick={() => setUrl("")} className="text-xs text-neutral-400 hover:underline">제거</button>}
      </div>
      {err && <p className="mt-1 text-xs text-red-600">{err}</p>}
      <input type="hidden" name={name} value={url} />
    </div>
  );
}
