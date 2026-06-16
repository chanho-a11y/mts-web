import type { Brand } from "@/lib/brands";
import { subscribeNewsletterAction } from "@/app/newsletter-action";

// 법정 판매자 정보 (공통). 로스터리는 가평이나 사업자 주소/통신판매업은 별도 등록정보.
export default function SiteFooter({ brand, bg, phone, email }: { brand: Brand; bg?: string; phone?: string; email?: string }) {
  const tel = phone || "010-4972-2312";
  const mail = email || "hello@mtspace.coffee";
  return (
    <footer className="mt-24 border-t border-neutral-200 bg-neutral-50" style={bg ? { background: bg } : undefined}>
      <div className="mx-auto max-w-6xl px-4 py-10 text-xs leading-relaxed text-neutral-600">
        <form action={subscribeNewsletterAction} className="mb-6 flex max-w-sm gap-2">
          <input type="email" name="email" required placeholder="뉴스레터 구독 (이메일)"
            className="flex-1 rounded-full border px-4 py-2 text-xs" />
          <button className="rounded-full bg-ink px-4 py-2 text-xs text-white">구독</button>
        </form>
        <div className="mb-4 flex gap-4">
          <a href="https://instagram.com/mtspacecoffee" target="_blank" rel="noreferrer">@mtspacecoffee</a>
          <a href="https://instagram.com/normcorecoffee_official" target="_blank" rel="noreferrer">@normcorecoffee_official</a>
        </div>
        <p>
          (주)엠티에스솔루션스 MTS Solutions Co., Ltd. · 대표 홍찬호 · 사업자등록번호 653-81-02761 ·
          통신판매업 신고 제2022-인천부평-2097호 · 소재지 인천시 부평구 부평대로 337, 1031호 ·
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
        <p className="mt-4 opacity-60">© 2026 {brand.name}. All Rights Reserved.</p>
      </div>
    </footer>
  );
}
