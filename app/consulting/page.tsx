import Link from "next/link";
import { getStorefrontContext } from "@/lib/storefront";
import { getPageSettings } from "@/lib/page-content";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Consulting & Partnership — MTSPACE COFFEE 브랜드·운영·로스팅 파트너",
  description:
    "호주 시드니 Normcore Coffee에서 시작해 성장한 MTSPACE COFFEE의 컨설팅·파트너십. 브랜드 전략, 데이터·POS 분석, 운영 SOP, 계약 로스팅, 매장 운영 대행, 바리스타 교육까지 — 검증된 노하우를 전수합니다.",
};

const C = {
  ko: {
    tagline: "everyday excellence", h1: "Consulting & Partnership",
    sub: "시드니에서 시작해 검증한 노하우를, 그대로 전수합니다",
    intro1: "MTSPACE COFFEE는 호주 시드니에서 시작된 Normcore Coffee에서 출발했습니다. 시드니 스페셜티 커피 씬과 경쟁 무대에서 검증된 기술을 한국으로 가져와, 경기도 가평 청평의 자체 로스터리를 토대로 시그니쳐 블렌드·싱글 오리진·사업자 도매·컨설팅까지 아우르는 브랜드로 성장했습니다.",
    intro2: "우리는 그 성장 과정에서 쌓은 브랜드·운영·로스팅·추출의 노하우를 파트너에게 그대로 전수합니다. 한 잔의 맛부터 매장의 숫자까지, 데이터로 설계하고 검증된 방식으로 함께 성장하는 것 — 그것이 MTSPACE의 컨설팅입니다.",
    svcH: "컨설팅 — 3대 서비스", partH: "파트너십",
    partSub: "단발성 자문이 아니라, 로스팅·공급·운영을 함께 책임지는 장기 파트너십을 지향합니다.",
    eduH: "바리스타 교육",
    eduP1: "초급 바리스타부터 바리스타 챔피언십·브루어스 컵 등 대회 출전 선수까지, 수준에 맞춘 단계별 트레이닝을 제공합니다. 기본기·추출·센서리부터 대회 루틴 설계와 무대 세팅까지 커버합니다.",
    eduP2: "호주와 한국의 다양한 대회에서 검증된 추출·세팅·센서리 스킬과 노하우를 직접 전수합니다. V60 추출의 고유 방법인 ‘Chanho-Tornado’를 비롯한 경쟁 무대의 실전 노하우를 함께 훈련합니다.",
    ctaTag: "be a partner of MTSPACE",
    ctaP: "안정적인 공급과 균일한 품질로, 당신의 커피 비즈니스가 매일의 탁월함을 지킬 수 있도록 함께합니다.",
    ctaBtn: "컨설팅 · 파트너십 문의",
    packages: [
      { no: "01", title: "브랜드 전략", img: "/images/consulting-strategy.jpg", desc: "포지셔닝·네이밍·비주얼 아이덴티티부터 메뉴 설계까지. 시장 데이터와 16년 로스팅·운영 경험을 바탕으로 카페의 정체성을 설계합니다." },
      { no: "02", title: "데이터 · POS 분석", img: "/images/consulting-data.jpg", desc: "POS·매출 데이터를 분석해 메뉴 구성, 가격 정책, 재고·발주 흐름을 진단합니다. 감이 아닌 숫자로 의사결정하도록 돕습니다." },
      { no: "03", title: "운영 · SOP", img: "/images/consulting-ops.jpg", desc: "추출 레시피 표준화, 바 세팅, 위생·품질 관리 SOP를 정립해 매장 어디서나 균일한 한 잔이 나오도록 시스템화합니다." },
    ],
    partnerships: [
      { title: "계약 로스팅 (OEM/ODM)", desc: "브랜드 전용 블렌드를 함께 개발하고, 가평 로스터리에서 매주 월·화 로스팅해 화·수 출고로 안정 공급합니다. 프로파일 설계·컵 프로파일 검증·라벨 표기까지 일괄 지원합니다." },
      { title: "매장 운영 대행", desc: "입지·컨셉 진단, 바 설계와 장비 세팅, 오픈 준비부터 인력 교육·SOP 정립까지. 오픈 이후에도 데이터 기반으로 메뉴·가격·발주를 함께 운영합니다." },
      { title: "공동 브랜드 개발", desc: "MTSPACE의 로스팅·기술 토대 위에 파트너의 자산을 결합해 새로운 커피 브랜드를 설계합니다. 브랜드 전략·제품 라인업·패키지·출시 로드맵을 함께 만듭니다." },
      { title: "해외 브랜드 한국 진출", desc: "해외 커피 브랜드의 한국 시장 진입을 로스팅·유통·운영·마케팅으로 지원합니다. 시드니에서 한국으로 브랜드를 안착시킨 경험을 그대로 적용합니다." },
    ],
  },
  en: {
    tagline: "everyday excellence", h1: "Consulting & Partnership",
    sub: "The know-how we proved in Sydney, passed on to you",
    intro1: "MTSPACE COFFEE began with Normcore Coffee in Sydney. We brought techniques proven on Sydney's specialty scene and competition stages to Korea, and grew — on the foundation of our own roastery in Cheongpyeong, Gapyeong — into a brand spanning signature blends, single origins, wholesale, and consulting.",
    intro2: "We pass on the brand, operations, roasting, and extraction know-how we built along the way. From the taste in the cup to the numbers on the floor — designing with data and growing through proven methods. That is MTSPACE consulting.",
    svcH: "Consulting — 3 Core Services", partH: "Partnership",
    partSub: "Not one-off advice, but a long-term partnership that shares responsibility for roasting, supply, and operations.",
    eduH: "Barista Education",
    eduP1: "From entry-level baristas to competitors in barista championships and brewers cups, we provide tiered training. We cover fundamentals, extraction, and sensory through to competition routine design and stage setup.",
    eduP2: "We directly pass on extraction, dial-in, and sensory skills proven across Korean and Australian competitions — including the signature V60 method ‘Chanho-Tornado’ and real competition-stage know-how.",
    ctaTag: "be a partner of MTSPACE",
    ctaP: "With reliable supply and consistent quality, we help your coffee business hold to everyday excellence.",
    ctaBtn: "Consulting · Partnership inquiry",
    packages: [
      { no: "01", title: "Brand Strategy", img: "/images/consulting-strategy.jpg", desc: "From positioning, naming, and visual identity to menu design. We shape a cafe's identity on market data and 16 years of roasting and operations experience." },
      { no: "02", title: "Data · POS Analysis", img: "/images/consulting-data.jpg", desc: "We analyze POS and sales data to diagnose menu mix, pricing, and inventory/ordering flow — helping you decide with numbers, not gut feel." },
      { no: "03", title: "Operations · SOP", img: "/images/consulting-ops.jpg", desc: "We standardize brew recipes, bar setup, and hygiene/quality SOPs so every location pulls a consistent cup." },
    ],
    partnerships: [
      { title: "Contract Roasting (OEM/ODM)", desc: "We co-develop brand-exclusive blends and supply reliably — roasted Mon/Tue at our Gapyeong roastery, shipped Tue/Wed. Profile design, cup verification, and labeling included." },
      { title: "Store Operations", desc: "Location and concept diagnosis, bar design and equipment setup, opening preparation through staff training and SOPs — and data-driven menu, pricing, and ordering after opening." },
      { title: "Co-Brand Development", desc: "We design new coffee brands by combining a partner's assets with MTSPACE's roasting and technical foundation — brand strategy, lineup, packaging, and launch roadmap together." },
      { title: "Overseas Brand Entry to Korea", desc: "We support overseas coffee brands entering Korea through roasting, distribution, operations, and marketing — applying our experience settling a brand from Sydney into Korea." },
    ],
  },
} as const;

export default async function ConsultingPage() {
  const { locale } = await getStorefrontContext();
  const c = C[locale];
  const s = await getPageSettings();
  const ov = locale === "ko" ? s : {} as Record<string, string>;
  const heroImg = ov.consulting_hero_image || "/images/consulting-hero.jpg";
  const intro1 = ov.consulting_intro || c.intro1;
  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <p className="mt-tagline text-[10px]">{c.tagline}</p>
      <h1 className="mt-3 text-4xl font-extrabold tracking-tight">{c.h1}</h1>
      <p className="prose-serif mt-3 text-lg italic text-clayDeep">{c.sub}</p>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={heroImg} alt="MTSPACE COFFEE Consulting" className="mt-8 aspect-[16/9] w-full rounded-card border border-line object-cover" />

      <section className="prose-serif mt-8 space-y-5 text-ink/85">
        <p>{intro1}</p>
        <p className="text-inkSoft">{c.intro2}</p>
      </section>

      <section className="mt-16">
        <h2 className="text-lg font-bold text-ink">{c.svcH}</h2>
        <div className="mt-5 grid gap-5 md:grid-cols-3">
          {c.packages.map((p) => (
            <div key={p.no} className="overflow-hidden rounded-card border border-line bg-paper">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.img} alt={p.title} className="aspect-[4/3] w-full object-cover" />
              <div className="p-5">
                <p className="font-mono text-xs uppercase tracking-wider text-clayDeep">{p.no}</p>
                <p className="mt-2 font-bold text-ink">{p.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-inkSoft">{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-16">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/consulting-partnership.jpg" alt="MTSPACE COFFEE Partnership" className="aspect-[16/9] w-full rounded-card border border-line object-cover" />
        <h2 className="mt-6 text-lg font-bold text-ink">{c.partH}</h2>
        <p className="prose-serif mt-2 text-sm leading-relaxed text-inkSoft">{c.partSub}</p>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          {c.partnerships.map((p) => (
            <div key={p.title} className="rounded-card border border-line bg-paper p-5">
              <p className="font-bold text-ink">{p.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-inkSoft">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-16">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/consulting-education.jpg" alt="Barista Education" className="aspect-[16/9] w-full rounded-card border border-line object-cover" />
        <div className="prose-serif mt-6 space-y-5 text-ink/85">
          <h2 className="text-lg font-bold text-ink">{c.eduH}</h2>
          <p>{c.eduP1}</p>
          <p className="text-inkSoft">{c.eduP2}</p>
        </div>
      </section>

      <section className="mt-16 rounded-card border border-line bg-sand px-6 py-10 text-center">
        <p className="mt-tagline text-[10px]">{c.ctaTag}</p>
        <p className="prose-serif mx-auto mt-3 max-w-xl text-[17px] leading-relaxed text-ink/80">{c.ctaP}</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/contact" className="rounded-card bg-ink px-6 py-2.5 text-sm font-semibold text-oat hover:bg-[#4A443A]">{c.ctaBtn}</Link>
        </div>
      </section>
    </main>
  );
}
