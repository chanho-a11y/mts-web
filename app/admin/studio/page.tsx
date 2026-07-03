import { createClient } from "@/lib/supabase/server";
import UnifiedStudio, { type StudioItem } from "@/components/unified-studio";

export const dynamic = "force-dynamic";
export const metadata = { title: "통합 스튜디오" };

// 통합 스튜디오: 디자인 스튜디오 + 레이블 스튜디오를 하나의 진입점으로 통합.
// 한 번의 제품 정보 입력 → 레이블·상세페이지·블로그·카드뉴스·인스타 콘텐츠 동시 생성.
const VALID_TABS = ["detail", "blog", "cardnews", "label", "thumbnail"] as const;
type StudioTab = typeof VALID_TABS[number];

export default async function AdminStudioPage({ searchParams }: { searchParams: { tab?: string } }) {
  const initialTab = (VALID_TABS as readonly string[]).includes(searchParams.tab ?? "") ? (searchParams.tab as StudioTab) : undefined;
  const supabase = createClient();

  // 내부 제품을 스튜디오 입력 필드 형태로 매핑(= /api/studio/products 와 동일 형태)
  const { data } = await supabase
    .from("product")
    .select(`slug,title_ko,title_en,one_liner,one_liner_en,roast_level,roast_level_en,flavor_notes,flavor_notes_en,
      origin,producer,producer_en,variety,variety_en,altitude,altitude_en,process,process_en,weight_g,key_color,hashtags,
      story,story_en,brew_recipe,recipe,evidence,product_variant(base_price,is_active)`)
    .eq("status", "active")
    .order("title_ko");

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const items: StudioItem[] = (data ?? []).map((p: any) => {
    const o = p.origin ?? {};
    const r = p.brew_recipe ?? {};
    const vs = (p.product_variant ?? []).filter((v: any) => v.is_active);
    const price = vs.length ? Math.min(...vs.map((v: any) => v.base_price)) : "";
    const joinArr = (a: any) => (Array.isArray(a) ? a.join(", ") : "");
    return {
      slug: p.slug,
      ko: p.title_ko ?? "", en: p.title_en ?? "",
      country: o.country ?? "", country_en: o.country_en ?? "",
      region: o.region ?? "", farm: o.farm ?? p.producer ?? "",
      farmer: p.producer ?? "", producer_en: p.producer_en ?? "",
      variety: p.variety ?? "", variety_en: p.variety_en ?? "",
      process: p.process ?? "", process_en: p.process_en ?? "",
      altitude: p.altitude ?? "", altitude_en: p.altitude_en ?? "",
      roast: p.roast_level ?? "", roast_en: p.roast_level_en ?? "",
      flavor: joinArr(p.flavor_notes), flavor_en: joinArr(p.flavor_notes_en),
      one_liner: p.one_liner ?? "", one_liner_en: p.one_liner_en ?? "",
      weight: p.weight_g ? String(p.weight_g) : "",
      story: p.story ?? p.one_liner ?? "", story_en: p.story_en ?? p.one_liner_en ?? "",
      rcp_es: r.espresso ?? r.es ?? "", rcp_fil: r.filter ?? r.fil ?? "", rcp_milk: r.milk ?? "",
      recipe: p.recipe ?? null,
      evidence: p.evidence ?? null,
      hash: Array.isArray(p.hashtags) ? p.hashtags.join(" ") : "",
      key_color: p.key_color ?? "#B0764A", price,
    };
  });

  return (
    <main className="-mt-2">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">통합 스튜디오</h1>
        <p className="text-sm text-neutral-500">
          제품 관리에서 입력한 정보를 불러와 <b>상세페이지 · 블로그 · 카드뉴스 · 레이블 · 썸네일</b>을 작업합니다.
          스튜디오에서는 제품 정보를 입력하지 않으며(읽기전용), 정보 수정은 <a href="/admin/products" className="underline">제품 수정</a>에서 합니다.
        </p>
      </div>
      <UnifiedStudio items={items} initialTab={initialTab} />
    </main>
  );
}
