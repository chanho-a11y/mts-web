"use client";
import { useEffect, useRef, useState } from "react";

// 리치 텍스트 에디터(WYSIWYG) — H1~H3·본문, 정렬, 글씨크기, 볼드, 하이퍼링크, 이미지 삽입.
// HTML 편집기가 아니라 직접 쓰고 편집하는 방식. 내용은 hidden input[name]에 HTML로 동기화.
// AIEO/SEO 점검 + 자동 다듬기(휴리스틱, 첨부 블로그 가이드 기준) 내장.

const AI_CLICHES = [
  "게다가", "또한 ", "나아가", "주목할 필요가 있다", "결론적으로",
  "에 대해 알아보겠습니다", "이 섹션에서는", "이를 바탕으로", "이런 맥락에서",
];
const ABS_WORDS = ["최고의", "유일한", "완벽한", "1등", "최상의"];

export default function RichEditor({
  name, defaultValue = "", minWords = 0, onChange,
}: { name: string; defaultValue?: string; minWords?: number; onChange?: (html: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const hidden = useRef<HTMLInputElement>(null);
  const [report, setReport] = useState<{ ok: boolean; label: string }[] | null>(null);

  useEffect(() => {
    if (ref.current && !ref.current.innerHTML) ref.current.innerHTML = defaultValue || "<p></p>";
    sync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function sync() {
    if (ref.current && hidden.current) hidden.current.value = ref.current.innerHTML;
    if (ref.current && onChange) onChange(ref.current.innerHTML);
  }
  function cmd(command: string, value?: string) {
    if (!ref.current) return;
    ref.current.focus();
    document.execCommand(command, false, value);
    sync();
  }
  function block(tag: string) { cmd("formatBlock", tag); }

  function addLink() {
    const url = prompt("링크 URL을 입력하세요 (https://...)");
    if (url) cmd("createLink", url);
  }

  async function insertImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const fd = new FormData();
      fd.append("file", file); fd.append("folder", "blog");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      ref.current?.focus();
      document.execCommand("insertHTML", false, `<img src="${j.url}" alt="" style="max-width:100%;border-radius:8px;margin:12px 0;" />`);
      sync();
    } catch (err: any) {
      alert("이미지 업로드 실패: " + (err?.message ?? ""));
    } finally {
      e.target.value = "";
    }
  }

  // 자동 다듬기 — AI 상투어·em대시·절대화 표현 정리(첨부 가이드 3.5·4)
  function autoPolish() {
    if (!ref.current) return;
    let html = ref.current.innerHTML;
    html = html.replace(/\s—\s/g, ", ");            // em대시 → 쉼표
    html = html.replace(/—/g, "-");
    AI_CLICHES.forEach((w) => { html = html.split(w).join(w === "또한 " ? "" : ""); });
    html = html.replace(/  +/g, " ");
    ref.current.innerHTML = html;
    sync();
    runCheck();
  }

  // AIEO/SEO 점검 — 본문 신호(H2, 목록, 표, FAQ, 분량, 헤지/절대화) 진단
  function runCheck() {
    const el = ref.current;
    if (!el) return;
    const text = el.innerText || "";
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const hasH2 = !!el.querySelector("h2, h3");
    const hasList = !!el.querySelector("ul, ol");
    const hasTable = !!el.querySelector("table");
    const hasFaq = /FAQ|자주\s*묻는|Q\.\s/.test(text);
    const hasImg = !!el.querySelector("img");
    const absHit = ABS_WORDS.filter((w) => text.includes(w));
    const clicheHit = AI_CLICHES.map((w) => w.trim()).filter((w) => w && text.includes(w));
    setReport([
      { ok: words >= (minWords || 300), label: `분량 ${words}단어 (권장 ${minWords || 300}+)` },
      { ok: hasH2, label: "H2/H3 구조화 헤딩" },
      { ok: hasList, label: "번호/불릿 목록 1개 이상" },
      { ok: hasTable, label: "표 1개 이상 (인용률↑)" },
      { ok: hasFaq, label: "FAQ 섹션" },
      { ok: hasImg, label: "이미지 포함" },
      { ok: absHit.length === 0, label: absHit.length ? `절대화 표현: ${absHit.join(", ")}` : "절대화 표현 없음" },
      { ok: clicheHit.length === 0, label: clicheHit.length ? `AI 상투어: ${clicheHit.join(", ")}` : "AI 상투어 없음" },
    ]);
  }

  const btn = "rounded border px-2 py-1 text-xs hover:bg-neutral-100";
  return (
    <div>
      <div className="flex flex-wrap items-center gap-1 rounded-t border border-b-0 bg-neutral-50 p-1.5">
        <button type="button" onClick={() => block("H1")} className={btn}>H1</button>
        <button type="button" onClick={() => block("H2")} className={btn}>H2</button>
        <button type="button" onClick={() => block("H3")} className={btn}>H3</button>
        <button type="button" onClick={() => block("P")} className={btn}>본문</button>
        <span className="mx-1 text-neutral-300">|</span>
        <button type="button" onClick={() => cmd("bold")} className={`${btn} font-bold`}>B</button>
        <button type="button" onClick={() => cmd("fontSize", "5")} className={btn} title="크게">A+</button>
        <button type="button" onClick={() => cmd("fontSize", "2")} className={btn} title="작게">A-</button>
        <span className="mx-1 text-neutral-300">|</span>
        <button type="button" onClick={() => cmd("justifyLeft")} className={btn}>왼쪽</button>
        <button type="button" onClick={() => cmd("justifyCenter")} className={btn}>가운데</button>
        <button type="button" onClick={() => cmd("justifyRight")} className={btn}>오른쪽</button>
        <span className="mx-1 text-neutral-300">|</span>
        <button type="button" onClick={addLink} className={btn}>🔗 링크</button>
        <label className={`${btn} cursor-pointer`}>🖼 이미지<input type="file" accept="image/*" onChange={insertImage} className="hidden" /></label>
        <span className="mx-1 text-neutral-300">|</span>
        <button type="button" onClick={runCheck} className={`${btn} bg-clay/10 text-clayDeep`}>AIEO/SEO 점검</button>
        <button type="button" onClick={autoPolish} className={`${btn} bg-clay/10 text-clayDeep`}>자동 다듬기</button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={sync}
        onBlur={sync}
        className="prose-editor min-h-[280px] w-full rounded-b border bg-white px-4 py-3 text-sm leading-relaxed focus:outline-none"
        style={{ maxHeight: 520, overflowY: "auto" }}
      />
      <input ref={hidden} type="hidden" name={name} defaultValue={defaultValue} />
      {report && (
        <ul className="mt-2 space-y-1 rounded border border-line bg-paper p-3 text-xs">
          {report.map((r, i) => (
            <li key={i} className={r.ok ? "text-green-700" : "text-amber-700"}>{r.ok ? "✓" : "•"} {r.label}</li>
          ))}
        </ul>
      )}
      <style>{`
        .prose-editor h1{font-size:1.6rem;font-weight:800;margin:.6em 0 .3em}
        .prose-editor h2{font-size:1.3rem;font-weight:700;margin:.6em 0 .3em}
        .prose-editor h3{font-size:1.1rem;font-weight:700;margin:.5em 0 .3em}
        .prose-editor p{margin:.4em 0}
        .prose-editor a{color:#B0764A;text-decoration:underline}
        .prose-editor ul{list-style:disc;padding-left:1.4em}
        .prose-editor ol{list-style:decimal;padding-left:1.4em}
      `}</style>
    </div>
  );
}
