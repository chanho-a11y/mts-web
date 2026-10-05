import { headers } from "next/headers";
import { brandForHost } from "@/lib/brands";
import { getStorefrontContext } from "@/lib/storefront";
import { getStorefrontProducts } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { CHAPTERS, COPY_KO } from "@/app/education/_content/meta";

export const dynamic = "force-dynamic";

// AIEO: AI 검색/에이전트가 읽기 쉬운 사이트 요약 (텍스트)
export async function GET() {
  const host = headers().get("host") ?? "mtspace.coffee";
  const base = `https://${host}`;
  const brand = brandForHost(host);
  const { storefrontId } = await getStorefrontContext();
  const products = await getStorefrontProducts(storefrontId);
  // AI 검색이 인용하는 것은 정의와 설명 콘텐츠다. 교육자료와 블로그를 함께 싣는다(D-134).
  let posts: { slug: string; title: string; excerpt: string | null }[] = [];
  try {
    const { data } = await createClient()
      .from("content_post").select("slug,title,excerpt").eq("status", "published").order("published_at", { ascending: false });
    posts = data ?? [];
  } catch {}

  const lines = [
    `# ${brand.name}`,
    ``,
    `> ${brand.philosophy.ko}`,
    ``,
    `${brand.about.ko}`,
    ``,
    `- 운영사: (주)엠티에스솔루션스 (대표 홍찬호)`,
    `- 로스터리: 경기도 가평군 청평면 · 매주 월·화 로스팅, 화·수 출고(신선 배송)`,
    `- 결제: 이니시스·페이팔(해외 USD) · 통화 KRW`,
    `- 국제배송: 커피 원두에 한해 EMS 프리미엄`,
    ``,
    `## 제품 (${products.length})`,
    ...products.map((p) => `- [${p.title_ko}](${base}/products/${p.slug})` +
      (p.flavor_notes.length ? ` — 풍미: ${p.flavor_notes.join(", ")}` : "") +
      (p.roast_level ? ` · 로스팅: ${p.roast_level}` : "") +
      (p.minPrice ? ` · ₩${p.minPrice.toLocaleString()}` : "")),
    ``,
    `## 교육자료 The Basic of Coffee (${CHAPTERS.length}개 챕터, 한국어와 영어)`,
    `- [커피 교육 자료 목차](${base}/education) / [English](${base}/en/education)`,
    ...CHAPTERS.map((c) => `- [${COPY_KO[c.slug]?.title ?? c.slug}](${base}/education/${c.slug})` + (COPY_KO[c.slug]?.tagline ? `: ${COPY_KO[c.slug].tagline}` : "")),
    ``,
    `## 블로그 Coffeelog (${posts.length})`,
    ...posts.map((p) => `- [${p.title}](${base}/blogs/coffeelog/${encodeURIComponent(p.slug)})` + (p.excerpt ? `: ${p.excerpt}` : "")),
    ``,
    `## 카페 납품과 컨설팅`,
    `- 컨설팅과 파트너십(브랜드 전략, 데이터와 POS 분석, 운영 SOP, 계약 로스팅, 바리스타 교육): ${base}/consulting`,
    `- 사업자 회원가입(승인 후 등급별 도매가 적용): ${base}/account/signup?role=business`,
    `- 납품 문의: ${base}/contact?type=wholesale`,
    `- 브랜드 소개: ${base}/about`,
    `- 원두별 커피 정보와 추천 레시피: ${base}/coffee-info`,
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
