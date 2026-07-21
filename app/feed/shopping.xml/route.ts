import { headers } from "next/headers";
import { getStorefrontContext } from "@/lib/storefront";
import { getStorefrontProducts } from "@/lib/queries";

export const dynamic = "force-dynamic";

// Meta(Facebook/Instagram) Commerce · Google Merchant 호환 상품 피드 (RSS 2.0 + g: 네임스페이스)
// 카탈로그에서 이 URL을 등록하면 주기적으로 상품을 가져갑니다. (키 불필요)
function esc(s: string) {
  return (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function GET() {
  const host = headers().get("host") ?? "mtspace.coffee";
  const base = `https://${host}`;
  const { storefrontId } = await getStorefrontContext();
  const products = await getStorefrontProducts(storefrontId);

  const items = products
    .filter((p) => p.minPrice > 0)
    .map((p) => {
      const title = p.title_ko.replace(/\[.*?\]\s*/g, "");
      const desc = p.one_liner || p.flavor_notes.join(", ") || title;
      const link = `${base}/products/${p.slug}`;
      const img = p.image ? (p.image.startsWith("http") ? p.image : `${base}${p.image}`) : "";
      const brand = p.title_ko.toLowerCase().includes("normcore") ? "Normcore Coffee" : "MTSPACE COFFEE";
      const cond = p.product_type === "merch" ? "new" : "new";
      // Google product category: 커피 = 1868 (Food, Beverages & Tobacco > Beverages > Coffee).
      // merch(굿즈)는 커피 카테고리 부적합 → 생략(구글 자동 분류).
      const gpc = p.product_type === "merch" ? "" : `<g:google_product_category>1868</g:google_product_category>`;
      return `<item>
<g:id>${esc(p.slug)}</g:id>
<g:title>${esc(title)}</g:title>
<g:description>${esc(desc)}</g:description>
<g:link>${esc(link)}</g:link>
${img ? `<g:image_link>${esc(img)}</g:image_link>` : ""}
<g:availability>in stock</g:availability>
<g:condition>${cond}</g:condition>
<g:price>${p.minPrice}.00 KRW</g:price>
<g:brand>${esc(brand)}</g:brand>
<g:identifier_exists>false</g:identifier_exists>
<g:product_type>${esc(p.product_type ?? "coffee")}</g:product_type>
${gpc}
</item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
<title>MTSPACE COFFEE</title>
<link>${base}</link>
<description>MTSPACE COFFEE 상품 피드 — Meta·Google Shopping</description>
${items}
</channel>
</rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=1800" },
  });
}
