import Link from "next/link";
import Image from "next/image";
import type { ProductCardData } from "@/lib/queries";
import { formatKRW, t, type Locale } from "@/lib/i18n";

export default function ProductCard({ p, locale }: { p: ProductCardData; locale: Locale }) {
  const tt = t(locale);
  const title = locale === "en" && p.title_en ? p.title_en : p.title_ko;
  return (
    <Link href={`/products/${p.slug}`} className="group block">
      <div
        className="relative aspect-square w-full overflow-hidden rounded-lg bg-neutral-100"
        style={p.key_color ? { boxShadow: `inset 0 -3px 0 ${p.key_color}` } : undefined}
      >
        {p.image ? (
          <Image
            src={p.image}
            alt={p.imageAlt ?? title}
            fill
            sizes="(max-width:768px) 50vw, 240px"
            className="object-cover transition group-hover:scale-105"
          />
        ) : null}
      </div>
      <div className="mt-2">
        <p className="line-clamp-2 text-sm font-medium leading-snug">{title}</p>
        {p.flavor_notes.length > 0 && (
          <p className="mt-0.5 line-clamp-1 text-xs text-neutral-500">
            {p.flavor_notes.slice(0, 3).join(" · ")}
          </p>
        )}
        <p className="mt-1 text-sm">
          {p.is_b2b_only && <span className="mr-1 text-[10px] text-neutral-400">{tt.wholesaleOnly}</span>}
          {p.minPrice > 0 ? formatKRW(p.minPrice) : ""}
        </p>
      </div>
    </Link>
  );
}
