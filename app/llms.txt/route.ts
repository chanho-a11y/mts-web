import { headers } from "next/headers";
import { brandForHost } from "@/lib/brands";
import { getStorefrontContext } from "@/lib/storefront";
import { getStorefrontProducts } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { CHAPTERS, COPY_KO } from "@/app/education/_content/meta";
import { seoText, seoTitle } from "@/lib/seo-text";

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
    `> ${seoText(brand.philosophy.ko)}`,
    ``,
    `${seoText(brand.about.ko)}`,
    ``,
    `- 운영사: (주)엠티에스솔루션스 (대표 홍찬호)`,
    `- 로스팅: 자체 로스터리에서 직접 로스팅, 주문 순서대로 출고`,
    `- 결제: 이니시스, 페이팔(해외 USD), 통화 KRW`,
    `- 국제배송: 커피 원두에 한해 EMS 프리미엄`,
    ``,
    `## 제품 (${products.length})`,
    ...products.map((p) => {
      const bits = [
        p.flavor_notes.length ? `풍미 ${p.flavor_notes.join(", ")}` : "",
        p.roast_level ? `로스팅 ${p.roast_level}` : "",
        p.minPrice ? `₩${p.minPrice.toLocaleString()}` : "",
      ].filter(Boolean);
      return `- [${seoText(p.title_ko)}](${base}/products/${p.slug})` + (bits.length ? `: ${bits.join("; ")}` : "");
    }),
    ``,
    `## 교육자료 The Basic of Coffee (${CHAPTERS.length}개 챕터, 한국어와 영어)`,
    `- [커피 교육 자료 목차](${base}/education) / [English](${base}/en/education)`,
    ...CHAPTERS.map((c) => `- [${seoTitle(COPY_KO[c.slug]?.title ?? c.slug)}](${base}/education/${c.slug})` + (COPY_KO[c.slug]?.tagline ? `: ${seoText(COPY_KO[c.slug].tagline)}` : "")),
    ``,
    `## 블로그 Coffeelog (${posts.length})`,
    ...posts.map((p) => `- [${seoTitle(p.title)}](${base}/blogs/coffeelog/${encodeURIComponent(p.slug)})` + (p.excerpt ? `: ${seoText(p.excerpt)}` : "")),
    ``,
    `## 카페 납품과 컨설팅`,
    `- 카페 원두 납품 안내(정기 납품, 전용 블렌드 OEM 계약 로스팅, 교육과 오픈 지원, 진행 순서, 납품 FAQ): ${base}/wholesale`,
    `- 납품 요약: 시드니에서 검증한 생두 구성과 로스팅 레시피를 그대로 쓴다. 블렌드는 에티오피아 베이스, 싱글 오리진은 라이트 로스팅. 미리 볶아 쌓아 두지 않고 주문에 맞춰 로스팅한다. 소량으로 시작하는 카페도 납품 가능. 도매가는 사업자 회원 가입 후 사업자등록증 확인이 끝나면 계정에 바로 적용되어 그 가격으로 주문한다.`,
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
