import { createClient } from "@/lib/supabase/server";
import { saveSettingsAction } from "@/app/admin/content/actions";

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
        <label className="block text-sm">히어로 배경색(HEX, 선택)<input name="hero_bg" defaultValue={s.hero_bg} placeholder="#FAFAFA" className={input} /></label>
        <button className="rounded-full bg-black px-5 py-2 text-sm text-white">저장</button>
      </form>
      <p className="mt-4 text-xs text-neutral-400">※ 페이지 배경/폰트 등 상세 편집은 확장 예정. 현재 홈 히어로 제목·부제·배경 적용.</p>
    </main>
  );
}
