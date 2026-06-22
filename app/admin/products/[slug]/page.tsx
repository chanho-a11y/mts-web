import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProductForm from "@/components/product-form";
import { generateDraftsAction, adjustInventoryAction } from "@/app/admin/products/actions";

export const dynamic = "force-dynamic";

export default async function AdminProductEdit({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const { data: p } = await supabase
    .from("product")
    .select(`id,slug,title_ko,one_liner,product_type,status,is_b2b_only,roast_level,flavor_notes,origin,variety,process,weight_g,key_color,report_no,material,
      brand(code), product_variant(id,sku,base_price), product_categories(category(slug)),
      content_draft(type,title,status,created_at)`)
    .eq("slug", params.slug).maybeSingle();
  if (!p) notFound();
  const pv = (p as any).product_variant?.[0];
  const variantsWithStock = await Promise.all(((p as any).product_variant ?? []).map(async (v: any) => {
    const { data: stock } = await supabase.rpc("current_stock", { p_variant_id: v.id });
    return { ...v, stock: stock ?? 0 };
  }));
  const initial = {
    slug: p.slug, brand: (p as any).brand?.code, title_ko: p.title_ko, one_liner: p.one_liner ?? "",
    product_type: p.product_type ?? "블렌드", is_b2b_only: p.is_b2b_only, roast_level: p.roast_level ?? "",
    flavor_notes: p.flavor_notes ?? [], origin_country: (p as any).origin?.country ?? "",
    variety: p.variety ?? "", process: p.process ?? "", weight_g: p.weight_g, key_color: p.key_color ?? "",
    sku: pv?.sku ?? "", base_price: pv?.base_price ?? undefined,
    category: (p as any).product_categories?.[0]?.category?.slug ?? "blends",
    report_no: (p as any).report_no ?? "", material: (p as any).material ?? "",
  };
  const drafts = (p as any).content_draft ?? [];
  const { data: studioAssets } = await supabase
    .from("product_asset").select("kind,url,created_at").eq("product_id", (p as any).id)
    .order("created_at", { ascending: false });

  return (
    <main className="space-y-8">
      <div>
        <h1 className="mb-1 text-2xl font-bold">제품 수정</h1>
        <p className="mb-4 text-sm text-neutral-500">{p.slug}</p>
        <ProductForm initial={initial} />
      </div>

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

      <section className="rounded-xl border p-5">
        <h2 className="mb-3 font-bold">자산 미리보기 (key_color 테마)</h2>
        <div className="flex flex-wrap gap-4">
          <figure className="w-48">
            <img src={`/api/asset/thumbnail/${p.slug}`} alt="thumbnail" className="w-full rounded border" />
            <figcaption className="mt-1 text-xs text-neutral-500">썸네일 1080×1080 · <a href={`/api/asset/thumbnail/${p.slug}`} download className="underline">SVG 저장</a></figcaption>
          </figure>
          <figure className="w-40">
            <img src={`/api/asset/cardnews/${p.slug}`} alt="cardnews" className="w-full rounded border" />
            <figcaption className="mt-1 text-xs text-neutral-500">카드뉴스 1080×1350 · <a href={`/api/asset/cardnews/${p.slug}`} download className="underline">SVG 저장</a></figcaption>
          </figure>
        </div>
        <p className="mt-2 text-xs text-neutral-400">※ 위는 제품 데이터 기반 자동 미리보기. 아래는 디자인 스튜디오에서 저장한 실제 자산입니다.</p>
      </section>

      <section className="rounded-xl border p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold">디자인 스튜디오 저장 자산</h2>
          <a href="/admin/studio" className="rounded border px-3 py-1.5 text-xs text-clayDeep hover:bg-neutral-100">스튜디오에서 편집</a>
        </div>
        {studioAssets && studioAssets.length > 0 ? (
          <div className="flex flex-wrap gap-4">
            {studioAssets.map((a: any, i: number) => (
              <figure key={i} className="w-40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.url} alt={a.kind} className="w-full rounded border" />
                <figcaption className="mt-1 text-xs text-neutral-500">{a.kind} · <a href={a.url} target="_blank" rel="noreferrer" className="underline">열기</a></figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <p className="text-sm text-neutral-400">아직 저장된 자산이 없습니다. <a href="/admin/studio" className="underline">디자인 스튜디오</a>에서 제품을 불러와 ‘제품에 반영’을 누르면 라벨·카드뉴스·썸네일이 여기에 저장됩니다.</p>
        )}
      </section>

      <section className="rounded-xl border p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold">자동 생성 콘텐츠 (content_draft)</h2>
          <form action={generateDraftsAction}>
            <input type="hidden" name="product_id" value={(p as any).id} />
            <input type="hidden" name="slug" value={p.slug} />
            <button className="rounded border px-3 py-1.5 text-xs">상세·블로그 초안 재생성</button>
          </form>
        </div>
        {drafts.length === 0 ? (
          <p className="text-sm text-neutral-400">초안이 없습니다. ‘재생성’을 누르거나 저장 시 자동 생성됩니다.</p>
        ) : (
          <ul className="text-sm">
            {drafts.map((d: any, idx: number) => (
              <li key={idx} className="border-b py-2">
                <span className="mr-2 rounded bg-neutral-100 px-2 py-0.5 text-xs">{d.type}</span>
                {d.title} <span className="text-xs text-neutral-400">· {d.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
