// 자사 1차 데이터(블로그 근거) + 출처(provenance) 유틸 — 클라이언트 안전(서버 import 없음).
// 신뢰 아키텍처(D-042): 1차 데이터 우선 · KB 정본 · 출처 없는 수치 게시 잠금.

export interface EvidenceData {
  roast_profile?: string; // 로스팅 프로파일(수치)
  cupping?: string;       // 컵노트 실측(자체 커핑)
  competition?: string;   // 대회 검증/기록
  b2b_case?: string;      // 거래처 사례
  chanotonado?: string;   // 차노토네이도 파라미터
}

export const EVIDENCE_FIELDS: { key: keyof EvidenceData; ko: string; hint: string }[] = [
  { key: "roast_profile", ko: "로스팅 프로파일(수치)", hint: "예: 1차 크랙 9:30 · 배출 11:40 · DTR 18%" },
  { key: "cupping", ko: "컵노트 실측(자체 커핑)", hint: "예: 산미 7.5 · 단맛 8 · 바디 7 (SCA CVA 기준 자체 커핑)" },
  { key: "competition", ko: "대회 검증/기록", hint: "예: 2023 KBrC 이 프로파일로 결승 진출" },
  { key: "b2b_case", ko: "거래처 사례", hint: "예: A카페 아이스 아메리카노 메뉴에 6개월 납품" },
  { key: "chanotonado", ko: "차노토네이도 파라미터", hint: "예: 물 92도 · 15g/240g · 회전 푸어 3회" },
];

// 폼 FormData → EvidenceData (빈 값 제외). name 규칙: ev_<key>
export function buildEvidenceFromForm(get: (name: string) => string): EvidenceData | null {
  const out: EvidenceData = {};
  EVIDENCE_FIELDS.forEach((f) => {
    const v = get(`ev_${f.key}`).trim();
    if (v) (out as Record<string, string>)[f.key] = v;
  });
  return Object.keys(out).length ? out : null;
}

// 출처 태깅: 본문에 삽입하는 사실은 data-src로 감싸 provenance를 남긴다(팩트체크 게이트가 인식).
// src 예: "자사"(1차 데이터) · "KB:커핑"(지식베이스 정의) · "출처"(검증된 외부 링크).
export function srcTag(src: string, html: string): string {
  return `<span data-src="${src.replace(/["<>]/g, "")}">${html}</span>`;
}

// 통계·권위 수치 패턴(퍼센트·N배·큰수·N명·N위·N회). 일반 브루잉 수치(온도·시간·g·주·일)는 제외.
const STAT_RE = /\d+(?:\.\d+)?\s?%|\d+\s?배|\d{1,3}(?:,\d{3})+|\d+\s?명|\d+\s?위|\d+\s?회/g;

// 출처(data-src span) 밖에 있는 통계형 수치를 찾아 반환(있으면 게시 잠금).
export function findUnsourcedStats(html: string): string[] {
  const stripped = html.replace(/<span[^>]*\bdata-src=[^>]*>[\s\S]*?<\/span>/gi, " ");
  const text = stripped.replace(/<[^>]+>/g, " ");
  const hits = text.match(STAT_RE) || [];
  return Array.from(new Set(hits.map((s) => s.trim())));
}
