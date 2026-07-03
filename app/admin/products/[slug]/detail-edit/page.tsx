import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { pointTheme } from "@/lib/point-color";
import { recipeDisplay, type RecipeData } from "@/lib/recipe";
import DetailInlineEditor, { type DetailInitial } from "@/components/detail-inline-editor";

export const dynamic = "force-dynamic";
export const metadata = { title: "상세페이지 편집" };

// 통합 스튜디오 '상세페이지 열기' → 이 페이지(새 창)에서 레이아웃 고정·인라인 텍스트/숫자 편집.
export default async function DetailEditPage({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const { data: p } = await supabase
    .from("product")
    .select("slug,title_ko,title_en,one_liner,flavor_notes,roast_level,weight_g,origin,variety,altitude,process,key_color,label_point,recipe")
    .eq("slug", params.slug).maybeSingle();
  if (!p) notFound();
  const px = p as any;

  const theme = pointTheme({ labelPoint: px.label_point, flavorNotes: px.flavor_notes ?? [], roast: px.roast_level });
  const blocks = recipeDisplay((px.recipe ?? null) as RecipeData | null, "ko");

  const init: DetailInitial = {
    slug: px.slug,
    title_ko: px.title_ko ?? "",
    title_en: px.title_en ?? "",
    one_liner: px.one_liner ?? "",
    flavor_notes: Array.isArray(px.flavor_notes) ? px.flavor_notes.join(" · ") : "",
    roast_level: px.roast_level ?? "",
    weight_g: px.weight_g ? String(px.weight_g) : "",
    origin_country: px.origin?.country ?? "",
    origin_region: px.origin?.region ?? "",
    variety: px.variety ?? "",
    altitude: px.altitude ?? "",
    process: px.process ?? "",
    key_color: theme.point, key_color_text: theme.pointText, key_color_check: theme.check,
    recipe_preview: blocks.map((b) => ({ title: b.title, rows: b.rows.map((r) => ({ label: r.label, value: r.value })) })),
  };

  return <DetailInlineEditor init={init} />;
}
