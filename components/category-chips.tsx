import Link from "next/link";
import { t, type Locale } from "@/lib/i18n";

/**
 * 쇼핑(컬렉션) 진입 시 상단에 노출되는 카테고리 칩 바.
 * 헤더 하단 고정 카테고리 바를 대체한다 — 카테고리는 쇼핑에 들어왔을 때만 보인다.
 */
export default function CategoryChips({
  active,
  isBusiness = false,
  locale = "ko",
}: { active?: string; isBusiness?: boolean; locale?: Locale }) {
  const tt = t(locale);
  const base = [
    { href: "/collections/all", slug: "all", label: tt.catAll },
    { href: "/collections/blends", slug: "blends", label: tt.catBlends },
    { href: "/collections/single-origins", slug: "single-origins", label: tt.catSingleOrigins },
    { href: "/collections/normcore", slug: "normcore", label: "Normcore Coffee" },
  ];
  // 사업자 전용 카테고리는 사업자 회원에게만 노출
  const chips = isBusiness
    ? [
        { href: "/collections/all", slug: "all", label: tt.catAll },
        { href: "/collections/wholesale", slug: "wholesale", label: tt.catWholesale },
        { href: "/collections/blends", slug: "blends", label: tt.catBlends },
        { href: "/collections/single-origins", slug: "single-origins", label: tt.catSingleOrigins },
        { href: "/collections/normcore", slug: "normcore", label: "Normcore Coffee" },
      ]
    : base;

  return (
    <nav className="mb-8 flex flex-wrap items-center gap-2" aria-label={tt.productCategories}>
      {chips.map((c) => {
        const isActive = active === c.slug;
        return (
          <Link
            key={c.slug}
            href={c.href}
            aria-current={isActive ? "page" : undefined}
            className={`whitespace-nowrap rounded-full border px-4 py-1.5 font-mono text-[11px] uppercase tracking-wide transition-colors ${
              isActive
                ? "border-ink bg-ink text-bg"
                : "border-line bg-paper text-inkSoft hover:border-clay hover:text-clayDeep"
            }`}
          >
            {c.label}
          </Link>
        );
      })}
    </nav>
  );
}
