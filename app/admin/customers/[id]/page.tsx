import { createClient } from "@/lib/supabase/server";
import { deleteCustomerPriceAction } from "@/app/admin/customers/actions";
import { formatKRW } from "@/lib/i18n";
import CustomerDiscountForm from "@/components/customer-discount-form";

export const dynamic = "force-dynamic";

export default async function AdminCustomerDetail({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: profile } = await supabase
    .from("profiles").select("name,email,role").eq("id", params.id).maybeSingle();
  const { data: productList } = await supabase
    .from("product").select("slug,title_ko").eq("status", "active").order("title_ko");
  const { data: cats } = await supabase.from("category").select("slug,name_ko,position").order("position");
  const { data: prices } = await supabase
    .from("customer_variant_prices").select("id,price,variant_id,product_variant(sku)").eq("profile_id", params.id);

  const products = (productList ?? []).map((p: { slug: string; title_ko: string }) => ({ slug: p.slug, title: p.title_ko }));
  const categories = (cats ?? []).map((c: { slug: string; name_ko: string }) => ({ slug: c.slug, name: c.name_ko }));
  return (
    <main className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">{profile?.name || profile?.email}</h1>
        <p className="text-sm text-neutral-500">{profile?.email} · {profile?.role}</p>
      </div>

      <section className="rounded-xl border p-5">
        <h2 className="mb-3 font-bold">기업 고객 할인 설정</h2>
        <p className="mb-3 text-xs text-neutral-500"><b>제품 할인</b> 또는 <b>카테고리 할인</b>을 선택하고 <b>할인 금액(원)</b> · <b>할인율(%)</b>로 입력합니다. ‘＋ 할인 추가’로 여러 건을 한 번에 등록할 수 있습니다.</p>
        <CustomerDiscountForm profileId={params.id} products={products} categories={categories} />

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
