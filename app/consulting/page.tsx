import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Consulting & Partnership — MTSPACE COFFEE 브랜드·운영·로스팅 파트너",
  description:
    "경쟁 바리스타 홍찬호 대표와 MTSPACE COFFEE의 컨설팅·파트너십. 브랜드 전략, 데이터·POS 분석, 운영 SOP, 계약 로스팅, 매장 운영 대행, 바리스타 코칭(Chanho-Tornado)까지 — 데이터로 설계하는 커피 비즈니스 파트너십.",
};

const PACKAGES = [
  {
    no: "01",
    title: "브랜드 전략",
    desc: "포지셔닝·네이밍·비주얼 아이덴티티부터 메뉴 설계까지. 시장 데이터와 10년 로스팅 경험을 바탕으로 카페의 정체성을 설계합니다.",
  },
  {
    no: "02",
    title: "데이터 · POS 분석",
    desc: "POS·매출 데이터를 분석해 메뉴 구성, 가격 정책, 재고·발주 흐름을 진단합니다. 감이 아닌 숫자로 의사결정하도록 돕습니다.",
  },
  {
    no: "03",
    title: "운영 · SOP",
    desc: "추출 레시피 표준화, 바 세팅, 위생·품질 관리 SOP를 정립해 매장 어디서나 균일한 한 잔이 나오도록 시스템화합니다.",
  },
];

const PARTNERSHIPS = [
  { title: "계약 로스팅 (OEM/ODM)", desc: "브랜드 전용 블렌드 개발과 안정적 주 단위 공급. 균일한 품질을 약속합니다." },
  { title: "매장 운영 대행", desc: "오픈 준비부터 운영까지, 카페 운영 전반을 위탁 운영합니다." },
  { title: "공동 브랜드 개발", desc: "MTSPACE의 로스팅·기술 토대 위에 파트너와 함께 새로운 커피 브랜드를 만듭니다." },
  { title: "해외 브랜드 한국 진출", desc: "해외 커피 브랜드의 한국 시장 진입을 로스팅·유통·운영으로 지원합니다." },
];

export default function ConsultingPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <p className="mt-tagline text-[10px]">everyday excellence</p>
      <h1 className="mt-3 text-4xl font-extrabold tracking-tight">Consulting &amp; Partnership</h1>
      <p className="prose-serif mt-2 text-lg italic text-clayDeep">데이터로 설계하는 커피 비즈니스 파트너</p>

      <section className="prose-serif mt-8 space-y-3 text-ink/85">
        <p>
          MTSPACE COFFEE는 자체 로스터리와 경쟁 바리스타의 기술 토대 위에서, 커피 비즈니스의 시작과 성장을
          함께하는 파트너입니다. 대표 홍찬호는 한·호주 양국 19회 수상 경력과 광고학 학사·MBA(데이터 기반
          운영·창업)를 바탕으로, 브랜드부터 운영까지 데이터로 설계합니다.
        </p>
      </section>

      {/* 3대 서비스 패키지 */}
      <section className="mt-12">
        <h2 className="text-lg font-bold text-ink">컨설팅 — 3대 서비스</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {PACKAGES.map((p) => (
            <div key={p.no} className="rounded-card border border-line bg-paper p-5">
              <p className="font-mono text-xs uppercase tracking-wider text-clayDeep">{p.no}</p>
              <p className="mt-2 font-bold text-ink">{p.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-inkSoft">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 파트너십 */}
      <section className="mt-12">
        <h2 className="text-lg font-bold text-ink">파트너십</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {PARTNERSHIPS.map((p) => (
            <div key={p.title} className="rounded-card border border-line bg-paper p-5">
              <p className="font-bold text-ink">{p.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-inkSoft">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 바리스타 코칭 */}
      <section className="prose-serif mt-12 space-y-3 text-ink/85">
        <h2 className="text-lg font-bold text-ink">바리스타 코칭</h2>
        <p>
          대회 준비, 추출 심화, 세미나 프로그램을 운영합니다. V60 추출의 고유 방법인
          ‘Chanho-Tornado’를 비롯해, 경쟁 무대에서 검증된 추출·세팅 노하우를 직접 전수합니다.
        </p>
      </section>

      {/* be a partner */}
      <section className="mt-12 rounded-card border border-line bg-sand px-6 py-10 text-center">
        <p className="mt-tagline text-[10px]">be a partner of MTSPACE</p>
        <p className="prose-serif mx-auto mt-3 max-w-xl text-[17px] text-ink/80">
          안정적인 공급과 균일한 품질로, 당신의 커피 비즈니스가 매일의 탁월함을 지킬 수 있도록 함께합니다.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/contact" className="rounded-card bg-ink px-6 py-2.5 text-sm font-semibold text-oat hover:bg-[#4A443A]">
            연락하기
          </Link>
          <a href="mailto:hello@mtspace.coffee" className="rounded-card border border-line bg-paper px-6 py-2.5 text-sm font-semibold text-ink hover:bg-warmPaper">
            hello@mtspace.coffee
          </a>
        </div>
      </section>
    </main>
  );
}
