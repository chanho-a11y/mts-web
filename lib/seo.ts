// SEO/AIEO helpers — host 기반 절대 URL + JSON-LD 빌더 (robots.ts/sitemap.ts 와 동일한 host 규칙)
import { headers } from "next/headers";
import { BRANDS, type Brand } from "@/lib/brands";

// 요청 host 로 사이트 기준 URL 산출. 알 수 없으면 mtspace.coffee.
export function siteBaseUrl(): string {
  const host = headers().get("host") || "mtspace.coffee";
  const proto = host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
  return `${proto}://${host}`;
}

export function absoluteUrl(path = "/"): string {
  const base = siteBaseUrl();
  if (!path) return base;
  return path.startsWith("http") ? path : `${base}${path.startsWith("/") ? "" : "/"}${path}`;
}

// 브랜드 공식 채널 (sameAs)
function brandSameAs(brand: Brand): string[] {
  const ig = `https://instagram.com/${brand.instagram.replace(/^@/, "")}`;
  const links = [ig];
  if (brand.code === "mtspace") links.push("https://www.youtube.com/channel/UCfe0miBdbyEJrk0lklp8pjg");
  return links;
}

// Organization (사이트 전역)
export function organizationJsonLd(brand: Brand, locale: "ko" | "en") {
  const base = siteBaseUrl();
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: brand.name,
    legalName: "(주)엠티에스솔루션스 MTS Solutions Co., Ltd.",
    url: base,
    logo: absoluteUrl("/images/mtspace-logo.png"),
    description: locale === "en" ? brand.philosophy.en : brand.philosophy.ko,
    email: "chanho@mtspace.coffee",
    founder: { "@type": "Person", name: "Chanho Hong (홍찬호)" },
    address: {
      "@type": "PostalAddress",
      addressCountry: "KR",
      addressRegion: "Gyeonggi-do",
      addressLocality: "Gapyeong-gun",
      streetAddress: "경기도 가평군 청평면 톳골길 3, A동 B1호",
      postalCode: "12451",
    },
    sameAs: brandSameAs(brand),
  };
}

// WebSite + 사이트 검색 액션 (AIEO)
export function webSiteJsonLd(brand: Brand) {
  const base = siteBaseUrl();
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: brand.name,
    url: base,
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${base}/search?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: absoluteUrl(it.path),
    })),
  };
}

export function productJsonLd(opts: {
  name: string;
  description?: string;
  image?: string | string[];
  slug: string;
  price?: number | null;
  currency?: string;
  availability?: boolean;
  brandName: string;
  sku?: string;
}) {
  const images = (Array.isArray(opts.image) ? opts.image : opts.image ? [opts.image] : [])
    .filter(Boolean)
    .map((s) => absoluteUrl(s));
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: opts.name,
    ...(opts.description ? { description: opts.description } : {}),
    ...(images.length ? { image: images } : {}),
    brand: { "@type": "Brand", name: opts.brandName },
    url: absoluteUrl(`/products/${opts.slug}`),
    ...(opts.sku ? { sku: opts.sku } : {}),
  };
  if (opts.price && opts.price > 0) {
    data.offers = {
      "@type": "Offer",
      price: opts.price,
      priceCurrency: opts.currency || "KRW",
      availability: opts.availability === false ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
      url: absoluteUrl(`/products/${opts.slug}`),
    };
  }
  return data;
}

export function articleJsonLd(opts: {
  title: string;
  description?: string;
  image?: string;
  slug: string;
  author?: string;
  datePublished?: string;
  brandName: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: opts.title,
    ...(opts.description ? { description: opts.description } : {}),
    ...(opts.image ? { image: absoluteUrl(opts.image) } : {}),
    mainEntityOfPage: absoluteUrl(`/blogs/coffeelog/${opts.slug}`),
    ...(opts.datePublished ? { datePublished: opts.datePublished } : {}),
    author: { "@type": opts.author ? "Person" : "Organization", name: opts.author || opts.brandName },
    publisher: {
      "@type": "Organization",
      name: opts.brandName,
      logo: { "@type": "ImageObject", url: absoluteUrl("/images/mtspace-logo.png") },
    },
  };
}

export function faqJsonLd(items: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: it.q,
      acceptedAnswer: { "@type": "Answer", text: it.a },
    })),
  };
}

export { BRANDS };
