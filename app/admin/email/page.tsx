import { createClient } from "@/lib/supabase/server";
import { saveAutomationAction, addAutomationAction, deleteAutomationAction } from "./actions";
import { TRIGGER_TEMPLATES, SEGMENTS, templateFor } from "@/lib/email-templates";

export const dynamic = "force-dynamic";

const input = "rounded border px-2 py-1 text-sm";

export default async function AdminEmailPage() {
  const supabase = createClient();
  const { data: autos } = await supabase.from("email_automation").select("*").order("trigger");
  const rows = autos ?? [];
  const existing = new Set(rows.map((a: { trigger: string }) => a.trigger));
  const addable = TRIGGER_TEMPLATES.filter((t) => !existing.has(t.trigger));

  return (
    <main className="max-w-3xl space-y-8">
      <div>
        <h1 className="mb-2 text-2xl font-bold">이메일 · 자동화</h1>
        <p className="text-sm text-neutral-500">
          트리거·지연·대상·상태를 수정하고, 새 자동화를 추가할 수 있습니다. <b>마케팅성 발송은 마케팅 수신 동의 회원에게만</b> 나갑니다.
          발송 엔진(cron)이 구현된 트리거만 실제 발송되며, 그 외는 규칙 저장·활성화는 되나 <span className="text-amber-600">발송 연동 대기</span> 상태입니다.
        </p>
      </div>

      {/* 현재 자동화 */}
      <section className="rounded-xl border p-5">
        <h2 className="mb-3 font-bold">자동화 규칙</h2>
        <div className="space-y-3">
          {rows.map((a: { id: string; trigger: string; delay_hours: number; segment: string; is_active: boolean }) => {
            const tpl = templateFor(a.trigger);
            return (
              <form key={a.id} action={saveAutomationAction} className="flex flex-wrap items-end gap-2 border-b pb-3 text-sm">
                <input type="hidden" name="id" value={a.id} />
                <div className="min-w-[160px]">
                  <div className="font-medium">{tpl?.label ?? a.trigger}
                    {tpl && !tpl.wired && <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700">연동 대기</span>}
                    {tpl?.wired && <span className="ml-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] text-emerald-700">발송 구현됨</span>}
                  </div>
                  <div className="text-[11px] text-neutral-400">{tpl?.desc ?? a.trigger}</div>
                </div>
                <label className="text-xs">지연(시간)
                  <input name="delay_hours" type="number" min="0" defaultValue={a.delay_hours} className={`mt-1 block ${input} w-24`} />
                </label>
                <label className="text-xs">대상
                  <select name="segment" defaultValue={a.segment} className={`mt-1 block ${input} w-40`}>
                    {SEGMENTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </label>
                <label className="flex items-center gap-1 text-xs">
                  <input type="checkbox" name="is_active" defaultChecked={a.is_active} /> 활성
                </label>
                <button className="rounded-full bg-black px-3 py-1.5 text-xs text-white">저장</button>
                <button formAction={deleteAutomationAction} className="rounded-full border px-3 py-1.5 text-xs text-red-500">삭제</button>
              </form>
            );
          })}
          {rows.length === 0 && <p className="text-sm text-neutral-400">등록된 자동화가 없습니다. 아래에서 추가하세요.</p>}
        </div>
      </section>

      {/* 템플릿에서 추가 */}
      <section className="rounded-xl border p-5">
        <h2 className="mb-1 font-bold">자동화 추가 — 트리거 템플릿</h2>
        <p className="mb-3 text-xs text-neutral-400">유용한 마케팅 트리거 {TRIGGER_TEMPLATES.length}종. 추가할 트리거를 선택하면 기본 지연·대상으로 등록됩니다(비활성 상태로 추가 → 검토 후 활성화).</p>
        {addable.length === 0 ? (
          <p className="text-sm text-neutral-400">모든 템플릿이 이미 추가되어 있습니다.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {addable.map((t) => (
              <form key={t.trigger} action={addAutomationAction} className="flex items-center justify-between gap-2 rounded-lg border p-3 text-sm">
                <input type="hidden" name="trigger" value={t.trigger} />
                <input type="hidden" name="delay_hours" value={t.defaultDelayHours} />
                <input type="hidden" name="segment" value={t.defaultSegment} />
                <div className="min-w-0">
                  <div className="font-medium">{t.label} {t.wired && <span className="text-[10px] text-emerald-600">· 발송 구현됨</span>}</div>
                  <div className="truncate text-[11px] text-neutral-400">{t.desc} · 기본 {t.defaultDelayHours}h</div>
                </div>
                <button className="shrink-0 rounded-full border px-3 py-1.5 text-xs hover:bg-neutral-50">추가</button>
              </form>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
