import { getStorefrontContext } from "@/lib/storefront";

export const dynamic = "force-dynamic";
export const metadata = { title: "About" };

export default async function AboutPage() {
  const { brand, locale } = await getStorefrontContext();
  const en = locale === "en";
  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">about</p>
      <h1 className="mt-2 text-3xl font-bold">{brand.name}</h1>
      <p className="mt-6 text-lg leading-relaxed text-neutral-700">{en ? brand.philosophy.en : brand.philosophy.ko}</p>
      <p className="mt-4 leading-relaxed text-neutral-600">{en ? brand.about.en : brand.about.ko}</p>

      <section className="mt-10 border-t pt-8 text-sm leading-relaxed text-neutral-600">
        <h2 className="text-base font-bold text-black">대표 홍찬호</h2>
        <p className="mt-2">
          한국·호주를 오가며 활동한 경쟁 바리스타이자 로스터. 14회의 대회 수상 경력과 V60 추출 고유 방식
          ‘Chanho-Tornado’로 알려져 있으며, 광고학 학사·MBA를 바탕으로 데이터 기반의 커피 운영을 추구합니다.
        </p>
        <p className="mt-3">
          로스터리: 경기도 가평군 청평면 · 매주 월·화 로스팅 · 화·수 출고(신선 배송).
        </p>
      </section>
    </main>
  );
}
