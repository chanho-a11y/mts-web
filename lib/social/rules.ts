/**
 * 인스타그램 콘텐츠 규칙 검사 (D-138, D-139).
 *
 * 관리자 수정 화면에서 저장할 때 쓴다. 캡션과 이미지 안의 글자를 같은 규칙으로 본다.
 * errors 가 있으면 저장하지 않고, warnings 는 초안에 남겨 승인할 때 보이게 한다.
 */
export interface ContentCheck {
  errors: string[];
  warnings: string[];
}

/** D-138: 지역을 나타내는 단어, 요일 표기, 긴 줄표, 가운뎃점, 절대화 표현 */
const BANNED: { term: string; why: string }[] = [
  { term: "가평", why: "지역명" },
  { term: "청평", why: "지역명" },
  { term: "경기", why: "지역명" },
  { term: "인천", why: "지역명" },
  { term: "부평", why: "지역명" },
  { term: "요일", why: "로스팅과 출고 요일 표기" },
  { term: "—", why: "긴 줄표" },
  { term: "–", why: "긴 줄표" },
  { term: "·", why: "가운뎃점" },
  { term: "최고의", why: "절대화 표현" },
  { term: "유일한", why: "절대화 표현" },
  { term: "완벽한", why: "절대화 표현" },
  { term: "1등", why: "절대화 표현" },
  { term: "최상의", why: "절대화 표현" },
];

/** 제품 용량 표기. 레시피의 도징량과 추출량(20g, 32g 등)은 걸리지 않는다. */
const CAPACITY = /(?<![\d.])(125|200|250|500)\s?g\b|(?<![\d.])1\s?kg\b/i;

export function checkContentText(where: string, text: string): string[] {
  const errors: string[] = [];
  for (const b of BANNED) {
    if (text.includes(b.term)) errors.push(`${where}: "${b.term}" 은(는) 쓰지 않습니다(${b.why}).`);
  }
  const cap = CAPACITY.exec(text);
  if (cap) errors.push(`${where}: 제품 용량 표기 "${cap[0]}" 은(는) 쓰지 않습니다.`);
  return errors;
}

export function checkSocialContent(caption: string, hashtags: string[], imageTexts: string[]): ContentCheck {
  const errors: string[] = [];
  const warnings: string[] = [];

  errors.push(...checkContentText("캡션", caption));
  if (imageTexts.length) errors.push(...checkContentText("이미지 글자", imageTexts.join("\n")));

  if (!caption.trim()) errors.push("캡션이 비어 있습니다.");
  if (caption.length > 2200) errors.push(`캡션 ${caption.length}자입니다. 인스타그램 상한은 2,200자입니다.`);
  if (/#\S/.test(caption)) errors.push("캡션 본문에 # 가 있습니다. 해시태그는 해시태그 칸에만 적습니다.");

  if (hashtags.length > 30) errors.push(`해시태그 ${hashtags.length}개입니다. 상한은 30개입니다.`);
  if (hashtags.length === 0) warnings.push("해시태그가 없습니다.");
  const dup = hashtags.filter((h, i) => hashtags.indexOf(h) !== i);
  if (dup.length) warnings.push(`중복 해시태그: ${[...new Set(dup)].join(", ")}`);

  // 한글 먼저, 영문 나중(D-138). 한글이 전혀 없거나 영문 문장이 전혀 없으면 알려 준다.
  if (!/[가-힣]/.test(caption)) warnings.push("캡션에 한글이 없습니다. 한글을 먼저, 영문을 나중에 적습니다.");
  if (!/[A-Za-z]{3,}\s+[A-Za-z]{2,}\s+[A-Za-z]{2,}/.test(caption)) warnings.push("캡션에 영문 병기가 없습니다.");

  return { errors, warnings };
}

/** 해시태그 칸의 입력(공백, 쉼표, # 섞임)을 배열로 만든다. */
export function parseHashtags(input: string): string[] {
  return input
    .split(/[\s,]+/)
    .map((h) => h.replace(/^#+/, "").trim())
    .filter(Boolean);
}
