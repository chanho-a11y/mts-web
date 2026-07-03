"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import LangToggle from "@/components/lang-toggle";
import CartLink from "@/components/cart-link";
import type { Locale } from "@/lib/i18n";
import { signOutAction } from "@/app/account/actions";

type NavItem = { href: string; label: string };

export default function MobileNav({
  nav,
  locale,
  signedIn,
  brandName,
  instagram,
  labels,
}: {
  nav: NavItem[];
  locale: Locale;
  signedIn: boolean;
  brandName: string;
  instagram: string;
  labels: { search: string; login: string; signup: string; myPage: string; signOut: string; cart: string; menu: string; close: string };
}) {
  const [open, setOpen] = useState(false);

  // 드로어 열림 동안 배경 스크롤 잠금
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    }
  }, [open]);

  // ESC 로 닫기
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div className="md:hidden">
      {/* 햄버거 버튼 (44px 탭타겟) */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={labels.menu}
        aria-expanded={open}
        aria-controls="mobile-drawer"
        className="-mr-1 inline-flex h-11 w-11 items-center justify-center rounded-md text-ink hover:opacity-70"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* 오버레이 */}
      <div
        onClick={close}
        aria-hidden={!open}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
      />

      {/* 우측 슬라이드 드로어 */}
      <aside
        id="mobile-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={brandName}
        className={`fixed right-0 top-0 z-50 flex h-full w-[84%] max-w-xs flex-col overflow-y-auto bg-bg shadow-xl transition-transform duration-300 ease-out ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <span className="mt-wordmark text-lg">MTSPACE <span className="light">COFFEE</span></span>
          <button
            type="button"
            onClick={close}
            aria-label={labels.close}
            className="-mr-1 inline-flex h-11 w-11 items-center justify-center rounded-md text-ink hover:opacity-70"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </div>

        {/* 검색 */}
        <form action="/search" className="border-b border-line px-4 py-3">
          <input
            name="q"
            placeholder={labels.search}
            aria-label={labels.search}
            className="w-full rounded-full border border-line bg-paper px-4 py-2 text-sm"
          />
        </form>

        {/* 주 메뉴 */}
        <nav className="flex flex-col px-2 py-2 text-base">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              onClick={close}
              className="rounded-md px-2 py-3 font-medium hover:bg-oat"
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto border-t border-line px-4 py-4">
          {/* 계정 */}
          <div className="flex flex-col gap-3 text-sm">
            {signedIn ? (
              <>
                <Link href="/account" onClick={close} className="hover:opacity-70">{labels.myPage}</Link>
                <form action={signOutAction}><button className="hover:opacity-70">{labels.signOut}</button></form>
              </>
            ) : (
              <>
                <Link href="/account/login" onClick={close} className="hover:opacity-70">{labels.login}</Link>
                <Link href="/account/signup" onClick={close} className="hover:opacity-70">{labels.signup}</Link>
              </>
            )}
            <a href={`https://instagram.com/${instagram.replace(/^@/, "")}`} target="_blank" rel="noreferrer" className="hover:opacity-70" aria-label={`Instagram ${brandName}`}>{instagram}</a>
          </div>

          {/* 언어 + 장바구니 */}
          <div className="mt-4 flex items-center justify-between">
            <LangToggle locale={locale} />
            <span onClick={close}><CartLink label={labels.cart} /></span>
          </div>
        </div>
      </aside>
    </div>
  );
}
