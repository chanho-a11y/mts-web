import { createClient } from "@/lib/supabase/server";
import { addKbAction, updateKbAction, deleteKbAction } from "@/app/admin/kb/actions";

export const dynamic = "force-dynamic";

export default async function AdminKbPage() {
  const supabase = createClient();
  const { data: entries } = await supabase
    .from("kb_entry").select("id,term,definition,category").order("category").order("term");
  const input = "rounded border px-2 py-1 text-sm";
  return (
    <main className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">지식 베이스 관리</h1>
        <p className="mt-1 text-sm text-neutral-500">용어·풍미·산지·키워드 사전. 제품 상세·블로그·카드뉴스 자동 생성 시 참조됩니다(디자인 스튜디오 연동).</p>
      </div>

      <form action={addKbAction} className="flex flex-wrap items-end gap-2 rounded-xl border p-4 text-sm">
        <label>용어<input name="term" required placeholder="예: 워시드" className={`mt-1 block ${input} w-40`} /></label>
        <label>분류<input name="category" placeholder="가공/풍미/산지" className={`mt-1 block ${input} w-32`} /></label>
        <label className="flex-1">설명<input name="definition" placeholder="용어 설명" className={`mt-1 block w-full ${input}`} /></label>
        <button className="rounded-full bg-black px-4 py-1.5 text-white">추가</button>
      </form>

      <div className="space-y-2">
        {(entries ?? []).map((e) => (
          <form key={e.id} action={updateKbAction} className="flex flex-wrap items-center gap-2 rounded border p-2 text-sm">
            <input type="hidden" name="id" value={e.id} />
            <input name="term" defaultValue={e.term} className={`${input} w-36`} />
            <input name="category" defaultValue={e.category ?? ""} className={`${input} w-28`} />
            <input name="definition" defaultValue={e.definition} className={`${input} flex-1`} />
            <button className="rounded border px-3 py-1 text-xs">저장</button>
            <button formAction={deleteKbAction} className="rounded border px-3 py-1 text-xs text-red-500">삭제</button>
          </form>
        ))}
        {(!entries || entries.length === 0) && <p className="py-6 text-center text-neutral-400">등록된 용어가 없습니다.</p>}
      </div>
    </main>
  );
}
