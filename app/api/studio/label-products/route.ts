import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { pointKey } from "@/lib/point-color";

export const dynamic = "force-dynamic";

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
    .select(`slug,title_ko,title_en,one_liner,roast_level,flavor_notes,origin,producer,variety,altitude,process,weight_g,key_color,brew_recipe,body_html,product_type,report_no,material,label_point,
      product_categories(category(slug))`)
    .eq("status", "active")
    .order("title_ko");

  const strip = (s?: string | null) => (s ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const items = (data ?? []).map((p: any) => {
    const ko = (p.title_ko ?? "").replace(/\[.*?\]\s*/g, "");
    const o = p.origin ?? {};
    const r = p.brew_recipe ?? {};
    const cats: string[] = (p.product_categories ?? []).map((pc: any) => pc.category?.slug).filter(Boolean);
    const isSingle = cats.includes("single-origins");
    const isDecaf = cats.includes("decaf");
    const typeEn = isSingle ? "SINGLE ORIGIN" : isDecaf ? "DECAF" : "BLEND";
    const typeKr = isSingle ? "싱글 오리진" : isDecaf ? "디카페인" : "블렌드";
    const flavorStr = Array.isArray(p.flavor_notes) ? p.flavor_notes.join(" · ") : "";
    const nameLen = [...ko].length;
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

    const recipe: [string, string, string][] = [];
    if (r.espresso || r.es) recipe.push(["ESPRESSO", r.espresso ?? r.es, ""]);
    if (r.milk) recipe.push(["MILK", r.milk, ""]);
    if (r.filter || r.fil) recipe.push(["FILTER", r.filter ?? r.fil, ""]);

    return {
      key: p.slug,
      slug: p.slug,
      reportNo: p.report_no || "",
      tableName: ko,
      name_en: en,
      name_en2: en,
      typeKr, typeEn,
      notesEn: flavorStr,
      point: p.label_point || pointKey({ flavorNotes: p.flavor_notes, roast: p.roast_level }),
      nameSize, enSize,
      material: p.material || "커피원두 100%",
      desc: p.one_liner || strip(p.body_html).slice(0, 170),
      infoLabel: isSingle ? "single origin Information" : "coffee Information",
      flavor: flavorStr,
      specs,
      recipe,
      vol: p.weight_g ? `${p.weight_g} g` : "125 g",
    };
  });
  return NextResponse.json({ items });
}
