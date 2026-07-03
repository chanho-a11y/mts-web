import Link from "next/link";
import { getStorefrontContext } from "@/lib/storefront";
import { getCategories, getBestsellers, getNewArrivals } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import ProductCard from "@/components/product-card";
import HeroSlideshow from "@/components/hero-slideshow";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

// 역할별 카테고리 노출 순서
const CONSUMER_ORDER = ["blends", "single-origins", "decaf", "normcore", "merch"];
const BUSINESS_ORDER = ["wholesale", "blends", "single-origins", "decaf"];

export default async function Home() {
  const { brand, locale, storefrontId } = await getStorefrontContext();
  const tt = t(locale);

  // storefront 확인 후 독립적인 조회를 병렬 실행(순차 → 동시).
  const [categories, role, settingsMap, bestsellers, newArrivals] = await Promise.all([
    getCategories(storefrontId),
    fetchRole(),
    fetchSiteSettings(brand.code),
    getBestsellers(storefrontId, 4),
    getNewArrivals(storefrontId, 4),
  ]);
  const isBusiness = role === "business" || role === "admin"; // 관리자도 사업자전용 노출

  // CMS 사이트 설정(히어로 + 이미지 슬라이드)
  const heroTitle = settingsMap.hero_title || brand.name;
  const heroSubtitle = settingsMap.hero_subtitle || (locale === "en" ? brand.philosophy.en : brand.philosophy.ko);
  const slideRaw = settingsMap.home_slides || "";

  // 이미지 슬라이드(상품 아님): CMS 경로 우선, 없으면 기본 이미지
  const defaultSlides = ["/images/hero.jpg", "/images/cat-single-origins.jpg", "/images/about-roastery.jpg", "/images/cat-blends.jpg"];
  const slides = (slideRaw ? slideRaw.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean) : defaultSlides)
    .map((src) => ({ src, alt: brand.name }));

  // 홈 제품 썸네일 4구성: 베스트 · 이달의 신상품 · 블렌드 · 싱글오리진
  const catBySlug = (slug: string) => categories.find((c) => c.slug === slug);
  const blendsCat = catBySlug("blends");
  const singlesCat = catBySlug("single-origins");
  const catName = (c: typeof blendsCat, fallback: string) =>
    c ? (locale === "en" && c.name_en ? c.name_en : c.name_ko) : fallback;

  // 사업자 전용 제품은 사업자 회원에게만 노출(4구성 통일 유지)
  const vis = (arr: typeof bestsellers) => arr.filter((p) => isBusiness || !p.is_b2b_only);
  const homeSections: { key: string; title: string; href: string; products: typeof bestsellers }[] = [
    { key: "best", title: locale === "en" ? "Best" : "베스트", href: "/collections/all", products: vis(bestsellers).slice(0, 4) },
    { key: "new", title: locale === "en" ? "New This Month" : "이달의 신상품", href: "/collections/all", products: vis(newArrivals).slice(0, 4) },
    { key: "blends", title: catName(blendsCat, locale === "en" ? "Blends" : "블렌드"), href: "/collections/blends", products: vis(blendsCat?.products ?? []).slice(0, 4) },
    { key: "singles", title: catName(singlesCat, locale === "en" ? "Single Origins" : "싱글 오리진"), href: "/collections/single-origins", products: vis(singlesCat?.products ?? []).slice(0, 4) },
  ].filter((s) => s.products.length > 0);

  // 카테고리 칩 슬라이더(내비게이션)
  const order = isBusiness ? BUSINESS_ORDER : CONSUMER_ORDER;
  const shopCategories = [...categories]
    .filter((c) => c.slug !== "subscription" && (isBusiness ? true : c.slug !== "wholesale"))
    .sort((a, b) => {
      const ia = order.indexOf(a.slug); const ib = order.indexOf(b.slug);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });

  return (
    <main>
      {/* 이미지 슬라이드 (실제 이미지) — 하단 쇼핑 버튼 제거(D-031) */}
      <HeroSlideshow slides={slides} title={heroTitle} subtitle={heroSubtitle} locale={locale} />

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

      {/* 제품 썸네일 4구성: 베스트 · 이달의 신상품 · 블렌드 · 싱글오리진 (D-031) */}
      {isBusiness && (
        <div className="mx-auto max-w-6xl px-4 pt-4">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold">{tt.businessShop}</h2>
            <span className="rounded-full bg-clay/10 px-2 py-0.5 text-[11px] text-clayDeep">{tt.businessPricing}</span>
          </div>
        </div>
      )}
      {homeSections.map((s) => (
        <section key={s.key} className="mx-auto max-w-6xl px-4 py-6">
          <div className="mb-4 flex items-baseline justify-between">
            <h3 className="text-xl font-bold">{s.title}</h3>
            <Link href={s.href} className="text-sm text-neutral-500 hover:underline">{tt.viewAll}</Link>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {s.products.map((p) => <ProductCard key={p.slug} p={p} locale={locale} />)}
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

      {/* 정보 링크 (블로그 · Contact) — 커피 정보 메뉴는 향후 재설정 예정으로 제거 */}
      <section className="mx-auto grid max-w-6xl gap-4 px-4 pb-16 md:grid-cols-2">
        {[
          { href: "/blogs/coffeelog", title: tt.blog, desc: tt.coffeelogDesc },
          { href: "/contact", title: tt.contact, desc: tt.contactDesc },
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
