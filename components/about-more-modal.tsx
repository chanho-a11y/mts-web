"use client";
import { useEffect, useState } from "react";

// 대표 약력·수상내역·미디어 '더보기' 팝업.
export default function AboutMoreModal({ awards, media, label = "대표 약력 · 수상내역 더보기 →", locale = "ko" }: { awards: string[]; media: string[]; label?: string; locale?: "ko" | "en" }) {
  const [open, setOpen] = useState(false);
  const c = locale === "en"
    ? {
        modalTitle: "Full Bio · Awards · Media",
        modalAria: "Founder bio and awards",
        close: "Close",
        bio: "Chanho Hong is a coffee professional with 16 years of experience who has earned numerous awards on the specialty coffee competition stage across Korea and Australia. He is known for ‘Chanho-Tornado’, his own V60 brewing method, and holds a bachelor's degree in advertising and an MBA (data-driven marketing, operations, and entrepreneurship). He is the founder of MTSPACE COFFEE, Normcore Coffee, and RoasteryFlow.",
        awardsH: "Barista Awards",
        mediaH: "Media · Seminars · Events",
      }
    : {
        modalTitle: "대표 약력 · 수상 · 미디어",
        modalAria: "대표 약력 및 수상내역",
        close: "닫기",
        bio: "홍찬호(Chanho Hong)는 경력 16년의 커피 전문가로, 한국·호주 양국의 스페셜티 커피 경쟁 무대에서 다수의 수상 경험을 쌓았습니다. V60 추출의 고유 방법인 ‘Chanho-Tornado’로 알려져 있으며, 광고학 학사와 MBA(데이터 기반 마케팅·운영·창업) 학위를 보유하고 있습니다. MTSPACE COFFEE · Normcore Coffee · RoasteryFlow의 창업자입니다.",
        awardsH: "수상 내역 (Barista Awards)",
        mediaH: "미디어 · 세미나 · 이벤트",
      };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 inline-block rounded-card border border-line bg-paper px-5 py-2 text-sm font-semibold text-ink transition hover:bg-warmPaper"
      >
        {label}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/60 p-4"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={c.modalAria}
        >
          <div
            className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-card border border-line bg-paper p-6 shadow-card sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="mt-tagline text-[10px]">chanho hong</p>
                <h3 className="mt-1 text-xl font-extrabold text-ink">{c.modalTitle}</h3>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="shrink-0 rounded-full border border-line px-3 py-1 text-sm text-inkSoft hover:bg-warmPaper"
                aria-label={c.close}
              >
                ✕
              </button>
            </div>

            <section className="prose-serif space-y-3 text-[15px] leading-relaxed text-ink/85">
              <p>{c.bio}</p>
            </section>

            <div className="mt-6">
              <p className="text-sm font-bold text-ink">{c.awardsH}</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-inkSoft">
                {awards.map((a) => <li key={a}>{a}</li>)}
              </ul>
            </div>

            <div className="mt-6">
              <p className="text-sm font-bold text-ink">{c.mediaH}</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-inkSoft">
                {media.map((m) => <li key={m}>{m}</li>)}
              </ul>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
