import { createClient } from "@/lib/supabase/server";

// 사이트 관리자 > 페이지 수정 — 페이지별 편집 가능한 텍스트/이미지 필드 정의.
// 값은 site_setting(mtspace 브랜드)에 키로 저장되며, 각 페이지가 폴백과 함께 사용한다.
export type FieldType = "text" | "textarea" | "image";
export interface PageField { key: string; label: string; type: FieldType }
export interface PageDef { id: string; title: string; path: string; fields: PageField[] }

export const PAGES: PageDef[] = [
  {
    id: "about", title: "브랜드 소개 (About)", path: "/about",
    fields: [
      { key: "about_hero_image", label: "상단 이미지 경로", type: "image" },
      { key: "about_brand_title", label: "브랜드 소개 제목", type: "text" },
      { key: "about_brand_body", label: "브랜드 소개 본문", type: "textarea" },
    ],
  },
  {
    id: "consulting", title: "컨설팅 (Consulting)", path: "/consulting",
    fields: [
      { key: "consulting_hero_image", label: "상단 이미지 경로", type: "image" },
      { key: "consulting_intro", label: "인트로 본문", type: "textarea" },
    ],
  },
];

export function pageById(id: string): PageDef | undefined {
  return PAGES.find((p) => p.id === id);
}

// mtspace 브랜드의 site_setting 전체를 map 으로 반환(페이지 렌더/편집 공용).
export async function getPageSettings(): Promise<Record<string, string>> {
  const supabase = createClient();
  const { data: brand } = await supabase.from("brand").select("id").eq("code", "mtspace").maybeSingle();
  if (!brand) return {};
  const { data } = await supabase.from("site_setting").select("key,value").eq("brand_id", brand.id);
  return Object.fromEntries((data ?? []).map((r) => [r.key, r.value ?? ""]));
}
