import { createClient } from "@/lib/supabase/server";
import {
  saveDomesticRateAction, addDomesticRateAction, saveEmsRateAction, saveTaxAction, setUserRoleAction,
} from "@/app/admin/store/actions";
import { formatKRW } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function AdminStorePage() {
  const supabase = createClient();
  const { data: domestic } = await supabase
    .from("domestic_shipping_rate").select("id,label,max_weight_g,fee,position").order("position");
  const { data: ems } = await supabase
    .from("ems_rate").select("id,country_code,weight_g,price").order("country_code").order("weight_g");
  const { data: vat } = await supabase.from("site_setting").select("value").eq("key", "vat_rate").limit(1).maybeSingle();
  const { data: admins } = await supabase.from("profiles").select("name,email,role").eq("role", "admin");

  // EMS 국가별 그룹
  const byCountry = new Map<string, { id: string; weight_g: number; price: number }[]>();
  for (const r of ems ?? []) {
    if (!byCountry.has(r.country_code)) byCountry.set(r.country_code, []);
    byCountry.get(r.country_code)!.push(r);
  }

  const input = "rounded border px-2 py-1 text-sm";
  return (
    <main className="max-w-3xl space-y-10">
      <h1 className="text-2xl font-bold">스토어 정보 관리</h1>
      <p className="text-sm text-neutral-500">연락처·이메일·배경·폰트는 <a href="/admin/content" className="underline">콘텐츠 관리</a>에서 편집합니다. 여기서는 배송비·세금·관리자를 관리합니다.</p>

      {/* 세금 */}
      <section className="rounded-xl border p-5">
        <h2 className="mb-3 font-bold">세금 설정</h2>
        <form action={saveTaxAction} className="flex items-end gap-2 text-sm">
          <label>국내 부가세율(%)<input name="vat_rate" type="number" step="0.1" defaultValue={vat?.value ?? "10"} className={`mt-1 block ${input} w-28`} /></label>
          <span className="text-xs text-neutral-400">해외(USD/페이팔) 결제는 세금 0으로 자동 처리</span>
          <button className="rounded-full bg-black px-4 py-1.5 text-white">저장</button>
        </form>
      </section>

      {/* 국내 배송 */}
      <section className="rounded-xl border p-5">
        <h2 className="mb-3 font-bold">국내 배송 요금 (무게 구간)</h2>
        <div className="space-y-2">
          {(domestic ?? []).map((r) => (
            <form key={r.id} action={saveDomesticRateAction} className="flex items-center gap-2 text-sm">
              <input type="hidden" name="id" value={r.id} />
              <input name="label" defaultValue={r.label} className={`${input} flex-1`} />
              <span className="w-28 text-xs text-neutral-400">≤ {r.max_weight_g ?? "∞"}g</span>
              <input name="fee" type="number" defaultValue={r.fee} className={`${input} w-24`} />원
              <button className="rounded border px-3 py-1 text-xs">저장</button>
            </form>
          ))}
        </div>
        <form action={addDomesticRateAction} className="mt-4 flex flex-wrap items-end gap-2 border-t pt-4 text-sm">
          <label>라벨<input name="label" placeholder="2kg 이하" className={`mt-1 block ${input}`} /></label>
          <label>최대무게(g, 빈칸=무제한)<input name="max_weight_g" type="number" className={`mt-1 block ${input} w-32`} /></label>
          <label>요금(원)<input name="fee" type="number" className={`mt-1 block ${input} w-28`} /></label>
          <label>정렬<input name="position" type="number" defaultValue={(domestic?.length ?? 0) + 1} className={`mt-1 block ${input} w-16`} /></label>
          <button className="rounded-full bg-black px-4 py-1.5 text-white">행 추가</button>
        </form>
      </section>

      {/* 해외 EMS */}
      <section className="rounded-xl border p-5">
        <h2 className="mb-1 font-bold">해외 배송 (EMS 프리미엄)</h2>
        <p className="mb-3 text-xs text-neutral-400">우체국 EMS 요금표 기반 시드. 국가·무게구간별 가격을 수정할 수 있습니다. (원두에 한해 국제배송)</p>
        <div className="space-y-2">
          {[...byCountry.entries()].map(([cc, rows]) => (
            <details key={cc} className="rounded border">
              <summary className="cursor-pointer px-3 py-2 text-sm font-medium">{cc} <span className="text-xs text-neutral-400">({rows.length}구간)</span></summary>
              <div className="space-y-1 p-3">
                {rows.map((r) => (
                  <form key={r.id} action={saveEmsRateAction} className="flex items-center gap-2 text-sm">
                    <input type="hidden" name="id" value={r.id} />
                    <span className="w-24 text-xs text-neutral-500">~{r.weight_g}g</span>
                    <input name="price" type="number" defaultValue={r.price} className={`${input} w-28`} />원
                    <button className="rounded border px-2 py-0.5 text-xs">저장</button>
                  </form>
                ))}
              </div>
            </details>
          ))}
          {byCountry.size === 0 && <p className="text-sm text-neutral-400">EMS 요금 데이터가 없습니다.</p>}
        </div>
      </section>

      {/* 관리자/역할 */}
      <section className="rounded-xl border p-5">
        <h2 className="mb-3 font-bold">관리자 · 역할 지정</h2>
        <p className="mb-3 text-xs text-neutral-500">가입된 사용자의 이메일로 역할을 지정합니다. (일반/기업/인플루언서/관리자 — 인플루언서·관리자 지정은 여기서만 가능)</p>
        <form action={setUserRoleAction} className="flex flex-wrap items-end gap-2 text-sm">
          <label>이메일<input name="email" type="email" placeholder="user@example.com" className={`mt-1 block ${input} w-64`} /></label>
          <label>역할
            <select name="role" className={`mt-1 block ${input}`}>
              <option value="individual">일반회원</option>
              <option value="business">기업회원</option>
              <option value="influencer">인플루언서</option>
              <option value="admin">관리자</option>
            </select>
          </label>
          <button className="rounded-full bg-black px-4 py-1.5 text-white">적용</button>
        </form>
        <div className="mt-4">
          <p className="mb-1 text-xs font-bold uppercase text-neutral-400">현재 관리자</p>
          <ul className="text-sm">
            {(admins ?? []).map((a) => <li key={a.email}>{a.name || "-"} · {a.email}</li>)}
            {(!admins || admins.length === 0) && <li className="text-neutral-400">없음</li>}
          </ul>
        </div>
      </section>
    </main>
  );
}
