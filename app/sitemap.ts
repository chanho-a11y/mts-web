import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { getStorefrontContext } from "@/lib/storefront";
import { getStorefrontProducts, getCategories } from "@/lib/queries";
import { CHAPTERS } from "@/app/education/_content/meta";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const host = headers().get("host") ?? "mtspace.coffee";
  const base = `https://${host}`;
  const { storefrontId } = await getStorefrontContext();

  const [products, categories] = await Promise.all([
    getStorefrontProducts(storefrontId),
    getCategories(storefrontId),
  ]);

  const statics = ["", "/collections/all", "/about", "/blogs/coffeelog", "/faq", "/contact",
    "/education", "/en/education",
    "/policies/shipping-policy", "/policies/refund-policy", "/policies/privacy-policy", "/policies/terms-of-service"];

  // 교육 자료 — 언어별 URL 을 모두 색인시킨다(hreflang 은 각 페이지 metadata.alternates 가 담당).
  const education = CHAPTERS.flatMap((c) => [
    { url: `${base}/education/${c.slug}`, changeFrequency: "monthly" as const, priority: 0.7 },
    { url: `${base}/en/education/${c.slug}`, changeFrequency: "monthly" as const, priority: 0.6 },
  ]);

  return [
    ...statics.map((p) => ({ url: `${base}${p}`, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.6 })),
    ...categories.map((c) => ({ url: `${base}/collections/${c.slug}`, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...products.map((p) => ({ url: `${base}/products/${p.slug}`, changeFrequency: "weekly" as const, priority: 0.8 })),
    ...education,
  ];
}
