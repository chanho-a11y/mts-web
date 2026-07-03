"use client";
import { useEffect, useState } from "react";

// 실제 이미지 슬라이드(상품 아님). CMS(site_setting home_slides)에서 경로 주입, 자동 전환.
export default function HeroSlideshow({
  slides,
  title,
  subtitle,
  locale = "ko",
}: {
  slides: { src: string; alt?: string; href?: string }[];
  title?: string;
  subtitle?: string;
  locale?: "ko" | "en";
}) {
  const [i, setI] = useState(0);
  const n = slides.length;

  useEffect(() => {
    if (n <= 1) return;
    const id = setInterval(() => setI((p) => (p + 1) % n), 5000);
    return () => clearInterval(id);
  }, [n]);

  if (n === 0) return null;

  return (
    <section className="relative h-[58vh] min-h-[380px] w-full overflow-hidden border-b border-neutral-200 bg-neutral-900 md:h-[52vh] md:min-h-[320px]">
      {slides.map((s, idx) => (
        <a
          key={idx}
          href={s.href || undefined}
          className={`absolute inset-0 transition-opacity duration-1000 ${idx === i ? "opacity-100" : "opacity-0"}`}
          aria-hidden={idx !== i}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={s.src} alt={s.alt ?? ""} className="h-full w-full object-cover" />
        </a>
      ))}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/55 to-black/10" />
      {(title || subtitle) && (
        <div className="pointer-events-none absolute inset-0 mx-auto flex max-w-6xl flex-col justify-center px-4 text-white">
          <p className="text-[0.65rem] uppercase tracking-[0.3em] text-white/80 sm:text-xs">everyday excellence</p>
          {title && <h1 className="mt-3 max-w-2xl text-3xl font-bold leading-tight sm:text-4xl md:text-5xl">{title}</h1>}
          {subtitle && <p className="mt-3 max-w-xl text-sm text-white/90 sm:mt-4 sm:text-base">{subtitle}</p>}
        </div>
      )}
      {n > 1 && (
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setI(idx)}
              aria-label={locale === "en" ? `Slide ${idx + 1}` : `슬라이드 ${idx + 1}`}
              className={`h-1.5 rounded-full transition-all ${idx === i ? "w-6 bg-white" : "w-1.5 bg-white/50"}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
