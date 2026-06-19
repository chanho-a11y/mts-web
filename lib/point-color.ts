// 제품 포인트 컬러 — flavor × roast 매트릭스 (DESIGN_SYSTEM §3)
// 라벨 dot / 키라인 / 썸네일 dot 등 작은 식별자에만 사용. 브랜드 키(clay)는 불변.
type Roast = "light" | "medium" | "dark";
const MATRIX: Record<string, [string, string, string]> = {
  chocolate: ["#A6794F", "#8B5E3C", "#5E3F2A"],
  citrus: ["#D2A84E", "#BC8E36", "#8A6526"],
  peach: ["#DCA07E", "#C9825F", "#9A5E42"],
  berry: ["#B27488", "#9A5E72", "#6E3E4E"],
  tropical: ["#AEAF5E", "#95964A", "#6B6B32"],
};

function flavorFamily(notes: string): string {
  const s = notes.toLowerCase();
  const has = (...k: string[]) => k.some((x) => s.includes(x));
  if (has("시트러스", "오렌지", "레몬", "라임", "베르가못", "자몽", "홍차", "citrus", "orange", "lemon", "lime", "bergamot", "grapefruit", "jasmine", "재스민")) return "citrus";
  if (has("복숭아", "살구", "스톤", "peach", "apricot", "stone", "nectarine")) return "peach";
  if (has("베리", "딸기", "블루베리", "체리", "라즈베리", "berry", "strawberry", "cherry", "blueberry", "raspberry", "와인", "wine")) return "berry";
  if (has("열대", "파인애플", "망고", "패션", "tropical", "pineapple", "mango", "passion", "lychee", "리치")) return "tropical";
  if (has("초콜릿", "카카오", "너트", "넛", "견과", "캐러멜", "cocoa", "choco", "nut", "almond", "hazelnut", "caramel", "다크")) return "chocolate";
  return "chocolate";
}
function roastLevel(roast?: string | null): Roast {
  const s = (roast ?? "").toLowerCase();
  if (s.includes("라이트") || s.includes("light")) return "light";
  if (s.includes("다크") || s.includes("dark")) return "dark";
  return "medium";
}

export function pointColor(opts: { keyColor?: string | null; flavorNotes?: string[] | null; roast?: string | null }): string {
  if (opts.keyColor && /^#[0-9a-fA-F]{6}$/.test(opts.keyColor)) return opts.keyColor;
  const fam = flavorFamily((opts.flavorNotes ?? []).join(", "));
  const r = roastLevel(opts.roast);
  const idx = r === "light" ? 0 : r === "dark" ? 2 : 1;
  return MATRIX[fam][idx];
}

// 레이블 스튜디오 point 키 (chocolate-dark 등). 매트릭스에 정의된 7개 키로 스냅.
const LABEL_KEYS = new Set([
  "chocolate-dark", "chocolate-medium", "citrus-light", "citrus-medium", "peach-light", "berry-light", "tropical-light",
]);
// 포인트 테마(블록 배경/텍스트/그리드) — 라벨·상세 공용 (presets.json pointColors 1:1)
export interface PointTheme { point: string; pointText: string; check: string }
const THEME: Record<string, PointTheme> = {
  "chocolate-dark": { point: "#5E3F2A", pointText: "#5E3F2A", check: "rgba(255,255,255,.13)" },
  "chocolate-medium": { point: "#8B5E3C", pointText: "#8B5E3C", check: "rgba(255,255,255,.13)" },
  "citrus-light": { point: "#D2A84E", pointText: "#8A6526", check: "rgba(255,255,255,.20)" },
  "citrus-medium": { point: "#BC8E36", pointText: "#8A6526", check: "rgba(255,255,255,.18)" },
  "peach-light": { point: "#DCA07E", pointText: "#9A5E42", check: "rgba(255,255,255,.22)" },
  "berry-light": { point: "#B27488", pointText: "#6E3E4E", check: "rgba(255,255,255,.20)" },
  "tropical-light": { point: "#AEAF5E", pointText: "#6B6B32", check: "rgba(255,255,255,.20)" },
};
export function pointTheme(opts: { labelPoint?: string | null; flavorNotes?: string[] | null; roast?: string | null }): PointTheme {
  const key = opts.labelPoint && THEME[opts.labelPoint] ? opts.labelPoint : pointKey({ flavorNotes: opts.flavorNotes, roast: opts.roast });
  return THEME[key] || THEME["chocolate-dark"];
}

export function pointKey(opts: { flavorNotes?: string[] | null; roast?: string | null }): string {
  const fam = flavorFamily((opts.flavorNotes ?? []).join(", "));
  const r = roastLevel(opts.roast);
  let key = `${fam}-${r}`;
  if (!LABEL_KEYS.has(key)) {
    // 정의되지 않은 조합은 가장 가까운 정의 키로 폴백
    if (fam === "chocolate") key = r === "dark" ? "chocolate-dark" : "chocolate-medium";
    else if (fam === "citrus") key = r === "medium" ? "citrus-medium" : "citrus-light";
    else key = `${fam}-light`;
  }
  return LABEL_KEYS.has(key) ? key : "chocolate-dark";
}
