export const dynamic = "force-dynamic";
export const metadata = {
  title: "About MTSPACE COFFEE — 경기도 가평 로스터리 스페셜티 커피",
  description: "경쟁 바리스타 홍찬호 대표가 운영하는 가평 청평 로스터리 스페셜티 커피 브랜드. 주 단위 로스팅, 시그니쳐 블렌드 5종, 싱글 오리진, 사업자 전용 도매 — Everyday Excellence.",
};

const AWARDS = [
  "2025 Australian Coffee In Good Spirits 3rd Place",
  "2025 Korea National Barista Championship Semi-finalist",
  "2022 Hario Cup International Brewing Competition 2nd Place",
  "2018 Central Regional Brewers Cup CHAMPION",
  "2018 Australian Coffee In Good Spirits Championship 3rd Place",
  "2017 Australian Golden Bean — Silver (Single Origin Espresso / Pourover)",
  "2014 Korean Brewers Cup 3rd Place",
];

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <p className="mt-tagline text-[10px]">everyday excellence</p>
      <h1 className="mt-3 text-4xl font-extrabold tracking-tight">About MTSPACE COFFEE</h1>
      <p className="prose-serif mt-2 text-lg italic text-clayDeep">매일의 탁월함</p>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/about-roastery.jpg" alt="MTSPACE COFFEE 로스터리" className="mt-6 aspect-[3/2] w-full rounded-card border border-line object-cover" />

      <section className="prose-serif mt-10 space-y-3 text-ink/85">
        <h2 className="text-lg font-bold text-ink">브랜드 소개</h2>
        <p>
          MTSPACE COFFEE는 경기도 가평 청평에 자체 로스터리를 운영하는 한국 스페셜티 커피 브랜드입니다.
          대표이자 경쟁 바리스타인 홍찬호(Chanho Hong)가 호주 시드니에서 공동 창업한 Normcore Coffee(2016)의
          경험을 바탕으로, 한국 시장에 맞춰 설계된 시그니쳐 블렌드와 세계 각지에서 선별한 싱글 오리진 커피를
          매주 로스팅합니다.
        </p>
      </section>

      <section className="prose-serif mt-8 space-y-3 text-ink/85">
        <h2 className="text-lg font-bold text-ink">우리가 추구하는 것</h2>
        <p>
          특별한 날의 특별한 한 잔이 아닌, 매일 마시는 커피가 탁월해야 한다고 믿습니다. 원두 선정부터 로스팅
          프로파일 설계, 추출 레시피 안내까지 — 일관되고 품질 높은 경험이 되도록 설계합니다. 그것이 우리가 말하는
          <b> Everyday Excellence</b>입니다.
        </p>
        <p className="text-neutral-600">
          MTSPACE COFFEE는 ‘비어 있음’ 속에서 무한한 가능성을 찾고, 고객과 함께 그 공간을 채워나가고자 합니다.
          커피 한 잔이 단순한 음료를 넘어 새로운 가능성을 열어주는 시작점이 되기를 바랍니다.
        </p>
      </section>

      <section className="prose-serif mt-8 space-y-3 text-ink/85">
        <h2 className="text-lg font-bold text-ink">대표 — 홍찬호 (Chanho Hong)</h2>
        <p>
          한국·호주 양국의 스페셜티 커피 안에서 14회의 경쟁 수상 경험을 가진 바리스타입니다. 2018 Central Regional
          Brewers Cup 우승, 2025 Australian Coffee in Good Spirits 3위 등을 보유하고 있으며, V60 추출의 고유 방법인
          ‘Chanho-Tornado’로 알려져 있습니다. 광고학 학사와 MBA(데이터 기반 마케팅·운영·창업) 학위를 가지고 있습니다.
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-neutral-600">
          {AWARDS.map((a) => <li key={a}>{a}</li>)}
        </ul>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/about-trophies.jpg" alt="홍찬호 바리스타 챔피언십 트로피" className="mt-4 aspect-[3/2] w-full rounded-xl object-cover" />
      </section>

      <section className="prose-serif mt-8 space-y-3 text-ink/85">
        <h2 className="text-lg font-bold text-ink">로스터리</h2>
        <p>
          경기도 가평군 청평면에 위치한 자체 로스터리에서 <b>매주 월·화요일</b>에 원두를 로스팅합니다. 주문은
          <b> 화·수요일</b>에 출고되어 최상의 신선도로 배송됩니다.
        </p>
      </section>

      <section className="mt-8 leading-relaxed text-neutral-700">
        <h2 className="text-lg font-bold text-ink">제품 라인</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li><b>시그니쳐 블렌드</b> — 댐굳(다크), 올라운더(미디움), 스팟라이트(라이트), 이지피지(로우 카페인), 아아 블렌드(아이스 아메리카노 특화)</li>
          <li><b>싱글 오리진</b> — 에티오피아·케냐·파나마 스페셜티 원두</li>
          <li><b>사업자 전용 도매</b> — 카페·레스토랑·호텔 B2B 1kg 포장</li>
          <li><b>Normcore Coffee 2.0</b> — 호주 시드니 창업 브랜드의 새로운 챕터</li>
        </ul>
      </section>

      <section className="mt-10 border-t pt-6 text-sm text-neutral-600">
        도매·제휴·컨설팅·코칭 문의는 <a href="mailto:hello@mtspace.coffee" className="underline">hello@mtspace.coffee</a>로 연락해 주세요.
      </section>
    </main>
  );
}
