import { createClient } from "@/lib/supabase/server";
import UnifiedStudio, { type StudioItem } from "@/components/unified-studio";

export const dynamic = "force-dynamic";
export const metadata = { title: "통합 스튜디오" };

// 통합 스튜디오: 디자인 스튜디오 + 레이블 스튜디오를 하나의 진입점으로 통합.
// 한 번의 제품 정보 입력 → 레이블·상세페이지·블로그·카드뉴스·인스타 콘텐츠 동시 생성.
export default async function AdminStudioPage() {
  const supabase = createClient();

  // 내부 제품을 스튜디오 입력 필드 형태로 매핑(= /api/studio/products 와 동일 형태)
  const { data } = await supabase
    .from("product")
    .select("slug,title_ko,title_en,one_liner,roast_level,flavor_notes,origin,producer,variety,altitude,process,weight_g,key_color,hashtags,brew_recipe,product_variant(base_price,is_active)")
    .eq("status", "active")
    .order("title_ko");

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const items: StudioItem[] = (data ?? []).map((p: any) => {
    const o = p.origin ?? {};
    const r = p.brew_recipe ?? {};
    const vs = (p.product_variant ?? []).filter((v: any) => v.is_active);
    const price = vs.length ? Math.min(...vs.map((v: any) => v.base_price)) : "";
    return {
      slug: p.slug,
      ko: p.title_ko ?? "", en: p.title_en ?? "",
      country: o.country ?? "", region: o.region ?? "", farm: o.farm ?? p.producer ?? "",
      farmer: p.producer ?? "", variety: p.variety ?? "", process: p.process ?? "",
      altitude: p.altitude ?? "", roast: p.roast_level ?? "",
      flavor: Array.isArray(p.flavor_notes) ? p.flavor_notes.join(", ") : "",
      weight: p.weight_g ? String(p.weight_g) : "", story: p.one_liner ?? "",
      rcp_es: r.espresso ?? r.es ?? "", rcp_fil: r.filter ?? r.fil ?? "", rcp_milk: r.milk ?? "",
      hash: Array.isArray(p.hashtags) ? p.hashtags.join(" ") : "",
      key_color: p.key_color ?? "#B0764A", price,
    };
  });

  return (
    <main className="-mt-2">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">통합 스튜디오</h1>
        <p className="text-sm text-neutral-500">
          제품 정보를 한 번 입력하면 <b>레이블 · 상세페이지 · 블로그 · 카드뉴스 · 인스타그램</b> 콘텐츠가 한 곳에서 생성됩니다.
          (기존 디자인 스튜디오 + 레이블 스튜디오 통합)
        </p>
      </div>
      <UnifiedStudio items={items} />
    </main>
  );
}
