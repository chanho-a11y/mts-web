import { createClient } from "@/lib/supabase/server";
import { saveTemplatesAction } from "@/app/admin/templates/actions";

export const dynamic = "force-dynamic";

const DEFAULT_ORDER = "hero, subscribe, oneliner, buy, info, brand, recipe, more, reviews, social";

async function settingsFor(code: string) {
  const supabase = createClient();
  const { data: brand } = await supabase.from("brand").select("id").eq("code", code).maybeSingle();
  if (!brand) return {} as Record<string, string>;
  const { data } = await supabase.from("site_setting").select("key,value").eq("brand_id", brand.id);
  return Object.fromEntries((data ?? []).map((r) => [r.key, r.value ?? ""]));
}

export default async function AdminTemplatesPage({ searchParams }: { searchParams: { brand?: string } }) {
  const code = searchParams.brand === "normcore" ? "normcore" : "mtspace";
  const s = await settingsFor(code);
  const input = "mt-1 w-full rounded border px-3 py-2 text-sm";
  return (
    <main className="max-w-2xl">
      <h1 className="mb-2 text-2xl font-bold">양식 관리 (템플릿)</h1>
      <div className="mb-5 flex gap-2 text-sm">
        <a href="/admin/templates?brand=mtspace" className={`rounded border px-3 py-1 ${code === "mtspace" ? "bg-black text-white" : ""}`}>MTSPACE</a>
        <a href="/admin/templates?brand=normcore" className={`rounded border px-3 py-1 ${code === "normcore" ? "bg-black text-white" : ""}`}>NORMCORE</a>
      </div>

      <form action={saveTemplatesAction} className="space-y-4">
        <input type="hidden" name="brand" value={code} />

        <fieldset className="rounded-lg border p-4">
          <legend className="px-1 text-xs font-bold uppercase text-neutral-400">상세페이지 — 구성·순서·컬러·폰트</legend>
          <label className="block text-sm">섹션 순서 (콤마/줄바꿈, 빼면 숨김)
            <textarea name="detail_section_order" defaultValue={s.detail_section_order || DEFAULT_ORDER} rows={2} className={input} /></label>
          <p className="mt-1 text-xs text-neutral-400">사용 가능: hero(대표이미지) · oneliner(한줄키워드) · buy(구매) · info(커피정보) · brand(로고/철학/소개) · recipe(추출레시피) · more(more info) · reviews(리뷰) · social(소셜) · subscribe(구독)</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="block text-sm">강조색 override(HEX, 빈칸=제품 key_color)<input name="detail_accent" defaultValue={s.detail_accent} placeholder="#1A1A1A" className={input} /></label>
            <label className="block text-sm">상세 폰트<input name="detail_font" defaultValue={s.detail_font} placeholder="Helvetica Neue, sans-serif" className={input} /></label>
          </div>
        </fieldset>

        <fieldset className="rounded-lg border p-4">
          <legend className="px-1 text-xs font-bold uppercase text-neutral-400">자산 양식 — 썸네일·블로그·인스타·카드뉴스</legend>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">자산 강조색(HEX)<input name="asset_accent" defaultValue={s.asset_accent} placeholder="제품 key_color 우선" className={input} /></label>
            <label className="block text-sm">자산 폰트<input name="asset_font" defaultValue={s.asset_font} placeholder="Pretendard" className={input} /></label>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="block text-sm">썸네일 레이아웃
              <select name="thumb_layout" defaultValue={s.thumb_layout || "center"} className={input}>
                <option value="center">중앙</option><option value="left">좌측</option><option value="bottom">하단</option>
              </select></label>
            <label className="block text-sm">블로그 레이아웃
              <select name="blog_layout" defaultValue={s.blog_layout || "standard"} className={input}>
                <option value="standard">표준</option><option value="wide">와이드</option>
              </select></label>
            <label className="block text-sm">인스타 레이아웃
              <select name="insta_layout" defaultValue={s.insta_layout || "narrative"} className={input}>
                <option value="narrative">서사 5장(1080×1350)</option><option value="single">단순 1장(1080×1080)</option>
              </select></label>
            <label className="block text-sm">카드뉴스 레이아웃
              <select name="cardnews_layout" defaultValue={s.cardnews_layout || "A"} className={input}>
                <option value="A">레이아웃 A</option><option value="B">레이아웃 B</option><option value="C">레이아웃 C</option>
              </select></label>
          </div>
          <p className="mt-2 text-xs text-neutral-400">자산 양식 설정은 신규 생성되는 썸네일/카드뉴스/인스타/블로그 자산에 적용됩니다(디자인 스튜디오 연동).</p>
        </fieldset>

        <button className="rounded-full bg-black px-5 py-2 text-sm text-white">저장</button>
      </form>
    </main>
  );
}
