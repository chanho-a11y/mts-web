// L-1: 관리자 작성 HTML(블로그 본문·FAQ 답변)을 렌더 직전 서버에서 정화.
// 의존성 없이 보수적으로: 위험 태그 제거 + 모든 이벤트 핸들러(on*) 제거 + javascript:/data:(text/html) URL 차단.
// 리치에디터 산출물(서식·이미지·링크)은 보존하되, 스크립트 실행 벡터만 제거하는 방어심층 계층이다.

const DANGEROUS_TAGS = /<\s*\/?\s*(script|iframe|object|embed|link|meta|base|form|noscript|template)\b[^>]*>/gi;
// <style> ... </style> 블록 통째 제거(내용 포함)
const STYLE_BLOCK = /<\s*style\b[^>]*>[\s\S]*?<\s*\/\s*style\s*>/gi;
const SCRIPT_BLOCK = /<\s*script\b[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi;
// on* 이벤트 핸들러 속성 제거 (onclick=, onerror= 등) — 따옴표/무따옴표 모두
const EVENT_ATTRS = /\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;
// javascript: / vbscript: 스킴을 href/src 등에서 무력화
const JS_SCHEME = /((?:href|src|xlink:href|action)\s*=\s*)("|')?\s*(?:javascript|vbscript|data\s*:\s*text\/html)\s*:[^"'>\s]*/gi;

export function sanitizeHtml(input: string | null | undefined): string {
  if (!input) return "";
  let s = String(input);
  s = s.replace(SCRIPT_BLOCK, "");
  s = s.replace(STYLE_BLOCK, "");
  s = s.replace(DANGEROUS_TAGS, "");
  s = s.replace(EVENT_ATTRS, "");
  s = s.replace(JS_SCHEME, "$1$2#");
  return s;
}
