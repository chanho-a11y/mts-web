import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { archiveProductAction, restoreProductAction, duplicateProductAction } from "./actions";
import ReportNoManager from "@/components/report-no-manager";
import BulkProductBar from "@/components/bulk-product-bar";

export const dynamic = "force-dynamic";

// 제품명 표기: title_ko 정규화(제품명+용량) 완료(D-059) → 원본 그대로 노출(스튜디오 드롭다운과 일치).

export default async function AdminProductsPage({ searchParams }: { searchParams: { show?: string; sort?: string; bulk?: string; ok?: string; fail?: string; failmsg?: string } }) {
  const showArchived = searchParams.show === "archived";
  const sort = searchParams.sort === "type" ? "type" : "name";
  const supabase = createClient();
  let q = supabase
    .from("product")
    .select("slug,title_ko,product_type,is_b2b_only,status,key_color,weight_g,product_variant(sku,base_price)")
    .eq("status", showArchived ? "archived" : "active");
  q = sort === "type" ? q.order("is_b2b_only", { ascending: true }).order("title_ko") : q.order("title_ko");
  const { data: products } = await q;

  const { data: cats } = await supabase.from("category").select("slug,name_ko,position").order("position");
  const categoryOptions = (cats ?? []).map((c: { slug: string; name_ko: string }) => ({ slug: c.slug, name: c.name_ko }));
  const sortHref = (s: string) => `/admin/products?${new URLSearchParams({ ...(showArchived ? { show: "archived" } : {}), sort: s }).toString()}`;

  return (
    <main>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">제품 관리</h1>
        <div className="flex items-center gap-2">
          <Link
            href={showArchived ? "/admin/products" : "/admin/products?show=archived"}
            className="rounded-full border px-4 py-2 text-sm hover:bg-neutral-100"
          >
            {showArchived ? "← 활성 제품" : "보관함 보기"}
          </Link>
          {!showArchived && (
            <>
              <ReportNoManager />
              <Link href="/admin/products/bulk" className="rounded-full border px-4 py-2 text-sm hover:bg-neutral-100">⬆ 일괄 등록</Link>
              <Link href="/admin/products/new" className="rounded-full bg-black px-4 py-2 text-sm text-white">+ 제품 등록</Link>
            </>
          )}
        </div>
      </div>
      {searchParams.bulk === "done" && (
        <div className="mb-4 rounded-card border border-line bg-paper px-4 py-3 text-sm">
          일괄 등록 완료 — 성공 <b className="text-green-700">{searchParams.ok ?? 0}</b>건
          {Number(searchParams.fail ?? 0) > 0 && <> · 실패 <b className="text-red-600">{searchParams.fail}</b>건</>}
          {searchParams.failmsg && <p className="mt-1 text-xs text-red-600">{searchParams.failmsg}</p>}
        </div>
      )}
      <p className="mb-4 text-sm text-neutral-500">
        {products?.length ?? 0}개 · {showArchived ? "보관된 제품 — 복구 가능" : "수정·보관 버튼으로 관리 (보관 = 스토어프론트 숨김·복구 가능)"}
      </p>
      <div className="mb-2 flex items-center gap-2 text-sm">
        <span className="text-neutral-400">정렬:</span>
        <Link href={sortHref("name")} className={`rounded-full border px-3 py-1 text-xs ${sort === "name" ? "bg-black text-white" : "hover:bg-neutral-100"}`}>가나다순</Link>
        <Link href={sortHref("type")} className={`rounded-full border px-3 py-1 text-xs ${sort === "type" ? "bg-black text-white" : "hover:bg-neutral-100"}`}>도매/소비자순</Link>
      </div>
      <BulkProductBar showArchived={showArchived} categories={categoryOptions} />
      <table className="w-full text-sm">
        <thead><tr className="border-b text-left text-neutral-500">
          <th className="w-8 py-2"></th><th>구분</th><th>제품명</th><th>용량</th><th>유형</th><th>SKU·가격</th><th>색</th><th className="text-right">관리</th>
        </tr></thead>
        <tbody>
          {(products ?? []).map((p: any) => (
            <tr key={p.slug} className="border-b align-top">
              <td className="py-3"><input type="checkbox" className="bulk-prod mt-1" value={p.slug} /></td>
              <td className="py-3"><span className={`rounded-full px-2 py-0.5 text-xs ${p.is_b2b_only ? "bg-amber-100 text-amber-800" : "bg-neutral-100 text-neutral-600"}`}>{p.is_b2b_only ? "도매" : "소비자"}</span></td>
              <td className="py-3"><Link href={`/admin/products/${p.slug}`} className="hover:underline">{p.title_ko}</Link></td>
              <td className="text-xs text-neutral-600">{p.weight_g ? `${p.weight_g}g` : "-"}</td>
              <td>{p.product_type}</td>
              <td className="text-xs">{(p.product_variant ?? []).map((v: any) => `${v.sku} · ₩${v.base_price.toLocaleString()}`).join("  /  ")}</td>
              <td>{p.key_color && <span className="inline-block h-4 w-4 rounded-full align-middle" style={{ background: p.key_color }} />}</td>
              <td className="text-right">
                <div className="inline-flex items-center gap-2">
                  <Link href={`/admin/products/${p.slug}`} className="rounded border px-3 py-1 text-xs hover:bg-neutral-100">수정</Link>
                  <form action={duplicateProductAction}>
                    <input type="hidden" name="slug" value={p.slug} />
                    <button className="rounded border px-3 py-1 text-xs hover:bg-neutral-100" title="전체 내용 복제 후 수정 화면으로">복제</button>
                  </form>
                  {showArchived ? (
                    <form action={restoreProductAction}>
                      <input type="hidden" name="slug" value={p.slug} />
                      <button className="rounded border px-3 py-1 text-xs hover:bg-neutral-100">복구</button>
                    </form>
                  ) : (
                    <form action={archiveProductAction}>
                      <input type="hidden" name="slug" value={p.slug} />
                      <button className="rounded border px-3 py-1 text-xs hover:bg-neutral-100" title="보관함으로 이동(스토어프론트 숨김·복구 가능)">보관</button>
                    </form>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {(products ?? []).length === 0 && (
        <p className="mt-8 text-center text-sm text-neutral-400">{showArchived ? "보관된 제품이 없습니다." : "등록된 제품이 없습니다."}</p>
      )}
    </main>
  );
}
