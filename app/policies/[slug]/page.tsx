import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

const POLICIES: Record<string, { title: string; body: string }> = {
  "refund-policy": {
    title: "환불 정책",
    body: "신선식품(원두) 특성상, 미개봉·원두 상태가 훼손되지 않은 경우에 한해 수령 후 7일 이내 교환·환불이 가능합니다. 단순 변심에 의한 환불 시 왕복 배송비가 부과될 수 있으며, 개봉·분쇄된 제품은 환불이 제한됩니다.",
  },
  "shipping-policy": {
    title: "배송 정책",
    body: "MTSPACE COFFEE는 경기도 가평 자체 로스터리에서 매주 월·화 로스팅하며, 신선도를 위해 화·수에 순차 출고합니다(가장 신선한 배치, 최대 7일 이내 발송). 국내는 롯데택배로 출고 후 1~2일 소요됩니다. 해외는 커피 원두에 한해 EMS 프리미엄으로 배송합니다.",
  },
  "privacy-policy": {
    title: "개인정보처리방침",
    body: "(주)엠티에스솔루션스는 관련 법령에 따라 최소한의 개인정보만 수집·이용하며, 수집 목적 달성 후 지체 없이 파기합니다. 개인정보관리책임자: 홍찬호. 자세한 사항은 고객센터로 문의해주세요.",
  },
  "terms-of-service": {
    title: "서비스 약관",
    body: "본 약관은 (주)엠티에스솔루션스가 운영하는 온라인 스토어 이용에 관한 조건과 절차를 규정합니다. 회원은 관련 법령 및 본 약관을 준수해야 합니다.",
  },
  "contact-information": {
    title: "연락처 정보",
    body: "(주)엠티에스솔루션스 · 대표 홍찬호 · 사업자등록번호 653-81-02761 · 통신판매업 신고 제2022-인천부평-2097호 · 대표번호 010-4972-2312 · hello@mtspace.coffee",
  },
  "legal-notice": {
    title: "법적 고지 사항",
    body: "본 사이트의 모든 콘텐츠(상표, 로고, 제품명, 텍스트, 이미지)에 대한 저작권 및 지식재산권은 (주)엠티에스솔루션스에 귀속되며, 무단 복제·배포·2차 가공을 금합니다.\n\n표시·광고: 본 사이트의 상품 정보는 표시광고의 공정화에 관한 법률을 준수합니다. 원산지·로스팅 정보는 입고 배치에 따라 변경될 수 있습니다.\n\n전자상거래: 본 스토어는 전자상거래 등에서의 소비자보호에 관한 법률 및 통신판매 관련 법령을 준수합니다. 통신판매업 신고 제2022-인천부평-2097호.\n\n면책: 추출 레시피·풍미 설명은 권장 가이드이며 개인 환경에 따라 결과가 다를 수 있습니다.",
  },
};

export function generateMetadata({ params }: { params: { slug: string } }) {
  return { title: POLICIES[params.slug]?.title ?? "정책" };
}

export default function PolicyPage({ params }: { params: { slug: string } }) {
  const policy = POLICIES[params.slug];
  if (!policy) notFound();
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-bold">{policy.title}</h1>
      <p className="mt-6 whitespace-pre-line leading-relaxed text-neutral-700">{policy.body}</p>
    </main>
  );
}
