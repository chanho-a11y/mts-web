import { createClient } from "@/lib/supabase/server";
import { addKbAction, updateKbAction, deleteKbAction } from "@/app/admin/kb/actions";

export const dynamic = "force-dynamic";

// 카테고리 한글 라벨 (초기 세트 — 필요 시 자유롭게 추가/변경 가능)
const CAT_LABEL: Record<string, string> = {
  roasting: "로스팅", cupping: "커핑", "green-coffee": "생두", brewing: "브루잉",
  "product-copy": "제품 카피", origin: "산지", extraction: "추출", brand: "브랜드",
  "design-studio": "디자인 스튜디오", espresso: "에스프레소", sensory: "센서리",
  qc: "품질관리(QC)", processing: "가공", operations: "운영", water: "물",
  "seo-aieo": "SEO·AIEO", "single-origin": "싱글오리진", variety: "품종",
};

export default async function AdminKbPage({ searchParams }: { searchParams: { cat?: string } }) {
  const supabase = createClient();
  const { data: entries } = await supabase
    .from("kb_entry").select("id,term,definition,category").order("category").order("term");
  const rows = entries ?? [];

  // 카테고리별 그룹핑
  const groups = new Map<string, typeof rows>();
  for (const e of rows) {
    const key = e.category || "(미분류)";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(e);
  }
  const allCats = [...groups.keys()].sort();
  const activeCat = searchParams.cat && groups.has(searchParams.cat) ? searchParams.cat : null;
  const visibleCats = activeCat ? [activeCat] : allCats;

  const input = "rounded border px-2 py-1 text-sm";
  const label = (c: string) => (CAT_LABEL[c] ? `${CAT_LABEL[c]} (${c})` : c);

  return (
    <main className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">지식 베이스 관리</h1>
        <p className="mt-1 text-sm text-neutral-500">용어·풍미·산지·키워드 사전. 카테고리별로 정리되어 있으며, 각 키워드의 카테고리는 자유롭게 변경할 수 있습니다.</p>
      </div>

      {/* 카테고리 필터 칩 */}
      <div className="flex flex-wrap gap-1.5 text-xs">
        <a href="/admin/kb" className={`rounded-full border px-3 py-1 ${!activeCat ? "bg-black text-white" : "hover:bg-neutral-50"}`}>전체 ({rows.length})</a>
        {allCats.map((c) => (
          <a key={c} href={`/admin/kb?cat=${encodeURIComponent(c)}`} className={`rounded-full border px-3 py-1 ${activeCat === c ? "bg-black text-white" : "hover:bg-neutral-50"}`}>
            {CAT_LABEL[c] ?? c} ({groups.get(c)!.length})
          </a>
        ))}
      </div>

      {/* 새 용어 추가 */}
      <form action={addKbAction} className="flex flex-wrap items-end gap-2 rounded-xl border p-4 text-sm">
        <label>용어<input name="term" required placeholder="예: 워시드" className={`mt-1 block ${input} w-40`} /></label>
        <label>카테고리
          <input name="category" list="kb-cats" defaultValue={activeCat ?? ""} placeholder="roasting" className={`mt-1 block ${input} w-40`} />
        </label>
        <label className="flex-1">설명<input name="definition" placeholder="용어 설명" className={`mt-1 block w-full ${input}`} /></label>
        <button className="rounded-full bg-black px-4 py-1.5 text-white">추가</button>
      </form>
      <datalist id="kb-cats">{allCats.map((c) => <option key={c} value={c} />)}</datalist>

      {/* 카테고리별 그룹 */}
      <div className="space-y-6">
        {visibleCats.map((c) => (
          <section key={c}>
            <h2 className="mb-2 border-b pb-1 text-sm font-bold">{label(c)} · {groups.get(c)!.length}개</h2>
            <div className="space-y-2">
              {groups.get(c)!.map((e) => (
                <form key={e.id} action={updateKbAction} className="flex flex-wrap items-center gap-2 rounded border p-2 text-sm">
                  <input type="hidden" name="id" value={e.id} />
                  <input name="term" defaultValue={e.term} className={`${input} w-36`} />
                  <input name="category" list="kb-cats" defaultValue={e.category ?? ""} className={`${input} w-28`} />
                  <input name="definition" defaultValue={e.definition} className={`${input} flex-1`} />
                  <button className="rounded border px-3 py-1 text-xs">저장</button>
                  <button formAction={deleteKbAction} className="rounded border px-3 py-1 text-xs text-red-500">삭제</button>
                </form>
              ))}
            </div>
          </section>
        ))}
        {rows.length === 0 && <p className="py-6 text-center text-neutral-400">등록된 용어가 없습니다.</p>}
      </div>
    </main>
  );
}
