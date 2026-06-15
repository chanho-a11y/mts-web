import Link from "next/link";
import { getStorefrontContext } from "@/lib/storefront";
import { getCategories } from "@/lib/queries";
import ProductCard from "@/components/product-card";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { brand, locale, storefrontId } = await getStorefrontContext();
  const tt = t(locale);
  const categories = await getCategories(storefrontId);
  const allProducts = categories.flatMap((c) => c.products);
  const bestsellers = allProducts.slice(0, 8);

  return (
    <main>
      {/* Hero */}
      <section className="border-b border-neutral-200 bg-neutral-50">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">everyday excellence</p>
          <h1 className="mt-3 max-w-2xl text-4xl font-bold leading-tight md:text-5xl">{brand.name}</h1>
          <p className="mt-4 max-w-xl text-neutral-600">
            {locale === "en" ? brand.philosophy.en : brand.philosophy.ko}
          </p>
          <Link href="/collections/all" className="mt-6 inline-block rounded-full bg-ink px-6 py-2 text-sm text-white">
            {tt.shop}
          </Link>
        </div>
      </section>

      {/* Category nav (slider) */}
      <section className="mx-auto max-w-6xl px-4 py-8">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-neutral-500">{tt.categories}</h2>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {categories.map((c) => (
            <Link key={c.slug} href={`/collections/${c.slug}`}
              className="whitespace-nowrap rounded-full border border-neutral-300 px-4 py-1.5 text-sm hover:bg-neutral-100">
              {locale === "en" && c.name_en ? c.name_en : c.name_ko}
            </Link>
          ))}
        </div>
      </section>

      {/* Bestsellers (slider) */}
      {bestsellers.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-4">
          <h2 className="mb-4 text-xl font-bold">{tt.bestsellers}</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {bestsellers.map((p) => <ProductCard key={p.slug} p={p} locale={locale} />)}
          </div>
        </section>
      )}

      {/* Category sections (배너 + 카드) */}
      {categories.map((c) => (
        <section key={c.slug} className="mx-auto max-w-6xl px-4 py-8">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-xl font-bold">{locale === "en" && c.name_en ? c.name_en : c.name_ko}</h2>
            <Link href={`/collections/${c.slug}`} className="text-sm text-neutral-500 hover:underline">{tt.viewAll}</Link>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {c.products.slice(0, 4).map((p) => <ProductCard key={p.slug} p={p} locale={locale} />)}
          </div>
        </section>
      ))}

      {/* About teaser */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-xl font-bold">{tt.about}</h2>
        <p className="mt-3 max-w-2xl text-neutral-600">{locale === "en" ? brand.about.en : brand.about.ko}</p>
      </section>
    </main>
  );
}
