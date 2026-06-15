import { notFound } from "next/navigation";
import { getStorefrontContext } from "@/lib/storefront";
import { getCategories, getStorefrontProducts } from "@/lib/queries";
import ProductCard from "@/components/product-card";

export const dynamic = "force-dynamic";

export default async function CollectionPage({ params }: { params: { slug: string } }) {
  const { locale, storefrontId } = await getStorefrontContext();

  if (params.slug === "all") {
    const products = await getStorefrontProducts(storefrontId);
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="mb-6 text-2xl font-bold">{locale === "en" ? "All Coffee" : "전체 커피"}</h1>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {products.map((p) => <ProductCard key={p.slug} p={p} locale={locale} />)}
        </div>
      </main>
    );
  }

  const categories = await getCategories(storefrontId);
  const cat = categories.find((c) => c.slug === params.slug);
  if (!cat) notFound();

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      {/* 카테고리 배너 */}
      <div className="mb-8 rounded-xl bg-neutral-100 px-6 py-10">
        <h1 className="text-2xl font-bold">{locale === "en" && cat.name_en ? cat.name_en : cat.name_ko}</h1>
        <p className="mt-1 text-sm text-neutral-500">{cat.products.length} items</p>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {cat.products.map((p) => <ProductCard key={p.slug} p={p} locale={locale} />)}
      </div>
    </main>
  );
}
