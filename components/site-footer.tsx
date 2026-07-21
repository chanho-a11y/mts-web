import type { Brand } from "@/lib/brands";
import NewsletterForm from "@/components/newsletter-form";

// 법정 판매자 정보 (공통). 로스터리·사업자 등록지 모두 경기도 가평 청평으로 통일(2026-06 결정).
export default function SiteFooter({ brand, bg, phone, email }: { brand: Brand; bg?: string; phone?: string; email?: string }) {
  const tel = phone || "010-4972-2312";
  const mail = email || "hello@mtspace.coffee";
  return (
    <footer className="mt-24 border-t border-line bg-sand" style={bg ? { background: bg } : undefined}>
      <div className="mx-auto max-w-6xl px-4 py-12 text-xs leading-relaxed text-inkSoft">
        <div className="mb-6">
          <p className="mt-wordmark text-base text-ink">MTSPACE<span className="light"> COFFEE</span></p>
          <p className="mt-tagline mt-1 text-[10px]">everyday excellence</p>
        </div>
        <NewsletterForm />
        <div className="mb-4 flex gap-4">
          <a href="https://instagram.com/mtspacecoffee" target="_blank" rel="noreferrer">@mtspacecoffee</a>
        </div>
        <p>
          (주)엠티에스솔루션스 MTS Solutions Co., Ltd. · 대표 홍찬호 · 사업자등록번호 653-81-02761 ·
          통신판매업 신고 제2026-경기가평-129호 · 소재지 경기도 가평군 청평면 톳골길 3 ·
          개인정보관리책임자 홍찬호 · 대표번호 {tel} · {mail}
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <a href="/policies/refund-policy">환불 정책</a>
          <a href="/policies/privacy-policy">개인정보처리방침</a>
          <a href="/policies/terms-of-service">서비스 약관</a>
          <a href="/policies/shipping-policy">배송 정책</a>
          <a href="/policies/contact-information">연락처 정보</a>
          <a href="/policies/legal-notice">법적 고지</a>
          <a href="/faq">FAQ</a>
        </div>
        <div className="mt-4">
          <p className="opacity-60">© 2026 {brand.name}. All Rights Reserved.</p>
        </div>
      </div>
    </footer>
  );
}
