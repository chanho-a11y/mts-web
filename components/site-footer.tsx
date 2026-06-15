import type { Brand } from "@/lib/brands";

// 법정 판매자 정보 (공통). 로스터리는 가평이나 사업자 주소/통신판매업은 별도 등록정보.
export default function SiteFooter({ brand }: { brand: Brand }) {
  return (
    <footer className="mt-24 border-t border-neutral-200 bg-neutral-50">
      <div className="mx-auto max-w-6xl px-4 py-10 text-xs leading-relaxed text-neutral-600">
        <div className="mb-4 flex gap-4">
          <a href="https://instagram.com/mtspacecoffee" target="_blank" rel="noreferrer">@mtspacecoffee</a>
          <a href="https://instagram.com/normcorecoffee_official" target="_blank" rel="noreferrer">@normcorecoffee_official</a>
        </div>
        <p>
          (주)엠티에스솔루션스 MTS Solutions Co., Ltd. · 대표 홍찬호 · 사업자등록번호 653-81-02761 ·
          통신판매업 신고 제2022-인천부평-2097호 · 소재지 인천시 부평구 부평대로 337, 1031호 ·
          개인정보관리책임자 홍찬호 · 대표번호 010-4972-2312 · hello@mtspace.coffee
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <a href="/policies/refund-policy">환불 정책</a>
          <a href="/policies/privacy-policy">개인정보처리방침</a>
          <a href="/policies/terms-of-service">서비스 약관</a>
          <a href="/policies/shipping-policy">배송 정책</a>
          <a href="/faq">FAQ</a>
        </div>
        <p className="mt-4 opacity-60">© 2026 {brand.name}. All Rights Reserved.</p>
      </div>
    </footer>
  );
}
