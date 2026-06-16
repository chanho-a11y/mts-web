import { headers } from "next/headers";
import { brandForHost } from "@/lib/brands";

export const dynamic = "force-dynamic";

export async function GET() {
  const host = headers().get("host") ?? "mtspace.coffee";
  const base = `https://${host}`;
  const brand = brandForHost(host);
  const md = `# Agent Instructions — ${brand.name}

AI 에이전트가 ${base} 와 상호작용하는 방법을 안내합니다.

## 읽기 전용 (인증 불필요)
- 전체 상품: GET ${base}/collections/all
- 상품 페이지: GET ${base}/products/{slug}
- 카테고리: GET ${base}/collections/{slug}
- 검색: GET ${base}/search?q={query}
- 사이트맵: GET ${base}/sitemap.xml
- 사이트 요약(LLM): GET ${base}/llms.txt
- 제품 자산 이미지: GET ${base}/api/og/thumbnail/{slug} (PNG), ${base}/api/asset/cardnews/{slug} (SVG)

## 결제 규칙
- 체크아웃·결제는 사람의 명시적 승인 하에서만 진행됩니다. 에이전트가 자동으로 결제를 완료하지 않습니다.

## 브랜드
- ${brand.name} · ${brand.instagram}
- 로스터리: 경기도 가평 · 매주 월·화 로스팅
- 문의: hello@mtspace.coffee
`;
  return new Response(md, { headers: { "Content-Type": "text/markdown; charset=utf-8" } });
}
