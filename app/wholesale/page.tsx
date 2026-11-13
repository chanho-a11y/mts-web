import Link from "next/link";
import B2bCta from "@/components/b2b-cta";
import JsonLd from "@/components/json-ld";
import ProductCard from "@/components/product-card";
import { getStorefrontContext } from "@/lib/storefront";
import { getCategories } from "@/lib/queries";
import { absoluteUrl, breadcrumbJsonLd, faqJsonLd, siteBaseUrl, DEFAULT_OG_IMAGE } from "@/lib/seo";

// 카페 원두 납품 안내(D-168). "카페 원두 납품", "원두 도매" 질의에 검색과 AI 가 인용할 단일 페이지.
// 문구 규칙: 지역명, 로스팅과 출고 요일, 제품 용량, 긴 줄표, 가운뎃점 금지(D-147, D-167).
export const dynamic = "force-dynamic";

const DESC_KO =
  "MTSPACE COFFEE 카페 원두 납품 안내. 시그니쳐 블렌드와 싱글 오리진 정기 납품, 매장 전용 블렌드 OEM 계약 로스팅, 바리스타 교육과 오픈 지원까지. 소량으로 시작하는 카페도 납품 가능합니다.";
const DESC_EN =
  "Wholesale coffee supply from MTSPACE COFFEE: signature blends and single origins for cafes, custom blend contract roasting (OEM), barista training and opening support. Small cafes are welcome.";

export async function generateMetadata() {
  const { locale } = await getStorefrontContext();
  const en = locale === "en";
  const title = en ? "Wholesale Coffee for Cafes: Blends, Single Origins, OEM" : "카페 원두 납품: 블렌드, 싱글 오리진, OEM 계약 로스팅";
  const description = en ? DESC_EN : DESC_KO;
  return {
    title,
    description,
    alternates: { canonical: "/wholesale" },
    openGraph: { title: `${title} | MTSPACE COFFEE`, description, type: "website", url: "/wholesale", siteName: "MTSPACE COFFEE", locale: en ? "en_US" : "ko_KR", images: [DEFAULT_OG_IMAGE] },
  };
}

const C = {
  ko: {
    tag: "WHOLESALE FOR CAFES",
    h1: "카페 원두 납품",
    sub: "매장의 기준이 되는 커피를, 매번 같은 품질로 공급합니다.",
    intro: [
      "MTSPACE COFFEE는 2016년 호주 시드니에서 시작해 2022년 한국에 자리 잡은 스페셜티 커피 로스터리입니다. 시드니에서 검증한 생두 구성과 로스팅 레시피를 그대로 이어 갑니다.",
      "카페, 레스토랑, 오피스에 시그니쳐 블렌드와 싱글 오리진을 납품하고, 원하는 매장에는 전용 블렌드를 계약 로스팅으로 만들어 공급합니다.",
    ],
    offerH: "납품 서비스",
    offers: [
      { t: "정기 납품", d: "에티오피아 베이스 시그니쳐 블렌드, 디카페인, 라이트 로스팅 싱글 오리진을 매장 메뉴에 맞춰 구성합니다. 블렌드 차이는 블렌드 4종 비교 글에서 확인할 수 있습니다.", href: "/blogs/coffeelog/blog-blend-4-comparison", link: "블렌드 4종 비교 보기" },
      { t: "전용 블렌드 OEM", d: "매장의 방향에 맞춘 프로필을 설계하고 컵 검증을 거쳐 정기 공급까지 책임지는 계약 로스팅입니다.", href: "/blogs/coffeelog/blog-cafe-custom-blend-oem", link: "OEM 제작 과정 보기" },
      { t: "교육과 오픈 지원", d: "기준 레시피 정리, 바리스타 교육, 오픈 후 커피 컨설팅을 함께 진행할 수 있습니다. 범위는 상담에서 정합니다.", href: "/consulting", link: "컨설팅과 교육 보기" },
    ],
    whyH: "MTSPACE 납품의 기준",
    why: [
      { t: "미리 볶아 쌓아 두지 않습니다", d: "주문에 맞춰 정해진 주기로 로스팅하기 때문에 매장은 입고 시점을 예측하고 재고와 발주를 계획할 수 있습니다." },
      { t: "봉투 위아래 맛이 같도록", d: "모든 블렌드는 에티오피아 생두를 베이스로 하고, 크기가 비슷한 생두끼리 블렌딩해 배송 중 흔들려도 콩이 크기별로 갈리지 않게 합니다." },
      { t: "소량으로 시작해도 됩니다", d: "작은 카페도 납품을 받을 수 있습니다. 발주량과 주기는 상담에서 매장 상황에 맞춰 정합니다." },
    ],
    stepsH: "납품 진행 순서",
    steps: [
      "납품 문의를 남기거나 사업자 회원으로 가입합니다.",
      "매장 정보에 맞춰 상담하고 샘플과 납품 조건을 안내합니다.",
      "사업자 확인이 끝나면 회원 계정에 도매가가 바로 적용됩니다.",
      "도매가로 바로 주문하고, 정한 주기에 맞춰 정기 공급을 받습니다.",
    ],
    productsH: "사업자 전용 상품",
    productsMore: "사업자 전용 상품 전체 보기",
    faqH: "납품 자주 묻는 질문",
    faq: [
      { q: "작은 카페도 원두 납품을 받을 수 있나요?", a: "네. 소량으로 시작하는 카페도 납품을 받을 수 있습니다. 발주량과 주기는 상담에서 매장 상황에 맞춰 정합니다." },
      { q: "도매가는 어떻게 확인하나요?", a: "사업자 회원으로 가입하면 사업자등록증 확인 후 회원 계정에 도매가가 바로 적용되고, 그 가격으로 바로 주문할 수 있습니다." },
      { q: "샘플을 받아볼 수 있나요?", a: "납품 문의에 매장 정보를 남겨 주시면 샘플과 납품 조건을 안내해 드립니다." },
      { q: "우리 매장 전용 블렌드를 만들 수 있나요?", a: "네. 계약 로스팅(OEM)으로 프로필 설계, 컵 검증, 정기 공급까지 진행합니다." },
      { q: "원두는 어떤 기준으로 로스팅하나요?", a: "시드니에서 검증한 생두 구성과 로스팅 레시피를 그대로 씁니다. 블렌드는 에티오피아 베이스이고, 싱글 오리진은 라이트 로스팅입니다." },
      { q: "바리스타 교육도 받을 수 있나요?", a: "바리스타 교육과 오픈 후 커피 컨설팅을 함께 진행할 수 있습니다. 범위와 일정은 상담에서 정합니다." },
    ],
  },
  en: {
    tag: "WHOLESALE FOR CAFES",
    h1: "Wholesale Coffee for Cafes",
    sub: "The coffee your bar is built on, delivered at the same quality every time.",
    intro: [
      "MTSPACE COFFEE is a specialty roastery that began in Sydney, Australia in 2016 and settled in Korea in 2022. We carry on the green coffee selection and roast recipes proven in Sydney.",
      "We supply signature blends and single origins to cafes, restaurants and offices, and roast custom blends under contract for venues that want their own.",
    ],
    offerH: "What we offer",
    offers: [
      { t: "Regular supply", d: "Ethiopia-based signature blends, decaf and light-roasted single origins, put together around your menu.", href: "/blogs/coffeelog/blog-blend-4-comparison", link: "Compare our four blends" },
      { t: "Custom blend OEM", d: "Contract roasting that takes a profile from design and cup validation through to regular supply.", href: "/blogs/coffeelog/blog-cafe-custom-blend-oem", link: "How OEM works" },
      { t: "Training and opening support", d: "Recipe standards, barista training and post-opening coffee consulting, scoped together with you.", href: "/consulting", link: "Consulting and training" },
    ],
    whyH: "How we supply",
    why: [
      { t: "We do not roast ahead and stockpile", d: "We roast to order on a set cycle, so you can predict deliveries and plan stock and ordering." },
      { t: "The same cup from top to bottom of the bag", d: "Every blend has an Ethiopian base, and we blend beans of similar size so they do not separate in transit." },
      { t: "Small volumes are fine", d: "Small cafes can order wholesale too. Volume and ordering cycle are agreed with you." },
    ],
    stepsH: "How it works",
    steps: [
      "Send a wholesale inquiry or register as a business.",
      "We talk through your venue and send samples and supply terms.",
      "Once your business is verified, wholesale pricing is applied to your account straight away.",
      "Order at wholesale prices and receive regular supply on the cycle we agree.",
    ],
    productsH: "Wholesale products",
    productsMore: "See all wholesale products",
    faqH: "Wholesale FAQ",
    faq: [
      { q: "Can a small cafe order wholesale?", a: "Yes. Cafes starting with small volumes are welcome. Volume and ordering cycle are agreed with you." },
      { q: "How do I see wholesale prices?", a: "Register as a business. Once we verify your business registration, wholesale pricing is applied to your account and you can order straight away." },
      { q: "Can I get samples?", a: "Leave your venue details in a wholesale inquiry and we will send samples and supply terms." },
      { q: "Can you make a blend just for our venue?", a: "Yes. Through contract roasting (OEM) we handle profile design, cup validation and regular supply." },
      { q: "How is the coffee roasted?", a: "We use the green coffee selection and roast recipes proven in Sydney. Blends are Ethiopia-based and single origins are light roasted." },
      { q: "Do you offer barista training?", a: "Barista training and post-opening coffee consulting are available. Scope and schedule are agreed with you." },
    ],
  },
} as const;

export default async function WholesalePage() {
  const { locale, storefrontId } = await getStorefrontContext();
  const en = locale === "en";
  const c = en ? C.en : C.ko;
  const categories = await getCategories(storefrontId);
  const products = (categories.find((x) => x.slug === "wholesale")?.products ?? []).slice(0, 8);
  const base = siteBaseUrl();
  const service = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: c.h1,
    serviceType: en ? "Wholesale specialty coffee supply" : "카페 원두 납품",
    description: en ? DESC_EN : DESC_KO,
    url: absoluteUrl("/wholesale"),
    areaServed: { "@type": "Country", name: "KR" },
    audience: { "@type": "BusinessAudience", audienceType: en ? "Cafes, restaurants, offices" : "카페, 레스토랑, 오피스" },
    provider: { "@type": "Organization", name: "MTSPACE COFFEE", url: base },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: c.productsH,
      itemListElement: products.map((p) => ({ "@type": "Offer", itemOffered: { "@type": "Product", name: en && p.title_en ? p.title_en : p.title_ko, url: absoluteUrl(`/products/${p.slug}`) } })),
    },
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <JsonLd data={[
        service,
        faqJsonLd(c.faq.map((f) => ({ q: f.q, a: f.a }))),
        breadcrumbJsonLd([{ name: en ? "Home" : "홈", path: "/" }, { name: c.h1, path: "/wholesale" }]),
      ]} />
      <p className="text-[10px] uppercase tracking-[0.2em] text-inkSoft">{c.tag}</p>
      <h1 className="mt-2 font-serif text-3xl font-bold text-ink md:text-4xl">{c.h1}</h1>
      <p className="mt-3 text-lg text-ink/80">{c.sub}</p>
      <div className="mt-6 space-y-3 text-[15px] leading-relaxed text-ink/90">
        {c.intro.map((t) => <p key={t}>{t}</p>)}
      </div>

      <section className="mt-12">
        <h2 className="font-serif text-xl font-bold text-ink">{c.offerH}</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {c.offers.map((o) => (
            <div key={o.t} className="rounded-card border border-line bg-paper p-5">
              <h3 className="font-semibold text-ink">{o.t}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-inkSoft">{o.d}</p>
              <Link href={o.href} className="mt-3 inline-block text-[13px] font-semibold text-ink underline underline-offset-4">{o.link}</Link>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-serif text-xl font-bold text-ink">{c.whyH}</h2>
        <dl className="mt-5 grid gap-4 md:grid-cols-3">
          {c.why.map((w) => (
            <div key={w.t} className="rounded-card border border-line bg-oatLight p-5">
              <dt className="font-semibold text-ink">{w.t}</dt>
              <dd className="mt-2 text-[14px] leading-relaxed text-inkSoft">{w.d}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-12">
        <h2 className="font-serif text-xl font-bold text-ink">{c.stepsH}</h2>
        <ol className="mt-5 space-y-3">
          {c.steps.map((s, i) => (
            <li key={s} className="flex gap-3 text-[15px] text-ink/90">
              <span className="font-mono text-sm text-inkSoft">{String(i + 1).padStart(2, "0")}</span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
      </section>

      {products.length > 0 && (
        <section className="mt-12">
          <h2 className="font-serif text-xl font-bold text-ink">{c.productsH}</h2>
          <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
            {products.map((p) => <ProductCard key={p.slug} p={p} locale={locale} compact />)}
          </div>
          <Link href="/collections/wholesale" className="mt-4 inline-block text-[13px] font-semibold text-ink underline underline-offset-4">{c.productsMore}</Link>
        </section>
      )}

      <section className="mt-12 border-t border-line pt-8">
        <h2 className="font-serif text-xl font-bold text-ink">{c.faqH}</h2>
        <dl className="mt-5 space-y-4">
          {c.faq.map((f) => (
            <div key={f.q} className="rounded-card border border-line bg-paper p-5">
              <dt className="font-semibold text-ink">{f.q}</dt>
              <dd className="mt-2 text-[14.5px] leading-relaxed text-inkSoft">{f.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <B2bCta locale={locale} source="wholesale" />
    </main>
  );
}
