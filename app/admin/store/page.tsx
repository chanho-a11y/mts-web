import { createClient } from "@/lib/supabase/server";
import {
  saveDomesticRateAction, addDomesticRateAction, saveEmsRateAction, saveTaxAction, saveFreeShipAction,
} from "@/app/admin/store/actions";

export const dynamic = "force-dynamic";

export default async function AdminStorePage() {
  const supabase = createClient();
  const { data: domestic } = await supabase
    .from("domestic_shipping_rate").select("id,label,max_weight_g,fee,position").order("position");
  const { data: ems } = await supabase
    .from("ems_rate").select("id,country_code,weight_g,price").order("country_code").order("weight_g");
  const { data: vat } = await supabase.from("site_setting").select("value").eq("key", "vat_rate").limit(1).maybeSingle();
  const { data: freeShip } = await supabase.from("site_setting").select("value").eq("key", "free_ship_threshold_krw").limit(1).maybeSingle();

  // EMS 국가별 그룹
  const byCountry = new Map<string, { id: string; weight_g: number; price: number }[]>();
  for (const r of ems ?? []) {
    if (!byCountry.has(r.country_code)) byCountry.set(r.country_code, []);
    byCountry.get(r.country_code)!.push(r);
  }

  const input = "rounded border px-2 py-1 text-sm";
  return (
    <main className="max-w-3xl space-y-10">
      <h1 className="text-2xl font-bold">배송 관리</h1>
      <p className="text-sm text-neutral-500">연락처·이메일·배경·폰트는 <a href="/admin/content" className="underline">사이트 관리자</a>에서, 관리자 역할지정은 <a href="/admin/content/roles" className="underline">사이트 관리자 &gt; 관리자 역할지정</a>에서 관리합니다. 여기서는 국내·해외 배송비와 세금을 관리합니다.</p>

      {/* 세금 */}
      <section className="rounded-xl border p-5">
        <h2 className="mb-3 font-bold">세금 설정</h2>
        <form action={saveTaxAction} className="flex items-end gap-2 text-sm">
          <label>국내 부가세율(%)<input name="vat_rate" type="number" step="0.1" defaultValue={vat?.value ?? "10"} className={`mt-1 block ${input} w-28`} /></label>
          <span className="text-xs text-neutral-400">해외(USD/페이팔) 결제는 세금 0으로 자동 처리</span>
          <button className="rounded-full bg-black px-4 py-1.5 text-white">저장</button>
        </form>
      </section>

      {/* 무료배송 기준 */}
      <section className="rounded-xl border p-5">
        <h2 className="mb-3 font-bold">국내 무료배송 기준</h2>
        <form action={saveFreeShipAction} className="flex items-end gap-2 text-sm">
          <label>기준금액(원, 0=무료 없음)<input name="free_ship_threshold_krw" type="number" min="0" step="1000" defaultValue={freeShip?.value ?? "0"} className={`mt-1 block ${input} w-36`} /></label>
          <span className="text-xs text-neutral-400">상품 소계가 이 금액 이상이면 국내 배송비 무료. 체크아웃에 &quot;○○원 이상 무료배송&quot; 자동 표시. (해외 미적용)</span>
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

    </main>
  );
}
