import { createClient } from "@/lib/supabase/server";
import { createPromotionAction, togglePromotionAction } from "@/app/admin/marketing/actions";

export const dynamic = "force-dynamic";

export default async function AdminMarketingPage() {
  const supabase = createClient();
  const { data: promos } = await supabase.from("promotion").select("*").order("created_at", { ascending: false });
  const input = "mt-1 w-full rounded border px-3 py-2 text-sm";
  return (
    <main className="space-y-8">
      <h1 className="text-2xl font-bold">마케팅 · 프로모션</h1>

      <section className="rounded-xl border p-5">
        <h2 className="mb-3 font-bold">프로모션 생성</h2>
        <form action={createPromotionAction} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">제목<input name="title" required className={input} /></label>
            <label className="text-sm">유형<select name="kind" className={input}><option value="general">일반</option><option value="influencer">인플루언서</option></select></label>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <label className="text-sm">할인 방식<select name="discount_type" className={input}><option value="percent">%</option><option value="fixed">정액(원)</option></select></label>
            <label className="text-sm">값<input type="number" name="value" className={input} /></label>
            <label className="text-sm">코드(인플루언서)<input name="code" className={input} /></label>
          </div>
          <label className="block text-sm">상단 배너 문구<input name="banner_message" className={input} placeholder="예: 첫 구매 10% 할인" /></label>
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="text-neutral-500">노출 위치:</span>
            <label className="flex items-center gap-1"><input type="checkbox" name="pl_banner" /> 상단 배너</label>
            <label className="flex items-center gap-1"><input type="checkbox" name="pl_popup" /> 팝업</label>
            <label className="flex items-center gap-1"><input type="checkbox" name="pl_main" /> 메인</label>
            <label className="flex items-center gap-1"><input type="checkbox" name="pl_shop" /> 쇼핑 섹션</label>
          </div>
          <button className="rounded-full bg-black px-5 py-2 text-sm text-white">생성</button>
        </form>
      </section>

      <section>
        <h2 className="mb-3 font-bold">프로모션 목록</h2>
        <table className="w-full text-sm">
          <thead><tr className="border-b text-left text-neutral-500"><th className="py-2">제목</th><th>할인</th><th>노출</th><th>상태</th><th></th></tr></thead>
          <tbody>
            {(promos ?? []).map((p: any) => (
              <tr key={p.id} className="border-b">
                <td className="py-2">{p.title}{p.code && <span className="ml-1 text-xs text-neutral-400">[{p.code}]</span>}</td>
                <td>{p.discount_type === "percent" ? `${p.value}%` : `${p.value.toLocaleString()}원`}</td>
                <td className="text-xs">{(p.placements ?? []).join(", ")}</td>
                <td>{p.is_active ? "활성" : "비활성"}</td>
                <td className="text-right">
                  <form action={togglePromotionAction}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="active" value={String(p.is_active)} />
                    <button className="text-xs underline">{p.is_active ? "끄기" : "켜기"}</button>
                  </form>
                </td>
              </tr>
            ))}
            {(!promos || promos.length === 0) && <tr><td colSpan={5} className="py-6 text-center text-neutral-400">프로모션이 없습니다.</td></tr>}
          </tbody>
        </table>
      </section>

      <section className="rounded-xl border p-5">
        <h2 className="mb-2 font-bold">메타 쇼핑 · 구글 머천트 연결</h2>
        <p className="mb-2 text-sm text-neutral-600">아래 상품 피드 URL을 Meta 커머스 관리자(카탈로그 → 데이터 피드) 또는 Google Merchant Center에 등록하면 상품이 자동 동기화됩니다.</p>
        <code className="block rounded bg-neutral-100 px-3 py-2 text-xs">https://mtspace.coffee/feed/shopping.xml</code>
        <p className="mt-2 text-xs text-neutral-400">RSS 2.0 + g: 네임스페이스(Meta·Google 공용). 30분 캐시. 활성·재고 상품만 포함.</p>
      </section>
    </main>
  );
}
