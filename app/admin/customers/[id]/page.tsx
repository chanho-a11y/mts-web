import { createClient } from "@/lib/supabase/server";
import { deleteCustomerPriceAction } from "@/app/admin/customers/actions";
import { formatKRW } from "@/lib/i18n";
import CustomerDiscountForm from "@/components/customer-discount-form";

export const dynamic = "force-dynamic";

const pct = (base?: number | null, price?: number | null) =>
  base && price != null && base > 0 ? Math.round((1 - price / base) * 100) : 0;

type TierRow = {
  variant_id: string;
  sku: string;
  title_ko: string | null;
  weight_g: number | null;
  base_price: number | null;
  effective_price: number | null;
  origin: "manual" | "rule" | "base";
  is_b2b_only: boolean;
  product_status: string | null;
};

export default async function AdminCustomerDetail({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: profile } = await supabase
    .from("profiles").select("name,email,role,price_tier_id").eq("id", params.id).maybeSingle();
  const { data: productList } = await supabase
    .from("product").select("slug,title_ko").eq("status", "active").order("title_ko");
  const { data: cats } = await supabase.from("category").select("slug,name_ko,position").order("position");
  const { data: prices } = await supabase
    .from("customer_variant_prices")
    .select("id,price,variant_id,product_variant(sku,base_price,product(title_ko))")
    .eq("profile_id", params.id);

  // 등급가(도매 등급) — 등급 기본할인율 규칙(origin=rule) + 변형별 수동 예외(origin=manual)를 함께 조회.
  // 계산식은 DB 의 tier_default_price 단일 정본을 쓰므로 화면값 = 실제 결제값.
  let tierName: string | null = null;
  let tierPct: number | null = null;
  let tierPrices: TierRow[] = [];
  if (profile?.price_tier_id) {
    const { data: tier } = await supabase
      .from("price_tier").select("name,default_discount_pct").eq("id", profile.price_tier_id).maybeSingle();
    tierName = (tier as any)?.name ?? null;
    const raw = (tier as any)?.default_discount_pct;
    tierPct = raw == null ? null : Number(raw);
    const { data: vp } = await supabase.rpc("admin_tier_price_table", { p_price_tier_id: profile.price_tier_id });
    tierPrices = (vp ?? []) as TierRow[];
  }

  const products = (productList ?? []).map((p: { slug: string; title_ko: string }) => ({ slug: p.slug, title: p.title_ko }));
  const categories = (cats ?? []).map((c: { slug: string; name_ko: string }) => ({ slug: c.slug, name: c.name_ko }));
  const indivCount = prices?.length ?? 0;
  const tierCount = tierPrices.filter((v) => v.origin !== "base").length;

  return (
    <main className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">{profile?.name || profile?.email}</h1>
        <p className="text-sm text-neutral-500">
          {profile?.email} · {profile?.role}
          {tierName && <> · 등급 <b className="text-neutral-700">{tierName}</b></>}
        </p>
        <p className="mt-1 text-xs text-neutral-500">적용 할인 품목 <b>{indivCount + tierCount}</b>건 (개별가 {indivCount} · 등급가 {tierCount})</p>
      </div>

      <section className="rounded-xl border p-5">
        <h2 className="mb-3 font-bold">기업 고객 할인 설정</h2>
        <p className="mb-3 text-xs text-neutral-500"><b>제품 할인</b> 또는 <b>카테고리 할인</b>을 선택하고 <b>할인 금액(원)</b> · <b>할인율(%)</b>로 입력합니다. ‘＋ 할인 추가’로 여러 건을 한 번에 등록할 수 있습니다.</p>
        <CustomerDiscountForm profileId={params.id} products={products} categories={categories} />

        {/* 개별가 — 이 고객에게만 지정된 단가 (resolve_price 최우선) */}
        <h3 className="mt-6 mb-2 text-sm font-bold">개별가 <span className="font-normal text-neutral-400">· 이 고객 전용 (최우선 적용)</span></h3>
        <table className="w-full text-sm">
          <thead><tr className="border-b text-left text-neutral-500"><th className="py-2">SKU</th><th>제품</th><th className="text-right">정가</th><th className="text-right">개별가</th><th className="text-right">할인율</th><th></th></tr></thead>
          <tbody>
            {(prices ?? []).map((p: any) => (
              <tr key={p.id} className="border-b">
                <td className="py-2">{p.product_variant?.sku}</td>
                <td className="text-neutral-500">{p.product_variant?.product?.title_ko}</td>
                <td className="text-right text-neutral-400 line-through">{formatKRW(p.product_variant?.base_price)}</td>
                <td className="text-right font-medium">{formatKRW(p.price)}</td>
                <td className="text-right text-emerald-600">{pct(p.product_variant?.base_price, p.price)}%</td>
                <td className="text-right">
                  <form action={deleteCustomerPriceAction}>
                    <input type="hidden" name="id" value={p.id} /><input type="hidden" name="profile_id" value={params.id} />
                    <button className="text-xs text-red-500">삭제</button>
                  </form>
                </td>
              </tr>
            ))}
            {indivCount === 0 && <tr><td colSpan={6} className="py-4 text-neutral-400">설정된 개별가가 없습니다.</td></tr>}
          </tbody>
        </table>

        {/* 등급가 — 고객 등급으로 적용되는 할인 (개별가 없을 때 적용) */}
        <h3 className="mt-7 mb-2 text-sm font-bold">등급가 {tierName && <span className="font-normal text-neutral-400">· {tierName} 등급 (개별가 없을 때 적용)</span>}</h3>
        {!profile?.price_tier_id ? (
          <p className="py-3 text-xs text-neutral-400">배정된 등급이 없습니다. (등급 미배정 시 정가 적용)</p>
        ) : (
          <>
            <p className="mb-2 text-[11px] text-neutral-500">
              {tierPct != null
                ? <>이 등급은 <b className="text-neutral-700">기본 할인율 {tierPct}%</b>가 자동 적용됩니다. 신규 제품도 등록 즉시 반영되며, 정가를 바꾸면 등급가도 함께 따라옵니다.</>
                : <>이 등급에는 기본 할인율이 설정되어 있지 않습니다. (수동 지정 품목만 할인)</>}
            </p>
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-neutral-500"><th className="py-2">SKU</th><th>제품</th><th className="text-right">정가</th><th className="text-right">등급가</th><th className="text-right">할인율</th><th className="text-right">적용</th></tr></thead>
              <tbody>
                {tierPrices.map((v) => (
                  <tr key={v.variant_id} className="border-b">
                    <td className="py-2">{v.sku}</td>
                    <td className="text-neutral-500">{v.title_ko}</td>
                    <td className={`text-right ${v.origin === "base" ? "text-neutral-500" : "text-neutral-400 line-through"}`}>{formatKRW(v.base_price ?? 0)}</td>
                    <td className="text-right font-medium">{formatKRW(v.effective_price ?? 0)}</td>
                    <td className="text-right text-emerald-600">{v.origin === "base" ? "—" : `${pct(v.base_price, v.effective_price)}%`}</td>
                    <td className="text-right text-[11px] text-neutral-400">
                      {v.origin === "manual" ? "수동 지정" : v.origin === "rule" ? "자동" : v.is_b2b_only ? "도매전용가" : "미적용"}
                    </td>
                  </tr>
                ))}
                {tierPrices.length === 0 && <tr><td colSpan={6} className="py-4 text-neutral-400">표시할 품목이 없습니다.</td></tr>}
              </tbody>
            </table>
          </>
        )}
        <p className="mt-2 text-[11px] text-neutral-400">
          단가 적용 순서는 <b>개별가 &gt; 수동 등급가 &gt; 등급 기본할인율 &gt; 정가</b>입니다.
          ‘자동’은 등급 기본할인율이 적용된 항목, ‘도매전용가’는 정가 자체가 이미 도매가인 대용량(1kg·200g) 항목입니다.
        </p>
      </section>
    </main>
  );
}
