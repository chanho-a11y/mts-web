import { headers } from "next/headers";
import { brandForHost } from "@/lib/brands";
import { getStorefrontContext } from "@/lib/storefront";
import { getStorefrontProducts } from "@/lib/queries";

export const dynamic = "force-dynamic";

// AIEO: AI 검색/에이전트가 읽기 쉬운 사이트 요약 (텍스트)
export async function GET() {
  const host = headers().get("host") ?? "mtspace.coffee";
  const base = `https://${host}`;
  const brand = brandForHost(host);
  const { storefrontId } = await getStorefrontContext();
  const products = await getStorefrontProducts(storefrontId);

  const lines = [
    `# ${brand.name}`,
    ``,
    `> ${brand.philosophy.ko}`,
    ``,
    `${brand.about.ko}`,
    ``,
    `- 운영사: (주)엠티에스솔루션스 (대표 홍찬호)`,
    `- 로스터리: 경기도 가평군 청평면 · 매주 월·화 로스팅, 화·수 출고(신선 배송)`,
    `- 결제: 이니시스·카카오페이·페이팔(해외 USD) · 통화 KRW`,
    `- 국제배송: 커피 원두에 한해 EMS 프리미엄`,
    ``,
    `## 제품 (${products.length})`,
    ...products.map((p) => `- [${p.title_ko}](${base}/products/${p.slug})` +
      (p.flavor_notes.length ? ` — 풍미: ${p.flavor_notes.join(", ")}` : "") +
      (p.roast_level ? ` · 로스팅: ${p.roast_level}` : "") +
      (p.minPrice ? ` · ₩${p.minPrice.toLocaleString()}` : "")),
    ``,
    `## 정책`,
    `- 배송: ${base}/policies/shipping-policy`,
    `- 환불: ${base}/policies/refund-policy`,
    `- 개인정보: ${base}/policies/privacy-policy`,
    `- FAQ: ${base}/faq`,
    ``,
    `에이전트 안내: ${base}/agents.md`,
  ];
  return new Response(lines.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
