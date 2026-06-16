import Link from "next/link";
import LangToggle from "@/components/lang-toggle";
import type { Brand } from "@/lib/brands";
import { t, type Locale } from "@/lib/i18n";

export default function SiteHeader({ brand, locale }: { brand: Brand; locale: Locale }) {
  const tt = t(locale);
  const nav = [
    { href: "/", label: brand.name },
    { href: "/collections/all", label: tt.shop },
    { href: "/about", label: tt.about },
    { href: "/blogs/coffeelog", label: tt.blog },
    { href: "/contact", label: tt.contact },
  ];
  return (
    <header className="border-b border-neutral-200">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-4">
          <details className="relative md:hidden">
            <summary className="cursor-pointer list-none text-xl">☰</summary>
            <nav className="absolute left-0 top-8 z-20 w-48 border bg-white p-3 text-sm shadow">
              {nav.map((n) => (
                <Link key={n.href} href={n.href} className="block py-1">{n.label}</Link>
              ))}
            </nav>
          </details>
          <Link href="/" className="text-lg font-bold tracking-tight">{brand.name}</Link>
        </div>

        <nav className="hidden items-center gap-6 text-sm md:flex">
          {nav.slice(1).map((n) => (
            <Link key={n.href} href={n.href} className="hover:opacity-70">{n.label}</Link>
          ))}
        </nav>

        <div className="flex items-center gap-3 text-sm">
          <form action="/search" className="hidden md:block">
            <input name="q" placeholder="검색" className="w-28 rounded-full border px-3 py-1 text-xs" />
          </form>
          <LangToggle locale={locale} />
          <a href={`https://instagram.com/${brand.instagram.replace("@", "")}`} target="_blank" rel="noreferrer" className="hover:opacity-70" aria-label="Instagram">IG</a>
          <Link href="/account" className="hover:opacity-70">{tt.login}</Link>
          <Link href="/cart" className="hover:opacity-70">{tt.cart}</Link>
        </div>
      </div>
    </header>
  );
}
