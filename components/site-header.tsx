import Link from "next/link";
import LangToggle from "@/components/lang-toggle";
import type { Brand } from "@/lib/brands";
import { t, type Locale } from "@/lib/i18n";
import { signOutAction } from "@/app/account/actions";

export default function SiteHeader({
  brand, locale, signedIn, role, bg, logo,
}: { brand: Brand; locale: Locale; signedIn: boolean; role: string | null; bg?: string; logo?: string }) {
  const tt = t(locale);
  const isBusiness = role === "business";

  // 사업자 전용은 사업자 회원에게만 유효하나, 헤더 주 메뉴는 브랜드 내비게이션 사용
  void isBusiness;
  const mainNav = [
    { href: "/collections/all", label: tt.shop },
    { href: "/about", label: tt.about },
    { href: "/blogs/coffeelog", label: tt.blog },
    { href: "/consulting", label: tt.consulting },
    { href: "/contact", label: tt.contact },
  ];

  return (
    <header className="sticky top-0 z-30 bg-bg/95 backdrop-blur" style={bg ? { background: bg } : undefined}>
      <div className="border-b border-line">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-4">
            <Link href="/" aria-label={brand.name} className="flex shrink-0 items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {/* 로고: 높이 고정 + w-auto + object-contain 으로 원본 비율 유지(세로 늘어짐 방지) */}
              <img
                src={logo || "/images/mtspace-logo.png"}
                alt={brand.name}
                width={160}
                height={28}
                className="block h-7 w-auto max-w-[160px] shrink-0 object-contain"
                style={{ height: "1.75rem", width: "auto" }}
              />
            </Link>
          </div>

          <nav className="flex items-center gap-4 overflow-x-auto text-sm md:gap-6">
            {mainNav.map((n) => <Link key={n.href} href={n.href} className="whitespace-nowrap hover:opacity-70">{n.label}</Link>)}
          </nav>

          <div className="flex items-center gap-3 text-sm">
            <form action="/search" className="hidden md:block">
              <input name="q" placeholder="검색" className="w-24 rounded-full border px-3 py-1 text-xs" />
            </form>
            <LangToggle locale={locale} />
            <a href="https://instagram.com/mtspacecoffee" target="_blank" rel="noreferrer" className="hidden hover:opacity-70 sm:inline" aria-label="Instagram MTSPACE">@mtspacecoffee</a>
            {signedIn ? (
              <>
                <Link href="/account" className="hover:opacity-70">마이페이지</Link>
                <form action={signOutAction}><button className="hover:opacity-70">로그아웃</button></form>
              </>
            ) : (
              <>
                <Link href="/account/login" className="hover:opacity-70">{tt.login}</Link>
                <Link href="/account/signup" className="hidden hover:opacity-70 sm:inline">{tt.signup}</Link>
              </>
            )}
            <Link href="/cart" className="hover:opacity-70">{tt.cart}</Link>
          </div>
        </div>
      </div>
    </header>
  );
}
