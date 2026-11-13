import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getStorefrontContext } from "@/lib/storefront";
import { getCategories, getStorefrontProducts } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import ProductCard from "@/components/product-card";
import CategoryChips from "@/components/category-chips";
import JsonLd from "@/components/json-ld";
import { breadcrumbJsonLd } from "@/lib/seo";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const { brand, locale, storefrontId } = await getStorefrontContext();
  if (params.slug === "all") {
    const title = locale === "en" ? "All Coffee" : "전체 커피";
    const description = locale === "en"
      ? `Browse every ${brand.name} coffee: signature blends, single origins, decaf and wholesale, roasted fresh every week.`
      : `${brand.name}의 전체 커피를 한눈에. 시그니쳐 블렌드, 싱글 오리진, 디카페인, 사업자 전용 도매까지. 매주 신선하게 로스팅합니다.`;
    return { title, description, alternates: { canonical: "/collections/all" }, openGraph: { title: `${title} | ${brand.name}`, description, type: "website", url: "/collections/all", images: ["/images/og-default.png"] } };
  }
  const supabase = createClient();
  const { data: cat } = await supabase.from("category").select("name_ko,name_en").eq("slug", params.slug).maybeSingle();
  const name = cat ? (locale === "en" && cat.name_en ? cat.name_en : cat.name_ko) : params.slug;
  // 주요 컬렉션은 검색 의도에 맞춘 설명문을 쓴다(D-168). 나머지는 공통 문장.
  const COLL_DESC: Record<string, { ko: string; en: string; tko: string; ten: string }> = {
    wholesale: {
      tko: "사업자 전용 원두: 카페 납품용 블렌드와 디카페인", ten: "Wholesale Coffee for Cafes",
      ko: `${brand.name} 사업자 전용 원두. 카페 납품용 시그니쳐 블렌드와 디카페인을 사업자 회원 승인 후 등급별 도매가로 주문할 수 있습니다.`,
      en: `${brand.name} wholesale coffee for cafes: signature blends and decaf, ordered at tier pricing once your business account is approved.`,
    },
    blends: {
      tko: "시그니쳐 블렌드: 에티오피아 베이스 블렌드 원두", ten: "Signature Blends",
      ko: `${brand.name} 시그니쳐 블렌드. 댐굳, 올라운더, 스팟라이트, 이지피지 등 에티오피아 베이스 블렌드를 에스프레소, 라떼, 필터 용도에 맞춰 고를 수 있습니다.`,
      en: `${brand.name} signature blends with an Ethiopian base, for espresso, milk drinks and filter.`,
    },
    "single-origins": {
      tko: "싱글 오리진: 라이트 로스팅 스페셜티 원두", ten: "Single Origins",
      ko: `${brand.name} 싱글 오리진. 에티오피아, 케냐, 페루 등 산지의 개성을 살린 라이트 로스팅 스페셜티 원두와 컵 노트, 추천 레시피를 소개합니다.`,
      en: `${brand.name} single origins: light-roasted specialty coffee from Ethiopia, Kenya, Peru and more, with cup notes and recipes.`,
    },
  };
  const cd = COLL_DESC[params.slug];
  const description = cd ? (locale === "en" ? cd.en : cd.ko) : locale === "en"
    ? `${name} from ${brand.name}: specialty coffee roasted fresh every week. Everyday Excellence.`
    : `${brand.name} ${name} 컬렉션. 매주 신선하게 로스팅한 스페셜티 커피. Everyday Excellence.`;
  const metaTitle = cd ? (locale === "en" ? cd.ten : cd.tko) : name;
  // 상품이 하나도 없는 컬렉션(준비 중)은 색인하지 않는다(D-134).
  const count = (await getCategories(storefrontId)).find((c) => c.slug === params.slug)?.products.length ?? 0;
  return {
    title: metaTitle, description, alternates: { canonical: `/collections/${params.slug}` },
    ...(count === 0 ? { robots: { index: false, follow: true } } : {}),
    openGraph: { title: `${metaTitle} | ${brand.name}`, description, type: "website", url: `/collections/${params.slug}`, images: ["/images/og-default.png"] },
  };
}

async function getIsBusiness(): Promise<boolean> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    // 관리자도 사업자전용(wholesale) 카테고리를 기본 노출로 볼 수 있게 포함
    return prof?.role === "business" || prof?.role === "admin";
  } catch {
    return false;
  }
}

export default async function CollectionPage({ params }: { params: { slug: string } }) {
  const { locale, storefrontId } = await getStorefrontContext();
  const tt = t(locale);

  if (params.slug === "all") {
    const [products, isBusiness] = await Promise.all([getStorefrontProducts(storefrontId), getIsBusiness()]);
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <JsonLd data={breadcrumbJsonLd([{ name: locale === "en" ? "Home" : "홈", path: "/" }, { name: tt.allCoffee, path: "/collections/all" }])} />
        <h1 className="mb-6 text-2xl font-bold">{tt.allCoffee}</h1>
        <CategoryChips active="all" isBusiness={isBusiness} locale={locale} />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {products.map((p) => <ProductCard key={p.slug} p={p} locale={locale} compact />)}
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

  const catName = locale === "en" && catRow.name_en ? catRow.name_en : catRow.name_ko;
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <JsonLd data={breadcrumbJsonLd([
        { name: locale === "en" ? "Home" : "홈", path: "/" },
        { name: locale === "en" ? "Coffee" : "커피", path: "/collections/all" },
        { name: catName, path: `/collections/${params.slug}` },
      ])} />
      <CategoryChips active={params.slug} isBusiness={isBusiness} locale={locale} />
      {/* 카테고리 배너 */}
      <div className={`mt-grid mb-8 flex flex-col justify-center overflow-hidden rounded-card border border-line px-6 py-28 ${catRow.banner_path ? "text-oat" : "bg-sand"}`}
        style={catRow.banner_path ? { backgroundImage: `linear-gradient(rgba(60,53,44,0.5),rgba(60,53,44,0.5)), url(${catRow.banner_path})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}>
        <h1 className="text-3xl font-extrabold tracking-tight">{locale === "en" && catRow.name_en ? catRow.name_en : catRow.name_ko}</h1>
        <p className={`mt-1 font-mono text-xs uppercase tracking-wider ${catRow.banner_path ? "text-oat/80" : "text-inkSoft"}`}>{products.length} {tt.items}</p>
      </div>
      {params.slug === "wholesale" && (
        <p className="mb-6 text-[14px] text-inkSoft">
          {locale === "en" ? "New to wholesale? " : "처음 납품을 검토하신다면 "}
          <a href="/wholesale" className="font-semibold text-ink underline underline-offset-4">{locale === "en" ? "See supply terms and how it works" : "납품 조건과 진행 순서를 먼저 확인하세요"}</a>
        </p>
      )}
      {products.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {products.map((p) => <ProductCard key={p.slug} p={p} locale={locale} compact />)}
        </div>
      ) : (
        <p className="py-16 text-center text-inkSoft">{tt.categoryComingSoon}</p>
      )}
    </main>
  );
}
