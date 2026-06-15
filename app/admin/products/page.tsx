import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const supabase = createClient();
  const { data: products } = await supabase
    .from("product")
    .select("slug,title_ko,product_type,is_b2b_only,status,key_color,product_variant(sku,base_price)")
    .order("title_ko");
  return (
    <main>
      <h1 className="mb-6 text-2xl font-bold">제품 관리</h1>
      <p className="mb-4 text-sm text-neutral-500">{products?.length ?? 0}개 · (등록/자동 콘텐츠 생성은 P5 디자인 스튜디오 연동)</p>
      <table className="w-full text-sm">
        <thead><tr className="border-b text-left text-neutral-500">
          <th className="py-2">제품</th><th>유형</th><th>SKU·가격</th><th>구분</th><th>색</th>
        </tr></thead>
        <tbody>
          {(products ?? []).map((p: any) => (
            <tr key={p.slug} className="border-b align-top">
              <td className="py-3">{p.title_ko}</td>
              <td>{p.product_type}</td>
              <td className="text-xs">{(p.product_variant ?? []).map((v: any) => `${v.sku} · ₩${v.base_price.toLocaleString()}`).join("  /  ")}</td>
              <td>{p.is_b2b_only ? "도매" : "소비자"}</td>
              <td>{p.key_color && <span className="inline-block h-4 w-4 rounded-full align-middle" style={{ background: p.key_color }} />}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
