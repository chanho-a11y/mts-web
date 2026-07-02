// 추출 레시피 데이터 모델 — 필터 / 에스프레소 / 밀크 3종.
// 제품 등록 입력값이 정본. 상세페이지 커피정보 레시피 + 통합 스튜디오가 동일 소스를 사용.
// 값은 원본 문자열로 저장(범위·단위 표기 유연). grind만 한/영 이중(grind/grind_en).

export interface RecipeData {
  filter?: { dose_g?: string; grind?: string; grind_en?: string; bloom_g?: string; bloom_time_s?: string; pour_g?: string; total_time?: string };
  espresso?: { dose_g?: string; yield_g?: string; time?: string };
  milk?: { dose_g?: string; yield_g?: string; time?: string; milk_ml?: string };
}

export type RecipeMode = "filter" | "espresso" | "milk";

export interface RecipeRow { key: string; ko: string; en: string; unit?: string; bilingual?: boolean }

// 렌더링·폼 공용 필드 정의(순서 = 표시 순서)
export const RECIPE_ROWS: Record<RecipeMode, RecipeRow[]> = {
  filter: [
    { key: "dose_g", ko: "도징", en: "Dose", unit: "g" },
    { key: "grind", ko: "그라인딩 사이즈", en: "Grind size", bilingual: true },
    { key: "bloom_g", ko: "블루밍", en: "Bloom", unit: "g" },
    { key: "bloom_time_s", ko: "블루밍 시간", en: "Bloom time", unit: "s" },
    { key: "pour_g", ko: "푸어링", en: "Pour", unit: "g" },
    { key: "total_time", ko: "전체 추출시간", en: "Total brew time" },
  ],
  espresso: [
    { key: "dose_g", ko: "도징", en: "Dose", unit: "g" },
    { key: "yield_g", ko: "추출량", en: "Yield", unit: "g" },
    { key: "time", ko: "추출시간", en: "Time" },
  ],
  milk: [
    { key: "dose_g", ko: "도징", en: "Dose", unit: "g" },
    { key: "yield_g", ko: "추출량", en: "Yield", unit: "g" },
    { key: "time", ko: "추출시간", en: "Time" },
    { key: "milk_ml", ko: "우유양", en: "Milk", unit: "ml" },
  ],
};

export const RECIPE_MODE_LABEL: Record<RecipeMode, { ko: string; en: string }> = {
  filter: { ko: "필터", en: "Filter" },
  espresso: { ko: "에스프레소", en: "Espresso" },
  milk: { ko: "밀크", en: "Milk" },
};

// 폼 FormData → RecipeData (빈 모드는 제외). name 규칙: rcp_<mode>_<key>
export function buildRecipeFromForm(get: (name: string) => string): RecipeData | null {
  const out: RecipeData = {};
  (Object.keys(RECIPE_ROWS) as RecipeMode[]).forEach((mode) => {
    const obj: Record<string, string> = {};
    RECIPE_ROWS[mode].forEach((r) => {
      const v = get(`rcp_${mode}_${r.key}`).trim();
      if (v) obj[r.key] = v;
      if (r.bilingual) {
        const ven = get(`rcp_${mode}_${r.key}_en`).trim();
        if (ven) obj[`${r.key}_en`] = ven;
      }
    });
    if (Object.keys(obj).length) (out as Record<string, unknown>)[mode] = obj;
  });
  return Object.keys(out).length ? out : null;
}

// 표시용: 존재하는 모드/필드만 [{mode, rows:[{label,value}]}]
export function recipeDisplay(recipe: RecipeData | null | undefined, locale: "ko" | "en") {
  if (!recipe) return [];
  return (Object.keys(RECIPE_ROWS) as RecipeMode[])
    .map((mode) => {
      const data = (recipe as Record<string, Record<string, string> | undefined>)[mode];
      if (!data) return null;
      const rows = RECIPE_ROWS[mode]
        .map((r) => {
          let value = data[r.key] ?? "";
          if (r.bilingual && locale === "en" && data[`${r.key}_en`]) value = data[`${r.key}_en`]!;
          if (!value) return null;
          const label = locale === "en" ? r.en : r.ko;
          return { label: r.unit ? `${label} (${r.unit})` : label, value };
        })
        .filter(Boolean) as { label: string; value: string }[];
      if (!rows.length) return null;
      return { mode, title: locale === "en" ? RECIPE_MODE_LABEL[mode].en : RECIPE_MODE_LABEL[mode].ko, rows };
    })
    .filter(Boolean) as { mode: RecipeMode; title: string; rows: { label: string; value: string }[] }[];
}
