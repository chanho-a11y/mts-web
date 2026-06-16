import Link from "next/link";
import { getStorefrontContext } from "@/lib/storefront";
import { getStorefrontProducts } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "커피 정보 — 농장·플레이버·추천 레시피",
  description: "MTSPACE COFFEE 원두별 산지·플레이버 노트·추천 추출 레시피와 인포메이션 카드 다운로드.",
};

export default async function CoffeeInfoPage() {
  const { storefrontId } = await getStorefrontContext();
  const products = await getStorefrontProducts(storefrontId);

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-2xl font-bold">커피 정보</h1>
      <p className="mt-2 text-sm text-neutral-500">원두별 산지·플레이버 노트·추천 추출과 인포메이션 카드(이미지)를 제공합니다.</p>

      <div className="mt-8 space-y-4">
        {products.map((p) => (
          <article key={p.slug} className="rounded-xl border p-5" style={p.key_color ? { borderLeft: `4px solid ${p.key_color}` } : undefined}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <Link href={`/products/${p.slug}`} className="font-bold hover:underline">{p.title_ko.replace(/\[.*?\]\s*/g, "")}</Link>
                <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-neutral-600">
                  {p.roast_level && <div><dt className="inline text-neutral-400">로스팅 </dt><dd className="inline">{p.roast_level}</dd></div>}
                  {p.flavor_notes.length > 0 && <div className="col-span-2"><dt className="inline text-neutral-400">플레이버 </dt><dd className="inline">{p.flavor_notes.join(", ")}</dd></div>}
                  <div className="col-span-2"><dt className="inline text-neutral-400">추천 추출 </dt><dd className="inline">에스프레소 · 핸드드립(V60) · 콜드브루</dd></div>
                </dl>
              </div>
            </div>
            <div className="mt-3 flex gap-3 text-xs">
              <a href={`/api/og/thumbnail/${p.slug}`} download className="rounded border px-3 py-1 hover:bg-neutral-50">인포카드 PNG</a>
              <a href={`/api/asset/cardnews/${p.slug}`} download className="rounded border px-3 py-1 hover:bg-neutral-50">카드뉴스 SVG</a>
            </div>
          </article>
        ))}
        {products.length === 0 && <p className="text-neutral-400">등록된 제품이 없습니다.</p>}
      </div>
    </main>
  );
}
