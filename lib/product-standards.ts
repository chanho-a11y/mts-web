// 싱글 오리진 등록 기준 (D-172). 관리자 제품 폼과 Claude 제품 등록 스킬이 같은 기준을 쓴다.
// 클라이언트 안전 모듈: 서버 전용 import 없음.
import type { RecipeData } from "@/lib/recipe";
import { EXPANDED_PALETTE } from "@/lib/point-color";
import { type ReportPreset, normReportNo } from "@/lib/report-no";

// ── 1. 기준 레시피 ─────────────────────────────────────────────────────────
// 워시드 계열 = 에티오피아 코체레 다니초 워시드 / 내추럴 계열 = 에티오피아 타데세 욘카 내추럴.
// 허니, 무산소, 기타 점액질이 남는 가공은 내추럴 계열로 본다(2026-11-24 대표 확정).
export const STANDARD_RECIPES: Record<"washed" | "natural", { source: string; recipe: RecipeData }> = {
  washed: {
    source: "ethiopia-kochere-danicho",
    recipe: {
      filter: { dose_g: "15", grind: "700", bloom_g: "45", bloom_time_s: "90", pour_g: "225", total_time: "2:10-2:30" },
      espresso: { dose_g: "18", yield_g: "43", time: "24" },
      milk: { dose_g: "20", yield_g: "40", time: "26", milk_ml: "150" },
    },
  },
  natural: {
    source: "ethiopia-tadesse-yonka-natural",
    recipe: {
      filter: { dose_g: "13", grind: "700", bloom_g: "30", bloom_time_s: "90", pour_g: "192", total_time: "1:40-2:00" },
      espresso: { dose_g: "18", yield_g: "45", time: "23" },
      milk: { dose_g: "22", yield_g: "36", time: "25", milk_ml: "150" },
    },
  },
};

export function recipeFamily(process?: string | null): "washed" | "natural" | null {
  const s = (process ?? "").toLowerCase().replace(/\s+/g, "");
  if (!s) return null;
  if (/(내추럴|natural|허니|honey|무산소|anaerobic|카보닉|carbonic|발효|ferment|펄프드|pulped|semi|세미)/.test(s)) return "natural";
  if (/(워시드|washed|wet|습식)/.test(s)) return "washed";
  return null;
}

export function standardRecipeFor(process?: string | null): RecipeData | null {
  const fam = recipeFamily(process);
  return fam ? JSON.parse(JSON.stringify(STANDARD_RECIPES[fam].recipe)) : null;
}

// ── 2. 품목보고번호: 원산지 국가로 자동 선택 ─────────────────────────────────
// 마스터(report_no) 의 origin 칸이 있으면 그것으로, 없으면 제품명 "<국가> 싱글오리진" 으로 매칭.
export function reportNoForCountry(country: string | null | undefined, presets: ReportPreset[]): ReportPreset | null {
  const c = (country ?? "").replace(/\s+/g, "").trim();
  if (!c) return null;
  const byOrigin = presets.find((p) => (p.origin ?? "").replace(/\s+/g, "") === c);
  if (byOrigin) return byOrigin;
  return presets.find((p) => p.name.replace(/\s+/g, "") === `${c}싱글오리진`) ?? null;
}
export function sameReportNo(a?: string | null, b?: string | null): boolean {
  return normReportNo(a ?? "") === normReportNo(b ?? "");
}

// ── 3. 제조원가: 생두 kg 단가 기준 ───────────────────────────────────────────
// (생두가 x 1.2) / 1000 x 중량 + 1,000원. 1.2 = 로스팅 손실 보정, 1,000원 = 포장 등 부자재.
export function estimateCost(greenPricePerKg: number, weightG = 125): number | null {
  if (!Number.isFinite(greenPricePerKg) || greenPricePerKg <= 0) return null;
  return Math.round((greenPricePerKg * 1.2) / 1000 * weightG + 1000);
}

// ── 4. 키 컬러 초안 추천 ─────────────────────────────────────────────────────
// 1차 기준 = 플레이버 노트(앞쪽 노트 우선), 2차 기준 = 다른 판매중, 초안 제품 색과 겹치지 않기.
// 최종 선택은 대표가 한다. 여기서는 초안 후보만 만든다.
const NOTE_TO_SWATCH: [RegExp, string][] = [
  [/(레몬|라임|유자|베르가못|자몽|lemon|lime|yuzu|bergamot|grapefruit)/i, "lemon"],
  [/(오렌지|귤|마멀레이드|만다린|탠저린|orange|marmalade|mandarin|tangerine)/i, "orange"],
  [/(딸기|라즈베리|체리|크랜베리|석류|빨간\s?사과|레드\s?애플|strawberry|raspberry|cherry|cranberry|pomegranate|red apple)/i, "strawberry"],
  [/(파인애플|pineapple)/i, "pineapple"],
  [/(복숭아|살구|황도|백도|핵과|넥타린|peach|apricot|stone fruit|nectarine)/i, "peach"],
  [/(블루베리|블랙베리|블랙커런트|blueberry|blackberry|blackcurrant)/i, "blueberry"],
  [/(포도|적포도|라벤더|와인|자두|grape|lavender|wine|plum)/i, "grape"],
  [/(망고|열대|패션|mango|tropical|passion)/i, "mango"],
  [/(키위|청포도|kiwi)/i, "kiwi"],
  [/(건포도|대추|무화과|raisin|date|fig)/i, "raisin"],
  [/(자스민|재스민|아카시아|플로럴|꽃|홍차|jasmine|acacia|floral|black tea)/i, "jasmine"],
  [/(사과|apple)/i, "apple"],
  [/(캐러멜|카라멜|caramel)/i, "caramel"],
  [/(초콜릿|카카오|아몬드|견과|헤이즐넛|chocolate|cocoa|almond|nut|hazelnut)/i, "chocolate"],
  [/(꿀|허니|honey)/i, "honey"],
  [/(당밀|흑설탕|molasses)/i, "dark_sugar"],
  [/(사탕수수|황설탕|시럽|브라운슈가|sugarcane|brown sugar|syrup)/i, "brown_sugar"],
];

function hexToLab(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const lin = (v: number) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const r = lin(parseInt(h.slice(0, 2), 16)), g = lin(parseInt(h.slice(2, 4), 16)), b = lin(parseInt(h.slice(4, 6), 16));
  const x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  const y = r * 0.2126 + g * 0.7152 + b * 0.0722;
  const z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}
export function colorDistance(a: string, b: string): number {
  const [l1, a1, b1] = hexToLab(a), [l2, a2, b2] = hexToLab(b);
  return Math.sqrt((l1 - l2) ** 2 + (a1 - a2) ** 2 + (b1 - b2) ** 2);
}

export interface KeyColorSuggestion { hex: string; note: string; swatch: string; tone: "light" | "medium" | "dark"; nearest: number }
export const KEY_COLOR_MIN_DISTANCE = 15;

export function suggestKeyColors(
  flavorNotes: string[] | null | undefined,
  roast: string | null | undefined,
  takenColors: string[],
  limit = 3,
): KeyColorSuggestion[] {
  const roastS = (roast ?? "").toLowerCase();
  const order: ("light" | "medium" | "dark")[] = /다크|dark/.test(roastS) ? ["dark", "medium", "light"]
    : /라이트|light/.test(roastS) ? ["light", "medium", "dark"] : ["medium", "light", "dark"];
  const taken = takenColors.filter((c) => /^#[0-9a-fA-F]{6}$/.test(c));
  const seen = new Set<string>();
  const cands: KeyColorSuggestion[] = [];
  (flavorNotes ?? []).forEach((note) => {
    const hit = NOTE_TO_SWATCH.find(([re]) => re.test(note));
    const sw = hit && EXPANDED_PALETTE.find((s) => s.flavor === hit[1]);
    if (!sw) return;
    order.forEach((tone) => {
      const hex = sw[tone];
      if (seen.has(hex.toLowerCase())) return;
      seen.add(hex.toLowerCase());
      const nearest = taken.length ? Math.min(...taken.map((t) => colorDistance(hex, t))) : 999;
      cands.push({ hex, note, swatch: sw.ko, tone, nearest: Math.round(nearest * 10) / 10 });
    });
  });
  // 노트 순서와 로스팅 톤 순서를 지키되, 겹치는 색(최소 거리 미달)은 뒤로 보낸다.
  const ok = cands.filter((c) => c.nearest >= KEY_COLOR_MIN_DISTANCE);
  const clash = cands.filter((c) => c.nearest < KEY_COLOR_MIN_DISTANCE).sort((a, b) => b.nearest - a.nearest);
  return [...ok, ...clash].slice(0, limit);
}
