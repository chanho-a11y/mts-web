import Link from "next/link";
import LangToggle from "@/components/lang-toggle";
import type { Brand } from "@/lib/brands";
import { t, type Locale } from "@/lib/i18n";
import { signOutAction } from "@/app/account/actions";

export default function SiteHeader({
  brand, locale, signedIn, role,
}: { brand: Brand; locale: Locale; signedIn: boolean; role: string | null }) {
  const tt = t(locale);
  const isAdmin = role === "admin";
  const isBusiness = role === "business";

  const mainNav = [
    { href: "/collections/all", label: tt.shop },
    { href: "/about", label: tt.about },
    { href: "/coffee-info", label: tt.coffeeInfo },
    { href: "/blogs/coffeelog", label: tt.blog },
    { href: "/contact", label: tt.contact },
  ];
  // 상단 고정 쇼핑 메뉴 (역할별)
  const shopNav = isBusiness
    ? [{ href: "/collections/wholesale", label: "사업자 전용" }, { href: "/collections/blends", label: "블렌드" }, { href: "/collections/single-origins", label: "싱글 오리진" }]
    : [
        { href: "/collections/blends", label: "블렌드" },
        { href: "/collections/single-origins", label: "싱글 오리진" },
        { href: "/collections/decaf", label: "디카페인" },
        { href: "/collections/normcore", label: "Normcore" },
        { href: "/collections/merch", label: "머천다이즈" },
      ];

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur">
      <div className="border-b border-neutral-200">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-4">
            <details className="relative md:hidden">
              <summary className="cursor-pointer list-none text-xl">☰</summary>
              <nav className="absolute left-0 top-8 z-40 w-52 border bg-white p-3 text-sm shadow">
                {[...mainNav, ...shopNav].map((n) => <Link key={n.href} href={n.href} className="block py-1">{n.label}</Link>)}
                {isAdmin && <Link href="/admin" className="block py-1 font-bold text-brandBlue">관리자</Link>}
              </nav>
            </details>
            <Link href="/" className="text-lg font-bold tracking-tight">{brand.name}</Link>
          </div>

          <nav className="hidden items-center gap-6 text-sm md:flex">
            {mainNav.map((n) => <Link key={n.href} href={n.href} className="hover:opacity-70">{n.label}</Link>)}
          </nav>

          <div className="flex items-center gap-3 text-sm">
            <form action="/search" className="hidden md:block">
              <input name="q" placeholder="검색" className="w-24 rounded-full border px-3 py-1 text-xs" />
            </form>
            <LangToggle locale={locale} />
            <a href={`https://instagram.com/${brand.instagram.replace("@", "")}`} target="_blank" rel="noreferrer" className="hover:opacity-70" aria-label="Instagram">IG</a>
            {isAdmin && <Link href="/admin" className="rounded bg-ink px-2 py-1 text-xs text-white">관리자</Link>}
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

      {/* 상단 고정 쇼핑 메뉴 */}
      <div className="border-b border-neutral-100 bg-neutral-50">
        <nav className="mx-auto flex max-w-6xl items-center gap-5 overflow-x-auto px-4 py-2 text-xs">
          {shopNav.map((n) => <Link key={n.href} href={n.href} className="whitespace-nowrap hover:text-brandBlue">{n.label}</Link>)}
          {isBusiness && <span className="ml-auto rounded-full bg-brandBlue/10 px-2 py-0.5 text-[10px] text-brandBlue">기업회원</span>}
        </nav>
      </div>
    </header>
  );
}
