import Link from "next/link";
import Image from "next/image";
import type { ProductCardData } from "@/lib/queries";
import { formatKRW, t, type Locale } from "@/lib/i18n";
import { pointColor } from "@/lib/point-color";

// 1:1 카드 (DESIGN_SYSTEM §9): oat 표면, 상단 MTSPACE COFFEE(mono)+point dot, 패크샷,
// 제품명(Helvetica 800), 컵노트(Spectral italic, clay-deep), 하단 카테고리·가격(mono)
export default function ProductCard({ p, locale, compact }: { p: ProductCardData; locale: Locale; compact?: boolean }) {
  const tt = t(locale);
  const title = (locale === "en" && p.title_en ? p.title_en : p.title_ko).replace(/\[.*?\]\s*/g, "");
  const dot = pointColor({ keyColor: p.key_color, flavorNotes: p.flavor_notes, roast: p.roast_level });
  const series = p.is_b2b_only ? "WHOLESALE" : (p.product_type === "merch" ? "MERCH" : "SINGLE ORIGIN");
  return (
    <Link href={`/products/${p.slug}`} className="group block">
      {/* 쇼핑 썸네일은 현재의 75% 크기(compact) — 셀 중앙 정렬 */}
      <div className={`mt-grid relative aspect-square overflow-hidden rounded-card border border-line shadow-card ${compact ? "mx-auto w-3/4" : "w-full"}`}>
        {/* 상단: 워드마크(mono) + 포인트 dot */}
        <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-3 py-2">
          <span className="font-mono text-[9px] uppercase tracking-wider text-inkSoft">MTSPACE COFFEE</span>
          <span className="h-2 w-2 rounded-full" style={{ background: dot }} />
        </div>
        {p.image ? (
          <Image
            src={p.image}
            alt={p.imageAlt ?? title}
            fill
            sizes="(max-width:768px) 50vw, 280px"
            className="object-cover transition duration-300 group-hover:scale-[1.04]"
          />
        ) : null}
      </div>
      <div className="mt-3">
        <p className="line-clamp-2 text-[15px] font-extrabold leading-snug text-ink">{title}</p>
        {p.flavor_notes.length > 0 && (
          <p className="prose-serif mt-1 line-clamp-1 text-[13px] italic text-clayDeep">
            {p.flavor_notes.slice(0, 3).join(" · ")}
          </p>
        )}
        <div className="mt-1.5 flex items-baseline justify-between">
          <span className="font-mono text-[10px] uppercase tracking-wider text-inkSoft">{series}</span>
          <span className="text-sm font-bold text-ink">
            {p.is_b2b_only && <span className="mr-1 text-[10px] font-normal text-inkSoft">{tt.wholesaleOnly}</span>}
            {p.minPrice > 0 ? formatKRW(p.minPrice) : ""}
          </span>
        </div>
      </div>
    </Link>
  );
}
