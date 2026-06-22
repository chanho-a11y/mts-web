import { notFound } from "next/navigation";
import { getStorefrontContext } from "@/lib/storefront";
import { getCategories, getStorefrontProducts } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import ProductCard from "@/components/product-card";
import CategoryChips from "@/components/category-chips";

export const dynamic = "force-dynamic";

async function getIsBusiness(): Promise<boolean> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    return prof?.role === "business";
  } catch {
    return false;
  }
}

export default async function CollectionPage({ params }: { params: { slug: string } }) {
  const { locale, storefrontId } = await getStorefrontContext();

  if (params.slug === "all") {
    const [products, isBusiness] = await Promise.all([getStorefrontProducts(storefrontId), getIsBusiness()]);
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="mb-6 text-2xl font-bold">{locale === "en" ? "All Coffee" : "전체 커피"}</h1>
        <CategoryChips active="all" isBusiness={isBusiness} />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {products.map((p) => <ProductCard key={p.slug} p={p} locale={locale} />)}
        </div>
      </main>
    );
  }

  // 카테고리 메타 조회 + 제품 목록 조회를 병렬 실행(서로 독립).
  const supabase = createClient();
  const [{ data: catRow }, categories, isBusiness] = await Promise.all([
    supabase.from("category").select("slug,name_ko,name_en,banner_path").eq("slug", params.slug).maybeSingle(),
    getCategories(storefrontId),
    getIsBusiness(),
  ]);
  if (!catRow) notFound();

  const products = categories.find((c) => c.slug === params.slug)?.products ?? [];

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <CategoryChips active={params.slug} isBusiness={isBusiness} />
      {/* 카테고리 배너 */}
      <div className={`mt-grid mb-8 overflow-hidden rounded-card border border-line px-6 py-16 ${catRow.banner_path ? "text-oat" : "bg-sand"}`}
        style={catRow.banner_path ? { backgroundImage: `linear-gradient(rgba(60,53,44,0.5),rgba(60,53,44,0.5)), url(${catRow.banner_path})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}>
        <h1 className="text-3xl font-extrabold tracking-tight">{locale === "en" && catRow.name_en ? catRow.name_en : catRow.name_ko}</h1>
        <p className={`mt-1 font-mono text-xs uppercase tracking-wider ${catRow.banner_path ? "text-oat/80" : "text-inkSoft"}`}>{products.length} items</p>
      </div>
      {products.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {products.map((p) => <ProductCard key={p.slug} p={p} locale={locale} />)}
        </div>
      ) : (
        <p className="py-16 text-center text-inkSoft">해당 카테고리 상품을 준비 중입니다.</p>
      )}
    </main>
  );
}
