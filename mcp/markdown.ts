/**
 * 마크다운 → 화이트리스트 HTML.
 *
 * 왜 변환기를 직접 두는가
 *   1) 이 디렉터리는 사설 패키지로 추출된다. 의존성 하나가 고객사 전부로 퍼진다.
 *   2) 입력을 먼저 전부 이스케이프하므로 위험 태그는 "걸러내는" 게 아니라
 *      애초에 만들어지지 않는다. 정규식 새니타이저의 우회 문제를 원천 회피한다.
 *   3) 출력 태그 집합이 고정이라 발행 페이지 CSS(태그 선택자 기반)와 항상 맞는다.
 *
 * 출력 태그는 아래가 전부다:
 *   h2 h3 p br ul ol li strong em code a img blockquote table thead tbody tr th td
 *
 * h1 은 만들지 않는다 — 발행 페이지가 제목을 h1 으로 이미 출력한다.
 */

/**
 * href·src 에 허용하는 형태. 통과하지 못하면 링크 자체를 만들지 않는다.
 *
 * 상대경로는 `/` 로 시작해야 하되 `//` 와 `/\` 는 제외한다 —
 * 프로토콜 상대 URL(`//evil.tld`)이 외부 사이트로 나가는 통로가 되기 때문이다.
 */
const ALLOWED_URL = /^(https?:\/\/|mailto:|\/(?![/\\]))/i;

/** 제어문자 — URL 에 섞이면 스킴 검사를 우회할 수 있으므로 거부한다 */
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0020\u007F]/;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * 이미 이스케이프된 문자열에서 URL 을 꺼내 검증한다.
 * 통과하지 못하면 null — 호출부는 링크를 만들지 않고 텍스트로 남긴다.
 */
function safeUrl(escapedUrl: string): string | null {
  const u = escapedUrl.trim();
  if (!u || CONTROL_CHARS.test(u)) return null;
  // 이스케이프로 &amp; 가 된 것을 원복해 스킴만 검사한다(출력은 이스케이프된 형태 유지).
  const forCheck = u.replace(/&amp;/g, "&");
  if (!ALLOWED_URL.test(forCheck)) return null;
  return u;
}

/**
 * 인라인 서식. 입력은 **이미 이스케이프된** 문자열이어야 한다.
 * 순서가 중요하다 — 이미지 → 링크 → 코드 → 굵게 → 기울임.
 */
function inline(escaped: string): string {
  let s = escaped;

  // ![alt](url)
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_m, alt: string, url: string) => {
    const safe = safeUrl(url);
    return safe ? `<img src="${safe}" alt="${alt}" />` : alt;
  });

  // [text](url)
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, text: string, url: string) => {
    const safe = safeUrl(url);
    return safe ? `<a href="${safe}">${text}</a>` : text;
  });

  // `code`
  s = s.replace(/`([^`\n]+)`/g, "<code>$1</code>");
  // **bold** → 반드시 *italic* 보다 먼저
  s = s.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
  // *italic*
  s = s.replace(/\*([^*\n]+)\*/g, "<em>$1</em>");

  return s;
}

/** `|` 로 시작하는 표 구분선인지 */
function isTableDivider(line: string): boolean {
  return /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?$/.test(line.trim());
}

function splitRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
}

/**
 * 마크다운을 화이트리스트 HTML 로 바꾼다.
 * 지원: ## 제목 · 문단 · - 목록 · 1. 목록 · > 인용 · | 표 | · **강조** · [링크](url) · ![이미지](url) · `코드`
 * 입력에 든 HTML 태그는 태그가 아니라 글자로 출력된다.
 */
export function mdToHtml(md: string): string {
  const lines = String(md ?? "").replace(/\r\n?/g, "\n").split("\n");
  const out: string[] = [];

  let para: string[] = [];
  let list: { type: "ul" | "ol"; items: string[] } | null = null;
  let quote: string[] = [];

  const flushPara = () => {
    if (para.length) {
      out.push(`<p>${para.join("<br />")}</p>`);
      para = [];
    }
  };
  const flushList = () => {
    if (list) {
      out.push(`<${list.type}>${list.items.map((i) => `<li>${i}</li>`).join("")}</${list.type}>`);
      list = null;
    }
  };
  const flushQuote = () => {
    if (quote.length) {
      out.push(`<blockquote><p>${quote.join("<br />")}</p></blockquote>`);
      quote = [];
    }
  };
  const flushAll = () => {
    flushPara();
    flushList();
    flushQuote();
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trimEnd();

    // 빈 줄 = 블록 경계
    if (!line.trim()) {
      flushAll();
      continue;
    }

    // 표 — 헤더행 + 구분선이 연속일 때만 표로 본다
    if (line.trimStart().startsWith("|") && isTableDivider(lines[i + 1] ?? "")) {
      flushAll();
      const head = splitRow(line).map((c) => `<th>${inline(escapeHtml(c))}</th>`).join("");
      const body: string[] = [];
      let j = i + 2;
      while (j < lines.length && lines[j].trimStart().startsWith("|")) {
        const cells = splitRow(lines[j]).map((c) => `<td>${inline(escapeHtml(c))}</td>`).join("");
        body.push(`<tr>${cells}</tr>`);
        j++;
      }
      out.push(`<table><thead><tr>${head}</tr></thead><tbody>${body.join("")}</tbody></table>`);
      i = j - 1;
      continue;
    }

    // 제목 — # 과 ## 는 h2, ### 이상은 h3
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      flushAll();
      const tag = h[1].length <= 2 ? "h2" : "h3";
      out.push(`<${tag}>${inline(escapeHtml(h[2].trim()))}</${tag}>`);
      continue;
    }

    // 순서 없는 목록
    const ul = /^\s*[-*+]\s+(.*)$/.exec(line);
    if (ul) {
      flushPara();
      flushQuote();
      if (!list || list.type !== "ul") {
        flushList();
        list = { type: "ul", items: [] };
      }
      list.items.push(inline(escapeHtml(ul[1].trim())));
      continue;
    }

    // 순서 있는 목록
    const ol = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (ol) {
      flushPara();
      flushQuote();
      if (!list || list.type !== "ol") {
        flushList();
        list = { type: "ol", items: [] };
      }
      list.items.push(inline(escapeHtml(ol[1].trim())));
      continue;
    }

    // 인용
    const bq = /^\s*>\s?(.*)$/.exec(line);
    if (bq) {
      flushPara();
      flushList();
      quote.push(inline(escapeHtml(bq[1].trim())));
      continue;
    }

    // 그 외 = 문단
    flushList();
    flushQuote();
    para.push(inline(escapeHtml(line.trim())));
  }

  flushAll();
  return out.join("\n");
}

/** 태그를 걷어낸 순수 텍스트. 요약·분량 계산용 */
export function htmlToText(html: string): string {
  return String(html ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** 한글은 공백 분절이 성기므로 글자 수를 함께 본다 */
export function countWords(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  return t.split(/\s+/).length;
}

/**
 * 제목 → 슬러그. 관리자 화면(app/admin/blog/actions.ts)과 같은 규칙을 쓴다.
 * 결과가 비면 호출부가 대체 슬러그를 정한다(여기서 시각에 의존하지 않는다).
 */
export function slugify(s: string): string {
  return String(s ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9가-힣\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}
