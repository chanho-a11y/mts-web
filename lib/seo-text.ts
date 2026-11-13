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
/** 화면 소제목용: seoTitle 과 같다(첫 긴 줄표는 콜론, 나머지와 가운뎃점은 쉼표). D-168 */
export const seoHeading = seoTitle;

/** JSON-LD 의 사람이 읽는 문자열(name, headline, description, educationalLevel 등)에서 긴 줄표와 가운뎃점을 정리한다.
 *  AI 와 검색이 그대로 인용하는 필드만 바꾸고, 값(value), URL, 날짜는 건드리지 않는다(D-168). */
const LD_TITLE_KEYS = new Set(["name", "headline", "alternativeHeadline"]);
const LD_TEXT_KEYS = new Set(["description", "educationalLevel", "learningResourceType", "jobTitle", "text"]);
export function cleanLd<T>(o: T, key = ""): T {
  if (Array.isArray(o)) return o.map((v) => cleanLd(v, key)) as unknown as T;
  if (o && typeof o === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(o as Record<string, unknown>)) out[k] = cleanLd(v, k);
    return out as T;
  }
  if (typeof o === "string" && /[—·]/.test(o)) {
    if (LD_TITLE_KEYS.has(key)) return seoTitle(o) as unknown as T;
    if (LD_TEXT_KEYS.has(key)) return seoText(o) as unknown as T;
  }
  return o;
}

/** 본문 HTML 의 h2, h3 텍스트에만 seoHeading 을 적용한다(교육자료 절 제목, D-168). 태그가 섞인 제목은 그대로 둔다. */
export function cleanHeadingsHtml(html: string): string {
  return html.replace(/(<h[23][^>]*>)([^<]*)(<\/h[23]>)/g, (_m, a: string, t: string, b: string) => a + seoHeading(t) + b);
}

export function fitTitle(title: string, brandName = "MTSPACE COFFEE"): string | { absolute: string } {
  const t = seoTitle(title);
  return (t + TITLE_SEP + brandName).length > 60 ? { absolute: t } : t;
}
