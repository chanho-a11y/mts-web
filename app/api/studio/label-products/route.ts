import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { pointKey } from "@/lib/point-color";
import { type RecipeData } from "@/lib/recipe";
import { getReportPresets } from "@/lib/report-no-server";
import { normReportNo } from "@/lib/report-no";

export const dynamic = "force-dynamic";

// 단위를 숫자 바로 뒤에 붙임 (도징 20g). 이미 단위로 끝나거나 숫자로 끝나지 않으면 그대로.
function withUnit(v: string | undefined, unit: string): string {
  const s = (v ?? "").trim();
  if (!s) return "";
  if (new RegExp(`${unit}\\s*$`, "i").test(s) || !/\d\s*$/.test(s)) return s;
  return `${s}${unit}`;
}
// 구조화 레시피 → 레이블 라인 구성:
//  필터 3줄(도징·그라인딩 / 블루밍 / 푸어링·추출시간), 에스프레소 1줄, 밀크 2줄.
//  라인 내 구분 " · ", 라인 사이 "\n" (레이블 buildRecipe가 \n으로 줄바꿈).
function labelRecipeLines(recipe: RecipeData | null): [string, string, string][] {
  if (!recipe) return [];
  const out: [string, string, string][] = [];
  const join = (parts: string[]) => parts.filter(Boolean).join(" · ");

  const fi = recipe.filter;
  if (fi && Object.values(fi).some(Boolean)) {
    const l1 = join([fi.dose_g ? `도징 ${withUnit(fi.dose_g, "g")}` : "", fi.grind ? `그라인딩 ${withUnit(fi.grind, "µm")}` : ""]);
    const l2 = [fi.bloom_g ? `블루밍 ${withUnit(fi.bloom_g, "g")}` : "", fi.bloom_time_s ? withUnit(fi.bloom_time_s, "s") : ""].filter(Boolean).join(" ");
    const l3 = join([fi.pour_g ? `푸어링 ${withUnit(fi.pour_g, "g")}` : "", fi.total_time ? `추출 ${fi.total_time}` : ""]);
    const lines = [l1, l2, l3].filter(Boolean).join("\n");
    if (lines) out.push(["FILTER", lines, ""]);
  }

  const es = recipe.espresso;
  if (es && Object.values(es).some(Boolean)) {
    const line = join([es.dose_g ? `도징 ${withUnit(es.dose_g, "g")}` : "", es.yield_g ? `추출량 ${withUnit(es.yield_g, "g")}` : "", es.time ? `추출시간 ${withUnit(es.time, "s")}` : ""]);
    if (line) out.push(["ESPRESSO", line, ""]);
  }

  const mk = recipe.milk;
  if (mk && Object.values(mk).some(Boolean)) {
    const l1 = join([mk.dose_g ? `도징 ${withUnit(mk.dose_g, "g")}` : "", mk.yield_g ? `추출량 ${withUnit(mk.yield_g, "g")}` : ""]);
    const l2 = join([mk.time ? `추출시간 ${withUnit(mk.time, "s")}` : "", mk.milk_ml ? `우유 ${withUnit(mk.milk_ml, "ml")}` : ""]);
    const lines = [l1, l2].filter(Boolean).join("\n");
    if (lines) out.push(["MILK", lines, ""]);
  }
  return out;
}

// 내부 제품 → 레이블 스튜디오 프리셋 형태 매핑 (관리자 전용).
// 드롭다운(기존 저장 데이터) + 선택 시 라벨 필드 자동 주입에 사용.
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (prof?.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { data } = await supabase
    .from("product")
    .select(`slug,title_ko,title_en,one_liner,story,roast_level,flavor_notes,origin,producer,variety,altitude,process,weight_g,key_color,brew_recipe,recipe,body_html,product_type,report_no,material,label_point,
      product_categories(category(slug))`)
    .eq("status", "active")
    .order("title_ko");

  // 품목보고번호 마스터 → 법적 제품명 맵(공백 제거 정규화 키). 라벨 표기 제품명은 반드시 이 값(법적).
  const presets = await getReportPresets();
  const legalNameByReport: Record<string, string> = {};
  for (const pr of presets) {
    const k = normReportNo(pr.reportNo);
    if (k && pr.name) legalNameByReport[k] = pr.name;
  }

  const strip = (s?: string | null) => (s ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const items = (data ?? []).map((p: any) => {
    const ko = (p.title_ko ?? "").replace(/\[.*?\]\s*/g, "");
    // 라벨 제품명(테이블·중앙 대형) = 품목보고번호 연동 법적 제품명. 매칭 없으면 등록명 폴백.
    const reportNoNorm = normReportNo(String(p.report_no || ""));
    const legalName = (reportNoNorm && legalNameByReport[reportNoNorm]) ? legalNameByReport[reportNoNorm] : ko;
    const o = p.origin ?? {};
    const r = p.brew_recipe ?? {};
    const cats: string[] = (p.product_categories ?? []).map((pc: any) => pc.category?.slug).filter(Boolean);
    const isSingle = cats.includes("single-origins");
    const isDecaf = cats.includes("decaf");
    const typeEn = isSingle ? "SINGLE ORIGIN" : isDecaf ? "DECAF" : "BLEND";
    const typeKr = isSingle ? "싱글 오리진" : isDecaf ? "디카페인" : "블렌드";
    const flavorStr = Array.isArray(p.flavor_notes) ? p.flavor_notes.join(" · ") : "";
    // 폰트 초기 크기는 실제 표기명(법적명) 길이 기준으로 산정
    const nameLen = [...legalName].length;
    const nameSize = nameLen <= 2 ? 7.2 : nameLen <= 4 ? 6.0 : nameLen <= 7 ? 5.2 : 4.4;
    const en = p.title_en ?? "";
    const enSize = en.length > 18 ? 1.8 : 2.4;

    const specs: [string, string][] = [];
    if (p.roast_level) specs.push(["ROAST", p.roast_level]);
    if (o.country) specs.push(["ORIGIN", o.country]);
    if (o.region) specs.push(["REGION", o.region]);
    if (isSingle && o.farm) specs.push(["FARM", o.farm]);
    if (p.altitude) specs.push(["ALTITUDE", p.altitude]);
    if (p.variety) specs.push(["VARIETAL", p.variety]);
    if (p.process) specs.push(["PROCESS", p.process]);

    // 레시피: 신규 구조화 recipe(jsonb) → 레이블 라인 구성(필터3/에스프레소1/밀크2·단위 숫자뒤).
    // 없으면 구 brew_recipe 폴백.
    let recipe: [string, string, string][] = labelRecipeLines((p.recipe ?? null) as RecipeData | null);
    if (!recipe.length) {
      recipe = [];
      if (r.espresso || r.es) recipe.push(["ESPRESSO", r.espresso ?? r.es, ""]);
      if (r.milk) recipe.push(["MILK", r.milk, ""]);
      if (r.filter || r.fil) recipe.push(["FILTER", r.filter ?? r.fil, ""]);
    }

    return {
      key: p.slug,
      slug: p.slug,
      reportNo: reportNoNorm, // 공백 제거 정규화(정본 포맷)
      keyColor: p.key_color || "", // 제품관리 키컬러 = 레이블 포인트 최우선 소스
      tableName: legalName,   // 라벨 표기 제품명(테이블·중앙) = 품목보고번호 연동 법적명 — 임의변경 금지
      displayName: ko,        // 관리자 식별용(등록 제품명) — 선택 드롭다운·파일명 전용, 라벨 미표기
      name_en: en,
      name_en2: en,
      typeKr, typeEn,
      notesEn: flavorStr,
      point: p.label_point || pointKey({ flavorNotes: p.flavor_notes, roast: p.roast_level }),
      nameSize, enSize,
      material: p.material || "커피원두(100%)",
      desc: p.story || p.one_liner || strip(p.body_html).slice(0, 170),
      infoLabel: isSingle ? "single origin Information" : "coffee Information",
      flavor: flavorStr,
      specs,
      recipe,
      vol: p.weight_g ? `${p.weight_g} g` : "125 g",
    };
  });
  return NextResponse.json({ items });
}
