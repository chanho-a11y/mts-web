import { createClient } from "@/lib/supabase/server";
import { saveSettingsAction, saveCategoryBannerAction } from "@/app/admin/content/actions";

export const dynamic = "force-dynamic";

async function settingsFor(code: string) {
  const supabase = createClient();
  const { data: brand } = await supabase.from("brand").select("id").eq("code", code).maybeSingle();
  if (!brand) return {} as Record<string, string>;
  const { data } = await supabase.from("site_setting").select("key,value").eq("brand_id", brand.id);
  return Object.fromEntries((data ?? []).map((r) => [r.key, r.value ?? ""]));
}

export default async function AdminContentPage({ searchParams }: { searchParams: { brand?: string } }) {
  const code = searchParams.brand === "normcore" ? "normcore" : "mtspace";
  const s = await settingsFor(code);
  const input = "mt-1 w-full rounded border px-3 py-2 text-sm";
  return (
    <main className="max-w-2xl">
      <h1 className="mb-2 text-2xl font-bold">콘텐츠 관리 · 사이트 설정</h1>
      <div className="mb-5 flex gap-2 text-sm">
        <a href="/admin/content?brand=mtspace" className={`rounded border px-3 py-1 ${code === "mtspace" ? "bg-black text-white" : ""}`}>MTSPACE</a>
        <a href="/admin/content?brand=normcore" className={`rounded border px-3 py-1 ${code === "normcore" ? "bg-black text-white" : ""}`}>NORMCORE</a>
      </div>
      <form action={saveSettingsAction} className="space-y-4">
        <input type="hidden" name="brand" value={code} />
        <label className="block text-sm">홈 히어로 제목<input name="hero_title" defaultValue={s.hero_title} className={input} /></label>
        <label className="block text-sm">홈 히어로 부제<textarea name="hero_subtitle" defaultValue={s.hero_subtitle} rows={2} className={input} /></label>
        <label className="block text-sm">히어로 이미지 경로(예: /images/hero.jpg)<input name="hero_image" defaultValue={s.hero_image} placeholder="/images/hero.jpg" className={input} /></label>
        <label className="block text-sm">히어로 배경색(HEX, 이미지 없을 때)<input name="hero_bg" defaultValue={s.hero_bg} placeholder="#FAFAFA" className={input} /></label>
        <button className="rounded-full bg-black px-5 py-2 text-sm text-white">저장</button>
      </form>

      <CategoryBanners />
      <p className="mt-4 text-xs text-neutral-400">※ 이미지는 /images/ 경로(레포 public)나 외부 URL 모두 가능. 추후 업로드 UI 확장 예정.</p>
    </main>
  );
}

async function CategoryBanners() {
  const supabase = createClient();
  const { data: cats } = await supabase.from("category").select("slug,name_ko,banner_path").order("position");
  return (
    <section className="mt-8">
      <h2 className="mb-3 font-bold">카테고리 배너 이미지</h2>
      <div className="space-y-2">
        {(cats ?? []).map((c) => (
          <form key={c.slug} action={saveCategoryBannerAction} className="flex items-center gap-2 text-sm">
            <input type="hidden" name="slug" value={c.slug} />
            <span className="w-28 shrink-0 text-neutral-500">{c.name_ko}</span>
            <input name="banner_path" defaultValue={c.banner_path ?? ""} placeholder="/images/cat-xxx.jpg" className="flex-1 rounded border px-3 py-1.5" />
            <button className="rounded border px-3 py-1.5 text-xs">저장</button>
          </form>
        ))}
      </div>
    </section>
  );
}
