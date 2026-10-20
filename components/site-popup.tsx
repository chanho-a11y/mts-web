"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { kstDateKey, type PopupView } from "@/lib/site-popup-shared";

// 홈 공지 팝업(D-148). 특별 → 상시 순서로 한 장씩 보여준다.
// · 오늘 하루 보지 않기: localStorage 에 "KST 날짜|버전" 저장 → 같은 날, 같은 내용이면 숨김.
// · 닫기: sessionStorage 에 저장 → 같은 탭에서 홈으로 돌아와도 다시 뜨지 않음. 새로 방문하면 다시 노출.
// · 내용이 수정되면 버전(updated_at)이 바뀌어 다시 노출된다.
// 저장소 접근이 막힌 환경(사파리 비공개 모드 등)에서는 try/catch 로 무시하고 이번 화면에서만 닫는다.

const HIDE_KEY = (id: string) => `mts_popup_hide_${id}`;
const CLOSE_KEY = (id: string) => `mts_popup_closed_${id}`;

function isSuppressed(p: PopupView): boolean {
  try {
    if (localStorage.getItem(HIDE_KEY(p.id)) === `${kstDateKey()}|${p.version}`) return true;
  } catch {}
  try {
    if (sessionStorage.getItem(CLOSE_KEY(p.id)) === p.version) return true;
  } catch {}
  return false;
}

export default function SitePopup({ popups, locale }: { popups: PopupView[]; locale: "ko" | "en" }) {
  // 서버 렌더에서는 아무것도 그리지 않고, 마운트 후 저장소를 확인해 큐를 만든다(하이드레이션 불일치 방지).
  const [queue, setQueue] = useState<PopupView[]>([]);
  const [total, setTotal] = useState(0);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const en = locale === "en";

  useEffect(() => {
    const visible = popups.filter((p) => !isSuppressed(p));
    setQueue(visible);
    setTotal(visible.length);
  }, [popups]);

  const current = queue[0];

  const dismiss = useCallback(
    (hideToday: boolean) => {
      if (!current) return;
      try {
        if (hideToday) localStorage.setItem(HIDE_KEY(current.id), `${kstDateKey()}|${current.version}`);
        else sessionStorage.setItem(CLOSE_KEY(current.id), current.version);
      } catch {}
      setQueue((q) => q.slice(1));
    },
    [current],
  );

  // Esc 로 닫기, 배경 스크롤 잠금, 닫기 버튼에 초점
  useEffect(() => {
    if (!current) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtn.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [current, dismiss]);

  if (!current) return null;

  const step = total - queue.length + 1;
  const kindLabel = current.kind === "special" ? (en ? "Special notice" : "특별 공지") : en ? "Notice" : "공지";
  const external = !!current.ctaUrl && current.ctaUrl.startsWith("https://");
  const titleId = `mts-popup-title-${current.id}`;
  const ctaClass =
    "mt-5 block rounded-card bg-ink px-4 py-3 text-center text-sm font-medium text-white hover:bg-ink/90";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) dismiss(false);
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[88vh] w-full max-w-[420px] flex-col overflow-hidden rounded-card bg-paper shadow-xl"
      >
        <div className="min-h-0 flex-1 overflow-y-auto">
          {current.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={current.imageUrl} alt={current.title} className="block h-auto max-h-[55vh] w-full object-cover" />
          )}
          <div className="px-6 pb-6 pt-5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-wider text-clayDeep">{kindLabel}</span>
              {total > 1 && <span className="font-mono text-[10px] text-inkSoft">{step} / {total}</span>}
            </div>
            <h2 id={titleId} className="mt-2 text-lg font-bold leading-snug text-ink">
              {current.title}
            </h2>
            {current.body && (
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink/80">{current.body}</p>
            )}
            {current.ctaUrl &&
              (external ? (
                <a href={current.ctaUrl} target="_blank" rel="noopener noreferrer" className={ctaClass}>
                  {current.ctaLabel}
                </a>
              ) : (
                <Link href={current.ctaUrl} className={ctaClass} onClick={() => dismiss(false)}>
                  {current.ctaLabel}
                </Link>
              ))}
          </div>
        </div>
        <div className="grid shrink-0 grid-cols-2 border-t border-line text-xs">
          <button type="button" onClick={() => dismiss(true)} className="px-3 py-3 text-inkSoft hover:bg-oatLight">
            {en ? "Don't show today" : "오늘 하루 보지 않기"}
          </button>
          <button
            ref={closeBtn}
            type="button"
            onClick={() => dismiss(false)}
            className="border-l border-line px-3 py-3 font-medium text-ink hover:bg-oatLight"
          >
            {en ? "Close" : "닫기"}
          </button>
        </div>
      </div>
    </div>
  );
}
