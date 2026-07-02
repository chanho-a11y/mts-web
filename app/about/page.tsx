import Link from "next/link";
import AboutMoreModal from "@/components/about-more-modal";
import { getStorefrontContext } from "@/lib/storefront";
import { getPageSettings } from "@/lib/page-content";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "About MTSPACE COFFEE — 시드니에서 시작된 한국 스페셜티 커피",
  description: "경쟁 바리스타 홍찬호 대표가 이끄는 한국 스페셜티 커피 브랜드. 2016년 시드니에서 시작해 2022년 한국에 진출하며 리브랜딩. 주 단위 로스팅, 시그니쳐 블렌드, 싱글 오리진, 사업자 전용 도매 — Everyday Excellence.",
};

// 대표 수상내역(Barista Awards) — 정본 풀리스트 (D-032, 2026-07-02 대표 제공)
const AWARDS = [
  "2025 Australian Coffee In Good Spirits Championship 3rd Place",
  "2025 Korea National Barista Championship Semifinalist",
  "2023 Korea Brewers Cup Semifinalist",
  "2022 Hario Cup International Brewing Competition 2nd Place",
  "2019 Central Regional Brewers Cup 3rd Place",
  "2018 Australian Brewers Cup 4th Place",
  "2018 Central Regional Brewers Cup CHAMPION",
  "2018 Australian Coffee In Good Spirits Championship 3rd Place",
  "2017 Australian Brewers Cup 3rd Place",
  "2017 Central Regional Brewers Cup 2nd Place",
  "2017 Central Regional Barista Championship 6th Place",
  "2017 Australian Golden Bean Award — Silver Medal, Single Origin Espresso",
  "2017 Australian Golden Bean Award — Silver Medal, Pourover Filter",
  "2016 Australian Golden Bean Award — Bronze Medal, Single Origin Espresso",
  "2016 Central Regional Barista Championship 5th Place",
  "2015 NSW Regional Barista Championship 3rd Place",
  "2015 NSW Regional Brewers Cup 4th Place",
  "2014 Australian Golden Bean Award — Bronze Medal, Single Origin Espresso",
  "2014 Australian Golden Bean Award — Bronze Medal, Pourover Filter",
  "2014 Korean Brewers Cup 3rd Place",
];

// 미디어 · 세미나 · 이벤트 내역(연도별, 최신순) — 고유명사 영문 유지, 두 로케일 공용
const EVENTS = [
  "2026 · [Event] Guest Barista at Barista Map Coffee Roasters | Osaka, Japan",
  "2026 · [Event] Sauna Pop-up collaboration with Normcore Coffee | Seoul, Korea",
  "2026 · [Event] Guest Barista at Diggy Doo’s | Sydney, Australia",
  "2026 · [Event] Guest Barista at Tattooed Sailor Coffee | Cairns, Australia",
  "2026 · [Seminar] Developing a brew method that works for both cafe & competition | Cairns, Australia",
  "2026 · [Event] About French Toast collaboration with Normcore Coffee | Seoul, Korea",
  "2025 · [Event] Collaboration with Porary Books | Seoul, Korea",
  "2025 · [Exhibition] Nucleus Coffee Tools Korea | Seoul, Korea",
  "2025 · [Pop-up] MTSPACE COFFEE launching pop-up | Seoul, Korea",
  "2024 · [Event] 2024 World of Coffee with Nucleus Coffee Tools | Busan, Korea",
  "2024 · [Seminar] Nucleus Coffee Tools Korea Tour | Seoul · Daegu · Busan, Korea",
  "2023 · [Event] 2023 World Coffee Week | Seoul · Busan, Korea",
  "2023 · [Exhibition] Seoul Cafe Show | Seoul, Korea",
  "2023 · [Exhibition] Nucleus Coffee Tools Korea | Seoul, Korea",
  "2023 · [Seminar] Nucleus Coffee Tools Korea — Boram Um, Cole Torode & Chanho Hong | Seoul, Korea",
  "2023 · [Collaboration] Namja Coffee | Seoul, Korea",
  "2023 · [Exhibition] Gangneung Coffee Festival | Gangneung, Korea",
  "2023 · [Store] Normcore Coffee Coffee Bar | Seoul, Korea",
  "2023 · [Pop-up] Hanok Cafe at Korean Cultural Centre in Sydney | Sydney, Australia",
  "2023 · [Exhibition] SCA Market in Busan | Busan, Korea",
  "2023 · [Showcase] Normcore Coffee in Seoul | Seoul, Korea",
  "2023 · [Exhibition] Chalkboy The First Exhibition in Seoul | Seoul, Korea",
  "2022 · [Showcase] Normcore Coffee in Seoul | Seoul, Korea",
  "2022 · [Exhibition] Seoul Cafe Show | Hario Korea | Seoul, Korea",
  "2022 · [Event] World Coffee Week in Seoul | Zeroth Law Showroom | Seoul, Korea",
  "2022 · [Seminar] Coffee Brewing Seminar | Momos Coffee | Busan, Korea",
  "2022 · [Seminar] Coffee Brewing Seminar | New Wave Coffee Roasters | Seoul, Korea",
  "2022 · [Exhibition] SCAJ Exhibition | Hario International | Tokyo, Japan",
  "2022 · [Exhibition] Melbourne International Coffee Expo | Hario Australia | Melbourne, Australia",
  "2022 · [Broadcast] Brunch Talk | SBS | Seoul, Korea",
  "2022 · [Pop-up] Inch Furniture Coffee Section Collaboration | Project Rent | Seoul, Korea",
  "2022 · [Pop-up] Iloom Furniture Coffee Section Collaboration | Project Rent | Seoul, Korea",
  "2022 · [Pop-up] CJ Basak Bar Cold Brew Product Collaboration | Project Rent | Seoul, Korea",
  "2022 · [Pop-up] Project Rent Greenery & Stay Coffee Section Collaboration | Seoul, Korea",
  "2022 · [Pop-up] Ebenezer Mission Coffee House Collaboration | North Rocks, Sydney, Australia",
  "2022 · [Pop-up] Ghana Chocolate House Coffee Section Collaboration | Project Rent | Seoul, Korea",
  "2022 · [Media] Ghana Chocolate House Collaboration — featured across 20+ outlets | Seoul, Korea",
  "2022 · [Pop-up] Coffee Trip — Australian Coffee (Sydney) | Lolowa Yeongdo | Busan, Korea",
  "2022 · [Media] Coffee Trip — Australian Coffee (Sydney) — featured across multiple outlets | Busan, Korea",
  "2022 · [Seminar] Australian Culture & Coffee | Lolowa Yeongdo | Busan, Korea",
  "2022 · [Exhibition] 2022 Seoul Coffee Expo | Seoul, Korea",
  "2022 · [Pop-up] Normcore Coffee Pop Up | Kumquat Coffee | Los Angeles, United States",
  "2021 · [Forum] Post-COVID, The Future of Gangneung Coffee Fest | Gangneung City | Gangneung, Korea",
  "2021 · [Broadcast] Coffee Professionals Representing Australia — Interview with SBS | Sydney, Australia",
  "2021 · [Pop-up] Australian Champions Pop Up | HOWS | Seoul, Korea",
  "2021 · [Seminar] Organisation operation that cannot fail | Seoul National University Business School | Seoul, Korea",
  "2021 · [Broadcast] Australian Culture with Australian Embassy | Arirang TV | Seoul, Korea",
  "2021 · [Media] Interview with Australian Ambassador | Munhwa Daily | Seoul, Korea",
  "2021 · [Pop-up] Normcore Coffee × Balrog Coffee Pop Up | Another Room | Seoul, Korea",
  "2021 · [Pop-up] Normcore Coffee × Balrog Coffee Pop Up | Werk Coffee | Busan, Korea",
  "2021 · [Exhibition] Representing Australian Embassy | 2021 Seoul Cafeshow | Seoul, Korea",
  "2021 · [Exhibition] Hario Korea | 2021 Seoul Cafeshow | Seoul, Korea",
  "2021 · [Exhibition] Victoria Arduino Korea | 2021 Seoul Cafeshow | Seoul, Korea",
  "2021 · [Seminar] Why Australia has become a major coffee country | 2021 Seoul Cafeshow | Seoul, Korea",
  "2021 · [Seminar] The Roastrum — Roasting Styles with Chanho Hong, Alexandru Nicolae & Anthony Nguyen | Stronghold | Online",
  "2019 · [Seminar] Coffee Talk | Momento Brewers | Seoul, Korea",
  "2019 · [Pop-up] Normcore Coffee & Market Lane Coffee Pop Up | Momento Brewers | Seoul, Korea",
  "2019 · [Seminar] Coffee Talk | Momos Coffee | Busan, Korea",
  "2019 · [Pop-up] Normcore Coffee & Market Lane Coffee Pop Up | Momos Coffee | Busan, Korea",
  "2019 · [Event] Game Changers with Rachel Peterson & Aida Battle — Roasting & Brewing | Barista Magazine | Sydney, Australia",
  "2019 · [Seminar] World Barista Champion Jooyeon’s Winning Secret | Normcore Coffee | Sydney, Australia",
  "2019 · [Event] 2019 WBC Champion’s Guest Barista | Normcore Coffee | Sydney, Australia",
  "2019 · [Media] Meet Australian Coffee Icons | Hankook Economics | Seoul, Korea",
  "2019 · [Exhibition] Hario Australia | MICE | Melbourne, Australia",
  "2019 · [Exhibition] Coffee Cocktails at Parmalat | MICE | Melbourne, Australia",
  "2019 · [Media] Chanho Hong’s Coffee Cocktails at MICE | Beanscene | Melbourne, Australia",
  "2018 · [Media] Meet a Korean Coffee Professional in Australia | KOFICE | Sydney, Australia",
  "2018 · [Seminar] Regional Champion Baristas’ Session | Normcore Coffee | Sydney, Australia",
  "2018 · [Seminar] Coffee Brewing | ECRE (CRS) | Sydney, Australia",
  "2018 · [Event] CRS × Timemore Brew Comp — Judge | ECRE (CRS) | Sydney, Australia",
  "2018 · [Media] Delicious Australia! Tasty Travel To Australia | Kyunghyang Daily | Seoul, Korea",
  "2017 · [Seminar] Coffee Brewing | Lowkey Coffee | Seoul, Korea",
  "2017 · [Broadcast] Korean Baristas Winning Australian Coffee Championships | SBS | Sydney, Australia",
  "2017 · [Media] Interview | Sydney Journal | Sydney, Australia",
  "2017 · [Event] Hacienda La Esmeralda 601 Experience — Brewing | Seven Miles Coffee | Sydney, Australia",
  "2017 · [Seminar] Quality Control Seminar | CkCo& | Seoul, Korea",
  "2016 · [Seminar] Australian Coffees | Coffee Temple | Seoul, Korea",
  "2015 · [Event] Introducing Australian Specialty Coffees | Seoul, Korea",
  "2015 · [Seminar] QC Seminar | Seoul · Busan, Korea",
];

const C = {
  ko: {
    tagline: "everyday excellence", h1: "About MTSPACE COFFEE", sub: "매일의 탁월함",
    brandH: "브랜드 소개",
    brandP1: "MTSPACE COFFEE는 2016년 호주 시드니에서 시작된 Normcore Coffee의 뿌리에서 출발한 한국 스페셜티 커피 브랜드입니다. 경쟁 바리스타인 홍찬호(Chanho Hong) 대표는 시드니에서 쌓은 로스팅·바리스타 경험을 바탕으로 2022년 한국에 진출했고, 한국 시장에 맞춰 브랜드를 새롭게 설계하며 MTSPACE COFFEE로 리브랜딩했습니다. 한국 소비자의 취향에 맞춘 시그니쳐 블렌드와 세계 각지에서 선별한 싱글 오리진을 매주 로스팅합니다.",
    brandP2ck: ["자체 로스터리에서 ", "매주 월·화요일", "에 로스팅하고, 주문은 ", "화·수요일", "에 출고되어 최상의 신선도로 배송됩니다."],
    pursuitH: "우리가 추구하는 것",
    pursuitP1: "특별한 날의 특별한 한 잔이 아닌, 매일 마시는 커피가 탁월해야 한다고 믿습니다. 원두 선정부터 로스팅 프로파일 설계, 추출 레시피 안내까지 — 일관되고 품질 높은 경험이 되도록 설계합니다. 그것이 우리가 말하는 Everyday Excellence입니다.",
    pursuitP2: "MTSPACE COFFEE는 ‘비어 있음’ 속에서 무한한 가능성을 찾고, 고객과 함께 그 공간을 채워나가고자 합니다. 커피 한 잔이 단순한 음료를 넘어 새로운 가능성을 열어주는 시작점이 되기를 바랍니다.",
    ceoH: "대표 — 홍찬호 (Chanho Hong)",
    ceoP: "홍찬호는 경력 16년의 커피 전문가이자 MTSPACE COFFEE · Normcore Coffee · RoasteryFlow의 창업자입니다. 한·호주 양국의 경쟁 무대에서 2018 Central Regional Brewers Cup 우승, 2017 Australian Brewers Cup 3위, 2018·2025 Australian Coffee in Good Spirits 3위, 2022 Hario Cup 준우승 등 검증된 실력을 쌓아온 경쟁 바리스타입니다.",
    whH: "납품 문의", whTag: "wholesale & supply",
    whP: "카페·레스토랑·호텔·오피스 등 사업장을 위한 원두 도매 납품을 진행합니다. 매주 로스팅한 신선한 원두를 정기 발주·세금계산서 발행과 함께 안정적으로 공급하며, 물량과 메뉴에 맞춰 회원별 단가를 제안드립니다.",
    whCta: "납품 문의하기 →",
    consH: "커피 비즈니스 파트너십", consTag: "consulting & partnership",
    consP: "브랜드 전략·데이터 분석·운영 SOP부터 계약 로스팅·매장 운영 대행·바리스타 교육까지. 데이터로 설계하는 커피 비즈니스 파트너를 만나보세요.",
    consCta: "컨설팅 · 파트너십 보기 →",
    moreBtn: "대표 약력 · 수상내역 더보기 →",
  },
  en: {
    tagline: "everyday excellence", h1: "About MTSPACE COFFEE", sub: "everyday excellence",
    brandH: "Our Brand",
    brandP1: "MTSPACE COFFEE is a Korean specialty coffee brand rooted in Normcore Coffee, founded in Sydney in 2016. Competition barista Chanho Hong brought his Sydney roasting and barista experience to Korea in 2022, redesigning the brand for the Korean market and rebranding it as MTSPACE COFFEE. We roast signature blends tuned to Korean tastes and single origins sourced from around the world every week.",
    brandP2ck: ["From our own roastery, we roast ", "every Monday & Tuesday", " and ship orders on ", "Tuesday & Wednesday", " for maximum freshness."],
    pursuitH: "What We Pursue",
    pursuitP1: "We believe the coffee you drink every day — not just on special occasions — should be excellent. From bean selection to roast profiling and brew guidance, we design a consistent, high-quality experience. That is what we call Everyday Excellence.",
    pursuitP2: "MTSPACE COFFEE seeks infinite possibility within emptiness, filling that space together with our customers — so that a cup of coffee becomes a starting point for something new.",
    ceoH: "Founder — Chanho Hong",
    ceoP: "Chanho Hong is a coffee professional with 16 years of experience and the founder of MTSPACE COFFEE, Normcore Coffee, and RoasteryFlow. A competition barista, his record across Korea and Australia includes 1st place at the 2018 Central Regional Brewers Cup, 3rd at the 2017 Australian Brewers Cup, 3rd at the 2018 & 2025 Australian Coffee in Good Spirits, and 2nd at the 2022 Hario Cup.",
    whH: "Wholesale Inquiry", whTag: "wholesale & supply",
    whP: "We supply wholesale beans to cafes, restaurants, hotels, and offices. Freshly roasted every week, delivered reliably with recurring orders and tax invoicing, with member-specific pricing tailored to your volume and menu.",
    whCta: "Wholesale inquiry →",
    consH: "Coffee Business Partnership", consTag: "consulting & partnership",
    consP: "From brand strategy, data analysis, and operations SOPs to contract roasting, store operations, and barista education. Meet a coffee business partner who designs with data.",
    consCta: "See Consulting · Partnership →",
    moreBtn: "Full bio · awards →",
  },
} as const;

export default async function AboutPage() {
  const { locale } = await getStorefrontContext();
  const c = C[locale];
  const media = EVENTS;

  // 사이트 관리자 > 페이지 수정 오버라이드 (ko 기준, 비어있으면 기본값)
  const s = await getPageSettings();
  const ov = locale === "ko" ? s : {};
  const heroImg = ov.about_hero_image || "/images/about-brand.jpg";
  const brandTitle = ov.about_brand_title || c.brandH;
  const brandBody = ov.about_brand_body || c.brandP1;

  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <p className="mt-tagline text-[10px]">{c.tagline}</p>
      <h1 className="mt-3 text-4xl font-extrabold tracking-tight">{c.h1}</h1>
      <p className="prose-serif mt-3 text-lg italic text-clayDeep">{c.sub}</p>

      <section className="mt-14">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={heroImg} alt="MTSPACE COFFEE" className="aspect-[3/2] w-full rounded-card border border-line object-cover" />
        <div className="prose-serif mt-6 space-y-5 text-ink/85">
          <h2 className="text-lg font-bold text-ink">{brandTitle}</h2>
          <p>{brandBody}</p>
          <p className="text-inkSoft">{c.brandP2ck[0]}<b>{c.brandP2ck[1]}</b>{c.brandP2ck[2]}<b>{c.brandP2ck[3]}</b>{c.brandP2ck[4]}</p>
        </div>
      </section>

      <section className="mt-16">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/about-pursuit.jpg" alt="Espresso" className="aspect-[3/2] w-full rounded-card border border-line object-cover" />
        <div className="prose-serif mt-6 space-y-5 text-ink/85">
          <h2 className="text-lg font-bold text-ink">{c.pursuitH}</h2>
          <p>{c.pursuitP1}</p>
          <p className="text-inkSoft">{c.pursuitP2}</p>
        </div>
      </section>

      <section className="mt-16">
        <div className="overflow-hidden rounded-card border border-line bg-sand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/about-trophies.jpg" alt="Chanho Hong — championship trophies" className="mx-auto max-h-[420px] w-full object-contain" />
        </div>
        <div className="prose-serif mt-6 space-y-5 text-ink/85">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h2 className="text-lg font-bold text-ink">{c.ceoH}</h2>
            <a href="https://instagram.com/chanhohong" target="_blank" rel="noreferrer" className="text-sm font-medium text-clayDeep hover:opacity-70" aria-label="Instagram @chanhohong">@chanhohong</a>
          </div>
          <p>{c.ceoP}</p>
          <AboutMoreModal awards={AWARDS} media={media} label={c.moreBtn} locale={locale} />
        </div>
      </section>

      <section className="mt-16">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/about-wholesale.jpg" alt="MTSPACE COFFEE wholesale" className="aspect-[3/2] w-full rounded-card border border-line object-cover" />
        <div className="mt-6 rounded-card border border-line bg-sand px-6 py-8">
          <p className="mt-tagline text-[10px]">{c.whTag}</p>
          <h2 className="mt-3 text-lg font-bold text-ink">{c.whH}</h2>
          <p className="prose-serif mt-3 max-w-xl text-[15px] leading-relaxed text-ink/80">{c.whP}</p>
          <Link href="/contact" className="mt-5 inline-block rounded-card bg-ink px-6 py-2.5 text-sm font-semibold text-oat hover:bg-[#4A443A]">{c.whCta}</Link>
        </div>
      </section>

      <section className="mt-16 rounded-card border border-line bg-paper px-6 py-8 text-center">
        <p className="mt-tagline text-[10px]">{c.consTag}</p>
        <h2 className="mt-3 text-lg font-bold text-ink">{c.consH}</h2>
        <p className="prose-serif mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-ink/80">{c.consP}</p>
        <Link href="/consulting" className="mt-5 inline-block rounded-card border border-line bg-paper px-6 py-2.5 text-sm font-semibold text-ink hover:bg-warmPaper">{c.consCta}</Link>
      </section>
    </main>
  );
}
