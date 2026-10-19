// 검색 결과와 AI 요약에 노출되는 문자열(title, description, OG, llms.txt)의 표기 규칙.
// 긴 줄표와 가운뎃점을 쓰지 않는다(2026-10-19 대표 결정, D-147).
export const TITLE_SEP = " | ";

function tidy(s: string): string {
  return s
    .replace(/\s*—\s*/g, ", ")
    .replace(/\s*·\s*/g, ", ")
    .replace(/,\s*([.。:;])/g, "$1")
    .replace(/,\s*,/g, ",")
    .replace(/,\s*$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** 설명문용: 긴 줄표와 가운뎃점을 쉼표로 바꾼다. */
export function seoText(s: string): string {
  return tidy(s);
}

/** 제목용: 첫 긴 줄표는 콜론으로, 나머지 긴 줄표와 가운뎃점은 쉼표로 바꾼다. */
export function seoTitle(s: string): string {
  return tidy(s.replace(/\s*—\s*/, ": "));
}

/** 브랜드 접미사(" | MTSPACE COFFEE")를 붙여 60자를 넘으면 접미사 없이 쓴다(검색 결과 잘림 방지). */
export function fitTitle(title: string, brandName = "MTSPACE COFFEE"): string | { absolute: string } {
  const t = seoTitle(title);
  return (t + TITLE_SEP + brandName).length > 60 ? { absolute: t } : t;
}
