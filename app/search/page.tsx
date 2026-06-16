import { getStorefrontContext } from "@/lib/storefront";
import { getStorefrontProducts } from "@/lib/queries";
import ProductCard from "@/components/product-card";

export const dynamic = "force-dynamic";
export const metadata = { title: "검색" };

export default async function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const q = (searchParams.q ?? "").trim();
  const { locale, storefrontId } = await getStorefrontContext();
  const all = await getStorefrontProducts(storefrontId);
  const ql = q.toLowerCase();
  const results = q
    ? all.filter((p) =>
        p.title_ko.toLowerCase().includes(ql) ||
        (p.title_en ?? "").toLowerCase().includes(ql) ||
        p.flavor_notes.some((f) => f.toLowerCase().includes(ql)) ||
        (p.roast_level ?? "").toLowerCase().includes(ql))
    : [];

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <form action="/search" className="mb-6">
        <input name="q" defaultValue={q} placeholder="원두명·풍미·산지 검색"
          className="w-full max-w-md rounded-full border px-5 py-2.5 text-sm" />
      </form>
      {q && <p className="mb-4 text-sm text-neutral-500">‘{q}’ 검색 결과 {results.length}건</p>}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {results.map((p) => <ProductCard key={p.slug} p={p} locale={locale} />)}
      </div>
    </main>
  );
}
