import { createClient } from "@/lib/supabase/server";
import { setCustomerPriceAction, deleteCustomerPriceAction } from "@/app/admin/customers/actions";
import { formatKRW } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function AdminCustomerDetail({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: profile } = await supabase
    .from("profiles").select("name,email,role").eq("id", params.id).maybeSingle();
  const { data: variants } = await supabase
    .from("product_variant").select("id,sku,base_price,product(title_ko)").order("sku");
  const { data: prices } = await supabase
    .from("customer_variant_prices").select("id,price,variant_id,product_variant(sku)").eq("profile_id", params.id);

  const input = "rounded border px-3 py-2 text-sm";
  return (
    <main className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">{profile?.name || profile?.email}</h1>
        <p className="text-sm text-neutral-500">{profile?.email} · {profile?.role}</p>
      </div>

      <section className="rounded-xl border p-5">
        <h2 className="mb-3 font-bold">기업 고객 할인 설정</h2>
        <p className="mb-3 text-xs text-neutral-500">제품을 선택하고 <b>할인 금액(원)</b> · <b>할인율(%)</b> · <b>직접 단가</b> 중 하나로 입력하면 최종 개별가로 환산되어, 이 고객에게 정가/등급가보다 우선 적용됩니다(resolve_price).</p>
        <form action={setCustomerPriceAction} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="profile_id" value={params.id} />
          <label className="text-sm">상품(SKU)
            <select name="variant_id" className={`mt-1 block ${input}`}>
              {(variants ?? []).map((v: any) => (
                <option key={v.id} value={v.id}>{v.sku} · {v.product?.title_ko} (정가 {formatKRW(v.base_price)})</option>
              ))}
            </select>
          </label>
          <label className="text-sm">할인 방식
            <select name="mode" className={`mt-1 block ${input}`}>
              <option value="amount">할인 금액(원)</option>
              <option value="percent">할인율(%)</option>
              <option value="fixed">직접 단가(원)</option>
            </select>
          </label>
          <label className="text-sm">값<input type="number" step="0.1" name="value" placeholder="예: 1000 / 15 / 9000" className={`mt-1 block ${input}`} /></label>
          <button className="rounded-full bg-black px-4 py-2 text-sm text-white">저장</button>
        </form>

        <table className="mt-5 w-full text-sm">
          <thead><tr className="border-b text-left text-neutral-500"><th className="py-2">SKU</th><th>개별가</th><th></th></tr></thead>
          <tbody>
            {(prices ?? []).map((p: any) => (
              <tr key={p.id} className="border-b">
                <td className="py-2">{p.product_variant?.sku}</td>
                <td>{formatKRW(p.price)}</td>
                <td className="text-right">
                  <form action={deleteCustomerPriceAction}>
                    <input type="hidden" name="id" value={p.id} /><input type="hidden" name="profile_id" value={params.id} />
                    <button className="text-xs text-red-500">삭제</button>
                  </form>
                </td>
              </tr>
            ))}
            {(!prices || prices.length === 0) && <tr><td colSpan={3} className="py-4 text-neutral-400">설정된 개별가가 없습니다.</td></tr>}
          </tbody>
        </table>
      </section>
    </main>
  );
}
