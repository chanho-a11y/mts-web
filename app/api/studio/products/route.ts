import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// 디자인 스튜디오용 내부 제품 데이터 (스튜디오 입력 필드에 맞춘 형태). 관리자 전용.
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (prof?.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { data } = await supabase
    .from("product")
    .select("slug,title_ko,title_en,one_liner,story,story_en,roast_level,flavor_notes,origin,producer,variety,altitude,process,weight_g,key_color,hashtags,recipe,brew_recipe,body_html,status,product_image(storage_path,is_primary,position),product_variant(base_price,is_active)")
    .in("status", ["active", "draft"])  // 통합 스튜디오: 발행+초안 모두 노출
    .order("title_ko");

  const items = (data ?? []).map((p: any) => {
    const o = p.origin ?? {};
    // 추출 레시피 정본은 product.recipe(구조화 jsonb). brew_recipe 는 구 컬럼이며 전량 비어 있다.
    const rec = (p.recipe && Object.keys(p.recipe).length ? p.recipe : p.brew_recipe) ?? {};
    const r = rec;
    // 레시피 요약 문자열(구 소비처 호환) — 구조화 값에서 파생
    const line = (m: any, keys: [string, string][]) =>
      m ? keys.map(([k, l]) => (m[k] ? `${l} ${m[k]}` : "")).filter(Boolean).join(" · ") : "";
    const imgs = (p.product_image ?? []).slice().sort((a: any, b: any) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0) || a.position - b.position);
    const vs = (p.product_variant ?? []).filter((v: any) => v.is_active);
    const price = vs.length ? Math.min(...vs.map((v: any) => v.base_price)) : 0;
    return {
      slug: p.slug,
      image: imgs[0]?.storage_path ?? null,
      price: price || "",
      ko: p.title_ko ?? "",
      en: p.title_en ?? "",
      country: o.country ?? "",
      region: o.region ?? "",
      farm: o.farm ?? p.producer ?? "",
      farmer: p.producer ?? "",
      variety: p.variety ?? "",
      process: p.process ?? "",
      altitude: p.altitude ?? "",
      roast: p.roast_level ?? "",
      flavor: Array.isArray(p.flavor_notes) ? p.flavor_notes.join(", ") : "",
      weight: p.weight_g ? String(p.weight_g) : "",
      // 제품 등록 폼의 "커피 스토리" = product.story (제품 설명 정본). one_liner 는 한 줄 요약.
      story: p.story ?? p.one_liner ?? "",
      story_en: p.story_en ?? "",
      one_liner: p.one_liner ?? "",
      hash: Array.isArray(p.hashtags) ? p.hashtags.join(" ") : "",
      key_color: p.key_color ?? "",
      recipe: rec,
      rcp_es: typeof r.espresso === "string" ? r.espresso
        : line(r.espresso, [["dose_g", "도징"], ["yield_g", "추출"], ["time", "시간"]]),
      rcp_fil: typeof r.filter === "string" ? r.filter
        : line(r.filter, [["dose_g", "도징"], ["grind", "분쇄"], ["bloom_g", "블루밍"], ["pour_g", "푸어"], ["total_time", "총"]]),
      rcp_milk: typeof r.milk === "string" ? r.milk
        : line(r.milk, [["dose_g", "도징"], ["yield_g", "추출"], ["milk_ml", "우유"]]),
      body_html: p.body_html ?? "",
    };
  });
  return NextResponse.json({ items });
}
