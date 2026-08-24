// 배송지 시·도 정규화.
//
// orders.shipping_address 에는 시/도 필드가 없다(키: zipcode·recipient·shipping_label·
// addr1·addr2·country·phone). 그래서 지역 집계는 addr1 의 첫 토큰에 의존하는데,
// 사용자가 "강원특별자치도" 로 쓰기도 하고 "강원" 으로 쓰기도 해서 같은 지역이
// 서로 다른 행으로 집계됐다. 여기서 17개 시·도 표준명으로 접는다.
//
// DB 쪽 정본은 public.region_normalize(text) 이며 mcp_region(jsonb) 이 이를 사용한다.
// 규칙을 바꿀 때는 양쪽을 함께 고칠 것 — 관리자 화면과 MCP 리포트가 갈라진다.

/** 표준 17개 시·도 (집계·표시 순서) */
export const REGIONS = [
  "서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종",
  "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주",
] as const;

export type Region = (typeof REGIONS)[number] | "기타";

// 접두사 → 표준명. 긴 것부터 검사하므로 배열 순서가 중요하다.
// ("전북특별자치도" 가 "전북" 보다 먼저 와야 한다는 뜻은 아니고, 접두사 매칭이라
//  둘 다 "전북" 으로 접힌다. 다만 "충청북도"/"충청남도" 처럼 앞 두 글자가 같은
//  경우가 있어 3글자 이상 후보를 먼저 둔다.)
const PREFIX_MAP: [string, Region][] = [
  ["서울", "서울"],
  ["부산", "부산"],
  ["대구", "대구"],
  ["인천", "인천"],
  ["광주", "광주"],
  ["대전", "대전"],
  ["울산", "울산"],
  ["세종", "세종"],
  ["경기", "경기"],
  ["강원", "강원"],
  ["충청북", "충북"],
  ["충청남", "충남"],
  ["충북", "충북"],
  ["충남", "충남"],
  ["전라북", "전북"],
  ["전라남", "전남"],
  ["전북", "전북"],
  ["전남", "전남"],
  ["경상북", "경북"],
  ["경상남", "경남"],
  ["경북", "경북"],
  ["경남", "경남"],
  ["제주", "제주"],
];

/** 임의 문자열(주소 첫 토큰 등)을 표준 시·도명으로. 못 알아보면 "기타". */
export function normalizeRegion(raw?: string | null): Region {
  const s = (raw ?? "").trim();
  if (!s) return "기타";
  // 3글자 이상 후보를 먼저 보도록 접두사 길이 내림차순으로 검사한다.
  const sorted = [...PREFIX_MAP].sort((a, b) => b[0].length - a[0].length);
  for (const [prefix, canon] of sorted) {
    if (s.startsWith(prefix)) return canon;
  }
  return "기타";
}

/** shipping_address(jsonb) 에서 표준 시·도를 뽑는다. 국내 주소가 아니면 "해외". */
export function regionOfAddress(addr?: Record<string, unknown> | null): Region | "해외" {
  const a = (addr ?? {}) as Record<string, string>;
  const country = (a.country ?? "KR").trim().toUpperCase();
  if (country && country !== "KR") return "해외";
  const first = (a.addr1 ?? "").trim().split(/\s+/)[0] ?? "";
  return normalizeRegion(first);
}
