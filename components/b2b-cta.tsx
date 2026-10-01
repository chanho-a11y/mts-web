"use client";
import Link from "next/link";

// 납품문의 + 사업자 가입 공통 CTA (D-129).
// 블로그, 교육자료(국/영), 상품 상세, 컨설팅, 브랜드 소개 하단에 같은 블록을 둔다.
// 클릭 시 GA4 이벤트 b2b_cta_click(cta=wholesale_inquiry|business_signup, cta_source=페이지 유형, cta_path=경로)를 보낸다.
// 주간 마케팅 보고(MCP commerce_run_report: web_traffic)가 이 이벤트를 집계한다.

type Gtag = (...args: unknown[]) => void;
type Source = "blog" | "education" | "product" | "consulting" | "about";

const COPY = {
  ko: {
    tag: "FOR CAFES & BUSINESSES",
    h: "매장에서 이 커피를 쓰고 싶으신가요?",
    p: "매주 월, 화 로스팅하고 화, 수 출고합니다. 납품 조건과 샘플은 문의로, 도매가 확인은 사업자 가입 후 승인으로 진행됩니다.",
    inquiry: "납품 문의하기",
    signup: "사업자 회원 가입",
  },
  en: {
    tag: "FOR CAFES & BUSINESSES",
    h: "Want to serve this coffee at your venue?",
    p: "Roasted every Monday and Tuesday, shipped Tuesday and Wednesday. Ask us about supply terms and samples, or register as a business to see wholesale pricing after approval.",
    inquiry: "Wholesale inquiry",
    signup: "Register as a business",
  },
} as const;

export default function B2bCta({ locale = "ko", source }: { locale?: string; source: Source }) {
  const c = locale === "en" ? COPY.en : COPY.ko;
  const track = (cta: "wholesale_inquiry" | "business_signup") => {
    try {
      const gtag = (window as unknown as { gtag?: Gtag }).gtag;
      if (typeof gtag === "function") {
        gtag("event", "b2b_cta_click", { cta, cta_source: source, cta_path: window.location.pathname });
      }
    } catch {
      // 계측 실패가 이동을 막으면 안 된다
    }
  };
  const q = `src=${source}`;
  return (
    <section className="mt-12 rounded-card border border-line bg-oatLight px-6 py-8 text-center" aria-label={c.h}>
      <p className="text-[10px] uppercase tracking-[0.2em] text-inkSoft">{c.tag}</p>
      <h2 className="mt-2 text-lg font-bold text-ink">{c.h}</h2>
      <p className="mx-auto mt-2 max-w-xl text-[14px] leading-relaxed text-ink/80">{c.p}</p>
      <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link
          href={`/contact?type=wholesale&${q}`}
          onClick={() => track("wholesale_inquiry")}
          className="w-full rounded-card bg-ink px-6 py-2.5 text-sm font-semibold text-oat hover:bg-[#4A443A] sm:w-auto"
        >
          {c.inquiry}
        </Link>
        <Link
          href={`/account/signup?role=business&${q}`}
          onClick={() => track("business_signup")}
          className="w-full rounded-card border border-ink bg-transparent px-6 py-2.5 text-sm font-semibold text-ink hover:bg-oat sm:w-auto"
        >
          {c.signup}
        </Link>
      </div>
    </section>
  );
}
