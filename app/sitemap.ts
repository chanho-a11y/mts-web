import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { getStorefrontContext } from "@/lib/storefront";
import { getStorefrontProducts, getCategories } from "@/lib/queries";
import { CHAPTERS } from "@/app/education/_content/meta";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const host = headers().get("host") ?? "mtspace.coffee";
  const base = `https://${host}`;
  const { storefrontId } = await getStorefrontContext();

  const [products, categories] = await Promise.all([
    getStorefrontProducts(storefrontId),
    getCategories(storefrontId),
  ]);

  const statics = ["", "/collections/all", "/about", "/consulting", "/coffee-info", "/blogs/coffeelog", "/faq", "/contact",
    "/education", "/en/education",
    "/policies/shipping-policy", "/policies/refund-policy", "/policies/privacy-policy", "/policies/terms-of-service",
    "/policies/contact-information", "/policies/legal-notice"];

  // 발행된 블로그 글(D-134). 조회에 실패해도 사이트맵 전체가 죽지 않게 빈 배열로 둔다.
  let posts: { slug: string; published_at: string | null }[] = [];
  try {
    const { data } = await createClient()
      .from("content_post").select("slug,published_at").eq("status", "published").order("published_at", { ascending: false });
    posts = data ?? [];
  } catch {}

  // 교육 자료 — 언어별 URL 을 모두 색인시킨다(hreflang 은 각 페이지 metadata.alternates 가 담당).
  const education = CHAPTERS.flatMap((c) => [
    { url: `${base}/education/${c.slug}`, changeFrequency: "monthly" as const, priority: 0.7 },
    { url: `${base}/en/education/${c.slug}`, changeFrequency: "monthly" as const, priority: 0.6 },
  ]);

  return [
    ...statics.map((p) => ({ url: `${base}${p}`, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.6 })),
    ...categories.filter((c) => (c.products?.length ?? 0) > 0).map((c) => ({ url: `${base}/collections/${c.slug}`, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...products.map((p) => ({ url: `${base}/products/${p.slug}`, changeFrequency: "weekly" as const, priority: 0.8 })),
    ...education,
    ...posts.map((p) => ({
      url: `${base}/blogs/coffeelog/${encodeURIComponent(p.slug)}`,
      ...(p.published_at ? { lastModified: new Date(p.published_at) } : {}),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
