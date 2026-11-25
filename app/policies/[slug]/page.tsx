import { notFound } from "next/navigation";
import { seoText } from "@/lib/seo-text";
import { getStorefrontContext } from "@/lib/storefront";

export const dynamic = "force-dynamic";

const POLICIES: Record<string, { title: string; body: string }> = {
  "refund-policy": {
    title: "환불 정책",
    body: "신선식품(원두) 특성상, 미개봉이고 원두 상태가 훼손되지 않은 경우에 한해 수령 후 7일 이내 교환과 환불이 가능합니다. 단순 변심에 의한 환불 시 왕복 배송비가 부과될 수 있으며, 개봉·분쇄된 제품은 환불이 제한됩니다.",
  },
  "shipping-policy": {
    title: "배송 정책",
    body: "MTSPACE COFFEE는 자체 로스터리에서 로스팅한 원두를 주문 순서대로 출고합니다(가장 신선한 배치, 최대 7일 이내 발송). 국내는 롯데택배로 출고 후 1~2일 소요됩니다. 해외는 커피 원두에 한해 EMS 프리미엄으로 배송합니다.",
  },
  "privacy-policy": {
    title: "개인정보처리방침",
    body: "(주)엠티에스솔루션스는 관련 법령에 따라 최소한의 개인정보만 수집, 이용하며, 수집 목적 달성 후 지체 없이 파기합니다. 개인정보관리책임자: 홍찬호. 자세한 사항은 고객센터로 문의해주세요.",
  },
  "terms-of-service": {
    title: "서비스 약관",
    body: "본 약관은 (주)엠티에스솔루션스가 운영하는 온라인 스토어 이용에 관한 조건과 절차를 규정합니다. 회원은 관련 법령 및 본 약관을 준수해야 합니다.",
  },
  "contact-information": {
    title: "연락처 정보",
    body: "(주)엠티에스솔루션스 · 대표 홍찬호 · 사업자등록번호 653-81-02761 · 통신판매업 신고 제2026-경기가평-129호 · 소재지 경기도 가평군 청평면 톳골길 3 · 대표번호 010-4972-2312 · hello@mtspace.coffee",
  },
  "legal-notice": {
    title: "법적 고지 사항",
    body: "본 사이트의 모든 콘텐츠(상표, 로고, 제품명, 텍스트, 이미지)에 대한 저작권 및 지식재산권은 (주)엠티에스솔루션스에 귀속되며, 무단 복제·배포·2차 가공을 금합니다.\n\n표시·광고: 본 사이트의 상품 정보는 표시광고의 공정화에 관한 법률을 준수합니다. 원산지·로스팅 정보는 입고 배치에 따라 변경될 수 있습니다.\n\n전자상거래: 본 스토어는 전자상거래 등에서의 소비자보호에 관한 법률 및 통신판매 관련 법령을 준수합니다. 통신판매업 신고 제2026-경기가평-129호.\n\n면책: 추출 레시피·풍미 설명은 권장 가이드이며 개인 환경에 따라 결과가 다를 수 있습니다.",
  },
};

// EN 사이트(쿠키 locale=en)용 영문판. 법적 효력은 국문판 기준임을 명시한다.
const POLICIES_EN: Record<string, { title: string; body: string }> = {
  "refund-policy": {
    title: "Refund policy",
    body: "Because roasted coffee is a fresh food product, exchanges and refunds are available within 7 days of delivery only when the bag is unopened and the beans are undamaged. For change-of-mind returns, return shipping in both directions may be charged. Opened or ground products cannot be refunded.",
  },
  "shipping-policy": {
    title: "Shipping policy",
    body: "MTSPACE COFFEE ships coffee roasted at our own roastery in order sequence (the freshest available batch, dispatched within 7 days at most). Domestic orders in Korea ship with Lotte Global Logistics and arrive 1 to 2 days after dispatch. International orders (coffee beans only) ship with EMS Premium; customs and local delivery can add time.",
  },
  "privacy-policy": {
    title: "Privacy policy",
    body: "MTS Solutions Co., Ltd. collects and uses only the minimum personal information required under applicable law, and destroys it without delay once the purpose of collection has been fulfilled. Privacy Officer: Chanho Hong. For details, please contact us at hello@mtspace.coffee.",
  },
  "terms-of-service": {
    title: "Terms of service",
    body: "These terms set out the conditions and procedures for using the online store operated by MTS Solutions Co., Ltd. Members must comply with applicable law and these terms.",
  },
  "contact-information": {
    title: "Contact information",
    body: "MTS Solutions Co., Ltd. | CEO Chanho Hong | Business Registration No. 653-81-02761 | Mail-order Sales Registration No. 2026-Gyeonggi-Gapyeong-129 | 3 Totgol-gil, Cheongpyeong-myeon, Gapyeong-gun, Gyeonggi-do, Korea | Tel +82-10-4972-2312 | hello@mtspace.coffee",
  },
  "legal-notice": {
    title: "Legal notice",
    body: "Copyright and intellectual property rights in all content on this site (trademarks, logos, product names, text and images) belong to MTS Solutions Co., Ltd. Unauthorised copying, distribution or derivative use is prohibited.\n\nProduct information: product information on this site complies with the Korean Act on Fair Labeling and Advertising. Origin and roasting details may change with each incoming batch.\n\nE-commerce: this store complies with the Korean Act on Consumer Protection in Electronic Commerce and related mail-order laws. Mail-order Sales Registration No. 2026-Gyeonggi-Gapyeong-129.\n\nDisclaimer: brew recipes and flavour descriptions are recommended guides, and results may vary with your equipment and environment.",
  },
};
const EN_NOTE = "This English version is provided for convenience. If it differs from the Korean version, the Korean version prevails.";

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const { locale } = await getStorefrontContext();
  const policy = (locale === "en" ? POLICIES_EN : POLICIES)[params.slug];
  if (!policy) return { title: locale === "en" ? "Policy" : "정책" };
  // 정책마다 고유한 설명문과 자기 경로 canonical 을 준다(D-134).
  const flat = seoText(policy.body.replace(/\s+/g, " "));
  const description = flat.length > 150 ? `${flat.slice(0, 149)}…` : flat;
  const path = `/policies/${params.slug}`;
  return {
    title: policy.title,
    description,
    alternates: { canonical: path },
    openGraph: { title: `${policy.title} | MTSPACE COFFEE`, description, type: "website", url: path, siteName: "MTSPACE COFFEE", locale: locale === "en" ? "en_US" : "ko_KR", images: ["/images/og-default.png"] },
  };
}

export default async function PolicyPage({ params }: { params: { slug: string } }) {
  const { locale } = await getStorefrontContext();
  const policy = (locale === "en" ? POLICIES_EN : POLICIES)[params.slug];
  if (!policy) notFound();
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-bold">{policy.title}</h1>
      <p className="mt-6 whitespace-pre-line leading-relaxed text-neutral-700">{policy.body}</p>
      {locale === "en" && <p className="mt-8 text-xs text-neutral-500">{EN_NOTE}</p>}
    </main>
  );
}
