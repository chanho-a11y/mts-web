import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// 지식베이스(kb_entry) + 온라인 리서치 큐레이션에서 블로그 키워드 풀 산출.
// (제품 정보 기반 키워드는 클라이언트에서 합쳐 최종 풀을 만든다.)

// 2026 스페셜티 커피 트렌드(온라인 리서치 반영) + 상시 코어/B2B 키워드
const CURATED = [
  // 트렌드(리서치)
  "지속가능성", "공정무역 원두", "유기농 커피", "친환경 인증", "원산지 투명성", "가공방식 트렌드",
  "라이트 로스트", "홈카페", "홈브루잉", "데이터 기반 원두 추천", "수확 연도", "용해도와 밸런스",
  // 코어 커피
  "스페셜티 커피", "싱글 오리진", "블렌드 로스팅", "핸드드립 레시피", "에스프레소 추출",
  "V60 브루잉", "콜드브루", "원두 보관법", "커피 산미", "커피 바디", "로스팅 프로파일",
  "커피 향미 노트", "디카페인", "우유 스티밍", "그라인딩 사이즈",
  // B2B
  "B2B 원두 도매", "카페 창업 원두", "로스팅 OEM 파트너", "카페 납품 원두", "세금계산서 발행 원두",
];

// "Acidity (산미)" → "산미", "Cupping (커핑)" → "커핑" (한글 우선), 없으면 원문
function cleanTerm(term: string): string {
  const m = term.match(/\(([^)]+)\)/);
  if (m && /[가-힣]/.test(m[1])) return m[1].trim();
  return term.replace(/\s*\([^)]*\)\s*/g, "").trim();
}

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (prof?.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { data: kb } = await supabase.from("kb_entry").select("term").limit(400);
  const kbKeywords = (kb ?? []).map((r: any) => cleanTerm(String(r.term || ""))).filter((s) => s && s.length <= 24);

  const seen = new Set<string>();
  const keywords: string[] = [];
  for (const k of [...CURATED, ...kbKeywords]) {
    const t = k.trim();
    if (t && !seen.has(t)) { seen.add(t); keywords.push(t); }
  }
  return NextResponse.json({ keywords: keywords.slice(0, 80) });
}
