import Link from "next/link";
import { getStorefrontContext } from "@/lib/storefront";
import { getCategories } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import ProductCard from "@/components/product-card";
import HeroSlideshow from "@/components/hero-slideshow";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

// 역할별 카테고리 노출 순서
const CONSUMER_ORDER = ["blends", "single-origins", "decaf", "normcore", "merch", "subscription"];
const BUSINESS_ORDER = ["wholesale", "blends", "single-origins", "decaf"];

export default async function Home() {
  const { brand, locale, storefrontId } = await getStorefrontContext();
  const tt = t(locale);

  // storefront 확인 후 독립적인 3개 조회를 병렬 실행(순차 → 동시).
  const [categories, role, settingsMap] = await Promise.all([
    getCategories(storefrontId),
    fetchRole(),
    fetchSiteSettings(brand.code),
  ]);
  const isBusiness = role === "business";

  // CMS 사이트 설정(히어로 + 이미지 슬라이드)
  const heroTitle = settingsMap.hero_title || brand.name;
  const heroSubtitle = settingsMap.hero_subtitle || (locale === "en" ? brand.philosophy.en : brand.philosophy.ko);
  const slideRaw = settingsMap.home_slides || "";

  // 이미지 슬라이드(상품 아님): CMS 경로 우선, 없으면 기본 이미지
  const defaultSlides = ["/images/hero.jpg", "/images/cat-single-origins.jpg", "/images/about-roastery.jpg", "/images/cat-blends.jpg"];
  const slides = (slideRaw ? slideRaw.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean) : defaultSlides)
    .map((src) => ({ src, alt: brand.name }));

  const allProducts = categories.flatMap((c) => c.products);
  const bestsellers = allProducts.slice(0, 8);

  // 등급별 쇼핑 카테고리
  const order = isBusiness ? BUSINESS_ORDER : CONSUMER_ORDER;
  const shopCategories = [...categories]
    .filter((c) => (isBusiness ? c.slug !== "subscription" : c.slug !== "wholesale"))
    .sort((a, b) => {
      const ia = order.indexOf(a.slug); const ib = order.indexOf(b.slug);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });

  return (
    <main>
      {/* 이미지 슬라이드 (실제 이미지) */}
      <HeroSlideshow slides={slides} title={heroTitle} subtitle={heroSubtitle} />

      <div className="mx-auto max-w-6xl px-4">
        <Link href="/collections/all" className="-mt-5 mb-4 inline-block rounded-card bg-ink px-6 py-2.5 text-sm font-semibold tracking-wide text-oat shadow-card hover:bg-[#4A443A]">
          {tt.shop}
        </Link>
      </div>

      {/* 카테고리 슬라이드 */}
      <section className="mx-auto max-w-6xl px-4 py-4">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-neutral-500">{tt.categories}</h2>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {shopCategories.map((c) => (
            <Link key={c.slug} href={`/collections/${c.slug}`}
              className="whitespace-nowrap rounded-card border border-line bg-paper px-4 py-1.5 text-sm hover:bg-sand">
              {locale === "en" && c.name_en ? c.name_en : c.name_ko}
            </Link>
          ))}
        </div>
      </section>

      {/* 판매 상위 제품 슬라이드 */}
      {bestsellers.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-4">
          <h2 className="mb-4 text-xl font-bold">{tt.bestsellers}</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {bestsellers.map((p) => <ProductCard key={p.slug} p={p} locale={locale} />)}
          </div>
        </section>
      )}

      {/* 등급별 쇼핑 (회원 역할에 따라 다르게) */}
      <div className="mx-auto max-w-6xl px-4 pt-4">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold">{isBusiness ? "사업자 전용 쇼핑" : "쇼핑"}</h2>
          {isBusiness && <span className="rounded-full bg-clay/10 px-2 py-0.5 text-[11px] text-clayDeep">기업회원 가격 적용</span>}
        </div>
      </div>
      {shopCategories.map((c) => (
        <section key={c.slug} className="mx-auto max-w-6xl px-4 py-6">
          <div className="mb-4 flex items-baseline justify-between">
            <h3 className="text-xl font-bold">{locale === "en" && c.name_en ? c.name_en : c.name_ko}</h3>
            <Link href={`/collections/${c.slug}`} className="text-sm text-neutral-500 hover:underline">{tt.viewAll}</Link>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {c.products.slice(0, 4).map((p) => <ProductCard key={p.slug} p={p} locale={locale} />)}
          </div>
        </section>
      ))}

      {/* About teaser */}
      <section className="mt-grid-lg mx-auto mt-8 max-w-6xl border-y border-line px-4 py-16 text-center">
        <p className="mt-tagline text-[10px]">everyday excellence</p>
        <h2 className="mt-3 text-2xl font-bold">{tt.about}</h2>
        <p className="prose-serif mx-auto mt-4 max-w-2xl text-[17px] text-ink/80">{locale === "en" ? brand.about.en : brand.about.ko}</p>
        <Link href="/about" className="mt-4 inline-block font-mono text-xs uppercase tracking-wider text-clayDeep hover:underline">{tt.viewAll} →</Link>
      </section>

      {/* 정보 링크 (커피정보 · 블로그 · Contact) */}
      <section className="mx-auto grid max-w-6xl gap-4 px-4 pb-16 md:grid-cols-3">
        {[
          { href: "/coffee-info", title: tt.coffeeInfo, desc: "농장·플레이버·추천 레시피·인포카드" },
          { href: "/blogs/coffeelog", title: tt.blog, desc: "Coffeelog 커피 이야기" },
          { href: "/contact", title: tt.contact, desc: "납품·컨설팅·교육·제품 문의" },
        ].map((c) => (
          <Link key={c.href} href={c.href} className="rounded-card border border-line bg-paper p-6 hover:bg-warmPaper">
            <p className="font-bold">{c.title}</p>
            <p className="mt-1 text-sm text-inkSoft">{c.desc}</p>
          </Link>
        ))}
      </section>
    </main>
  );
}

// 로그인 사용자 역할(개인/사업자) 조회 — 실패해도 비로그인으로 처리.
async function fetchRole(): Promise<string | null> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    return prof?.role ?? "individual";
  } catch {
    return null;
  }
}

// CMS 사이트 설정(히어로/슬라이드) 조회 — 실패 시 빈 맵.
async function fetchSiteSettings(brandCode: string): Promise<Record<string, string>> {
  try {
    const supabase = createClient();
    const { data: b } = await supabase.from("brand").select("id").eq("code", brandCode).maybeSingle();
    if (!b) return {};
    const { data: settings } = await supabase.from("site_setting").select("key,value").eq("brand_id", b.id);
    return Object.fromEntries((settings ?? []).map((r) => [r.key, r.value])) as Record<string, string>;
  } catch {
    return {};
  }
}
