import Link from "next/link";
import LangToggle from "@/components/lang-toggle";
import type { Brand } from "@/lib/brands";
import { t, type Locale } from "@/lib/i18n";
import { signOutAction } from "@/app/account/actions";

export default function SiteHeader({
  brand, locale, signedIn, role, bg, logo,
}: { brand: Brand; locale: Locale; signedIn: boolean; role: string | null; bg?: string; logo?: string }) {
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

  // 버거 메뉴: 역할별 전체 네비게이션 트리(전 뷰포트 공통)
  const burgerSections = [
    { title: "쇼핑", links: shopNav },
    { title: "브랜드", links: mainNav },
    { title: "내 계정", links: signedIn
        ? [{ href: "/account", label: "마이페이지" }, { href: "/account/orders", label: "구매내역" }]
        : [{ href: "/account/login", label: tt.login }, { href: "/account/signup", label: tt.signup }] },
  ];

  return (
    <header className="sticky top-0 z-30 bg-oat/95 backdrop-blur" style={bg ? { background: bg } : undefined}>
      <div className="border-b border-line">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-4">
            {/* 버거 버튼 — 데스크톱·모바일 공통 주 네비게이션 */}
            <details className="relative">
              <summary className="cursor-pointer list-none text-xl leading-none" aria-label="메뉴">☰</summary>
              <nav className="absolute left-0 top-9 z-40 w-64 border bg-white p-4 text-sm shadow-lg">
                {burgerSections.map((sec) => (
                  <div key={sec.title} className="mb-3 last:mb-0">
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400">{sec.title}</p>
                    {sec.links.map((n) => <Link key={n.href} href={n.href} className="block py-1 hover:text-brandBlue">{n.label}</Link>)}
                  </div>
                ))}
                {isAdmin && (
                  <div className="mt-2 border-t pt-2">
                    <Link href="/admin" className="block py-1 font-bold text-brandBlue">관리자</Link>
                  </div>
                )}
              </nav>
            </details>
            <Link href="/" className="mt-wordmark text-lg text-ink">
              {logo
                /* eslint-disable-next-line @next/next/no-img-element */
                ? <img src={logo} alt={brand.name} className="h-7 w-auto" />
                : <span>MTSPACE<span className="light"> COFFEE</span></span>}
            </Link>
          </div>

          <nav className="hidden items-center gap-6 text-sm md:flex">
            {mainNav.map((n) => <Link key={n.href} href={n.href} className="hover:opacity-70">{n.label}</Link>)}
          </nav>

          <div className="flex items-center gap-3 text-sm">
            <form action="/search" className="hidden md:block">
              <input name="q" placeholder="검색" className="w-24 rounded-full border px-3 py-1 text-xs" />
            </form>
            <LangToggle locale={locale} />
            <a href="https://instagram.com/mtspacecoffee" target="_blank" rel="noreferrer" className="hidden hover:opacity-70 sm:inline" aria-label="Instagram MTSPACE">@mtspacecoffee</a>
            <a href="https://instagram.com/normcorecoffee_official" target="_blank" rel="noreferrer" className="hidden hover:opacity-70 lg:inline" aria-label="Instagram Normcore">@normcorecoffee_official</a>
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
      <div className="border-b border-line bg-sand">
        <nav className="mx-auto flex max-w-6xl items-center gap-5 overflow-x-auto px-4 py-2 font-mono text-[11px] uppercase tracking-wide text-inkSoft">
          {shopNav.map((n) => <Link key={n.href} href={n.href} className="whitespace-nowrap hover:text-clayDeep">{n.label}</Link>)}
          {isBusiness && <span className="ml-auto rounded-full bg-clay/15 px-2 py-0.5 text-[10px] tracking-normal text-clayDeep">기업회원</span>}
        </nav>
      </div>
    </header>
  );
}
