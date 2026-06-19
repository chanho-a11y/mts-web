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
    .select("slug,title_ko,title_en,one_liner,roast_level,flavor_notes,origin,producer,variety,altitude,process,weight_g,key_color,hashtags,brew_recipe,body_html,status,product_image(storage_path,is_primary,position),product_variant(base_price,is_active)")
    .eq("status", "active")
    .order("title_ko");

  const items = (data ?? []).map((p: any) => {
    const o = p.origin ?? {};
    const r = p.brew_recipe ?? {};
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
      story: p.one_liner ?? "",
      hash: Array.isArray(p.hashtags) ? p.hashtags.join(" ") : "",
      key_color: p.key_color ?? "",
      rcp_es: r.espresso ?? r.es ?? "",
      rcp_fil: r.filter ?? r.fil ?? "",
      rcp_milk: r.milk ?? "",
      body_html: p.body_html ?? "",
    };
  });
  return NextResponse.json({ items });
}
