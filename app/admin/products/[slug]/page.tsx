import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProductForm from "@/components/product-form";
import DiscountModal from "@/components/discount-modal";
import { adjustInventoryAction, deleteCustomerPriceAction } from "@/app/admin/products/actions";
import { getReportPresets } from "@/lib/report-no-server";

export const dynamic = "force-dynamic";

export default async function AdminProductEdit({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const { data: p } = await supabase
    .from("product")
    .select(`id,slug,title_ko,title_en,one_liner,one_liner_en,product_type,status,is_b2b_only,roast_level,roast_level_en,flavor_notes,flavor_notes_en,origin,variety,variety_en,process,process_en,weight_g,key_color,report_no,material,story,story_en,cost,recipe,
      brand(code), product_variant(id,sku,base_price), product_categories(category(slug))`)
    .eq("slug", params.slug).maybeSingle();
  if (!p) notFound();
  const pv = (p as any).product_variant?.[0];
  const variants = ((p as any).product_variant ?? []) as { id: string; sku: string; base_price: number }[];
  const catSlug = (p as any).product_categories?.[0]?.category?.slug ?? "blends";
  const isB2b = p.is_b2b_only || catSlug === "wholesale";

  const variantsWithStock = await Promise.all(variants.map(async (v: any) => {
    const { data: stock } = await supabase.rpc("current_stock", { p_variant_id: v.id });
    return { ...v, stock: stock ?? 0 };
  }));

  // 카테고리 옵션(쇼핑 카테고리와 동일 소스) + 사업자 전용 할인용 고객·기존 단가
  const [{ data: cats }, { data: bizCustomers }] = await Promise.all([
    supabase.from("category").select("slug,name_ko,position").order("position"),
    isB2b ? supabase.from("profiles").select("id,name,email").eq("role", "business").order("name") : Promise.resolve({ data: [] as any[] }),
  ]);
  const categoryOptions = (cats ?? []).map((c: any) => ({ slug: c.slug, name: c.name_ko }));
  const reportPresets = await getReportPresets();

  // 기존 고객별 단가 (이 제품 변형에 한해)
  let customerPrices: any[] = [];
  if (isB2b && variants.length > 0) {
    const vids = variants.map((v) => v.id);
    const { data: cvp } = await supabase
      .from("customer_variant_prices")
      .select("id,price,note,variant_id,profile:profiles!customer_variant_prices_profile_id_fkey(name,email)")
      .in("variant_id", vids);
    customerPrices = cvp ?? [];
  }
  const skuOf = (vid: string) => variants.find((v) => v.id === vid)?.sku ?? "";
  const baseOf = (vid: string) => variants.find((v) => v.id === vid)?.base_price ?? 0;

  const px = p as any;
  const initial = {
    slug: p.slug, brand: px.brand?.code, title_ko: p.title_ko, title_en: px.title_en ?? "",
    one_liner: p.one_liner ?? "", one_liner_en: px.one_liner_en ?? "",
    is_b2b_only: p.is_b2b_only, roast_level: p.roast_level ?? "", roast_level_en: px.roast_level_en ?? "", status: p.status ?? "active",
    flavor_notes: p.flavor_notes ?? [], flavor_notes_en: px.flavor_notes_en ?? [],
    origin_country: px.origin?.country ?? "", origin_country_en: px.origin?.country_en ?? "",
    variety: p.variety ?? "", variety_en: px.variety_en ?? "", process: p.process ?? "", process_en: px.process_en ?? "",
    weight_g: p.weight_g, key_color: p.key_color ?? "",
    sku: pv?.sku ?? "", base_price: pv?.base_price ?? undefined, category: catSlug,
    report_no: px.report_no ?? "", material: px.material ?? "",
    story: px.story ?? "", story_en: px.story_en ?? "", cost: px.cost ?? null,
    recipe: px.recipe ?? null,
  };

  return (
    <main className="space-y-8">
      <div>
        <h1 className="mb-1 text-2xl font-bold">제품 수정</h1>
        <p className="mb-4 text-sm text-neutral-500">{p.slug}</p>
        <ProductForm initial={initial} categories={categoryOptions} reportPresets={reportPresets} />
      </div>

      {/* 재고 */}
      <section className="rounded-xl border p-5">
        <h2 className="mb-3 font-bold">재고</h2>
        <table className="w-full text-sm">
          <tbody>
            {variantsWithStock.map((v: any) => (
              <tr key={v.id} className="border-b">
                <td className="py-2 font-mono text-xs">{v.sku}</td>
                <td>현재고 <b>{v.stock}</b></td>
                <td className="text-right">
                  <form action={adjustInventoryAction} className="inline-flex gap-2">
                    <input type="hidden" name="variant_id" value={v.id} />
                    <input type="hidden" name="slug" value={p.slug} />
                    <input type="number" name="delta" placeholder="+/- 수량" className="w-24 rounded border px-2 py-1 text-xs" />
                    <button className="rounded border px-3 py-1 text-xs">조정</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* 사업자 전용 — 고객별 할인 */}
      {isB2b && (
        <section className="rounded-xl border p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="font-bold">고객별 할인 (사업자 전용)</h2>
              <p className="mt-1 text-xs text-neutral-500">고객마다 다른 납품가를 지정합니다. 납품가/할인가 한쪽 입력 시 나머지는 자동 계산(기준: 소비자가).</p>
            </div>
            <DiscountModal slug={p.slug} variants={variants} customers={(bizCustomers ?? []) as any} />
          </div>
          {customerPrices.length > 0 ? (
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-neutral-500"><th className="py-2">고객</th><th>SKU</th><th className="text-right">소비자가</th><th className="text-right">납품가</th><th className="text-right">할인</th><th></th></tr></thead>
              <tbody>
                {customerPrices.map((r: any) => {
                  const base = baseOf(r.variant_id);
                  const disc = base - r.price;
                  const rate = base > 0 ? Math.round((disc / base) * 1000) / 10 : 0;
                  return (
                    <tr key={r.id} className="border-b">
                      <td className="py-2">{r.profile?.name || "-"} <span className="text-xs text-neutral-400">{r.profile?.email}</span></td>
                      <td className="font-mono text-xs">{skuOf(r.variant_id)}</td>
                      <td className="text-right">{base.toLocaleString()}원</td>
                      <td className="text-right font-medium">{r.price.toLocaleString()}원</td>
                      <td className="text-right">{disc.toLocaleString()}원 ({rate}%)</td>
                      <td className="text-right">
                        <form action={deleteCustomerPriceAction}>
                          <input type="hidden" name="id" value={r.id} />
                          <input type="hidden" name="slug" value={p.slug} />
                          <button className="text-xs text-red-500">삭제</button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-neutral-400">아직 고객별 단가가 없습니다. ‘고객별 할인 설정’으로 추가하세요.</p>
          )}
        </section>
      )}
    </main>
  );
}
