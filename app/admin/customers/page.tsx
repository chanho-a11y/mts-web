import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { addCustomerAction, updateCustomerAction, archiveCustomerAction, deleteCustomerAction, importCustomersAction } from "./actions";

export const dynamic = "force-dynamic";
const ROLE: Record<string, string> = { individual: "개인", business: "사업자", influencer: "인플루언서", admin: "관리자" };

export default async function AdminCustomersPage({ searchParams }: { searchParams: { show?: string; imported?: string; failed?: string; error?: string; added?: string; updated?: string; deleted?: string; archived_instead?: string } }) {
  const supabase = createClient();
  const showArchived = searchParams.show === "archived";

  const { data: customers } = await supabase
    .from("profiles")
    .select("id,name,email,phone,role,archived,must_change_password,business_accounts!business_accounts_profile_id_fkey(company_name,status)")
    .eq("archived", showArchived)
    .order("created_at", { ascending: false })
    .limit(500);

  // 사업자 고객별 개별단가 개수
  const { data: cvp } = await supabase.from("customer_variant_prices").select("profile_id");
  const priceCount = new Map<string, number>();
  for (const r of cvp ?? []) priceCount.set(r.profile_id, (priceCount.get(r.profile_id) ?? 0) + 1);

  const input = "rounded border px-3 py-2 text-sm";
  return (
    <main className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">고객 관리</h1>
        <div className="flex gap-2 text-sm">
          <Link href="/admin/customers" className={`rounded border px-3 py-1 ${!showArchived ? "bg-black text-white" : ""}`}>활성</Link>
          <Link href="/admin/customers?show=archived" className={`rounded border px-3 py-1 ${showArchived ? "bg-black text-white" : ""}`}>보관함</Link>
          <Link href="/admin/business" className="rounded border px-3 py-1 hover:bg-neutral-50">사업자 승인 →</Link>
        </div>
      </div>

      {searchParams.error && <p className="rounded bg-red-50 px-4 py-2 text-sm text-red-600">{searchParams.error}</p>}
      {searchParams.imported && <p className="rounded bg-green-50 px-4 py-2 text-sm text-green-700">임포트 완료: {searchParams.imported}건 추가{searchParams.failed && searchParams.failed !== "0" ? ` · 실패 ${searchParams.failed}건` : ""}</p>}
      {searchParams.added && <p className="rounded bg-green-50 px-4 py-2 text-sm text-green-700">고객이 추가되었습니다.</p>}
      {searchParams.updated && <p className="rounded bg-green-50 px-4 py-2 text-sm text-green-700">고객 정보가 저장되었습니다.</p>}
      {searchParams.deleted && <p className="rounded bg-green-50 px-4 py-2 text-sm text-green-700">고객이 완전 삭제되었습니다.</p>}
      {searchParams.archived_instead && <p className="rounded bg-amber-50 px-4 py-2 text-sm text-amber-700">주문 이력이 있어 완전 삭제 대신 <b>보관</b> 처리했습니다. (보관함에서 확인·복원 가능)</p>}

      {/* 추가 + 임포트 */}
      <div className="grid gap-4 md:grid-cols-2">
        <form action={addCustomerAction} className="rounded-xl border p-4">
          <h2 className="mb-3 text-sm font-bold">고객 추가</h2>
          <div className="grid grid-cols-2 gap-2">
            <input name="email" type="email" required placeholder="이메일" className={input} />
            <input name="name" placeholder="이름" className={input} />
            <input name="phone" placeholder="연락처" className={input} />
            <select name="role" className={input}><option value="individual">개인</option><option value="business">사업자</option></select>
          </div>
          <p className="mt-2 text-xs text-neutral-400">초기 비밀번호 <b>0000</b> · 첫 로그인 시 변경 필요</p>
          <button className="mt-3 rounded-full bg-black px-4 py-1.5 text-sm text-white">추가</button>
        </form>

        <form action={importCustomersAction} className="rounded-xl border p-4">
          <h2 className="mb-3 text-sm font-bold">엑셀(CSV) 임포트</h2>
          <input name="file" type="file" accept=".csv,text/csv" required className="block w-full text-sm" />
          <p className="mt-2 text-xs text-neutral-400">첨부 양식과 동일 컬럼. 각 행이 <b>사업자 고객</b>(비번 0000)으로 추가됩니다.</p>
          <div className="mt-3 flex items-center gap-3">
            <button className="rounded-full bg-black px-4 py-1.5 text-sm text-white">임포트</button>
            <a href="/api/customers/template" className="text-xs text-clayDeep underline">양식 다운로드</a>
          </div>
        </form>
      </div>

      {/* 목록 */}
      <table className="w-full text-sm">
        <thead><tr className="border-b text-left text-neutral-500">
          <th className="py-2">구분</th><th>이름 / 상호</th><th>이메일</th><th>연락처</th><th>단가</th><th></th>
        </tr></thead>
        <tbody>
          {(customers ?? []).map((c: any) => {
            const isBiz = c.role === "business";
            const pc = priceCount.get(c.id) ?? 0;
            return (
              <tr key={c.id} className="border-b align-top">
                <td className="py-3">
                  <span title={ROLE[c.role] ?? c.role}>{isBiz ? "🏢" : c.role === "individual" ? "👤" : "★"}</span>
                  <span className="ml-1 text-xs text-neutral-500">{ROLE[c.role] ?? c.role}</span>
                  {c.must_change_password && <span className="ml-1 rounded bg-amber-100 px-1 text-[10px] text-amber-700">비번변경대기</span>}
                </td>
                <td className="py-3">
                  <form action={updateCustomerAction} className="flex flex-wrap items-center gap-1">
                    <input type="hidden" name="id" value={c.id} />
                    <input name="name" defaultValue={c.name ?? ""} className="w-28 rounded border px-2 py-1 text-xs" />
                    <select name="role" defaultValue={c.role} className="rounded border px-1 py-1 text-xs"><option value="individual">개인</option><option value="business">사업자</option></select>
                    <input name="phone" defaultValue={c.phone ?? ""} className="w-28 rounded border px-2 py-1 text-xs" />
                    <button className="rounded border px-2 py-1 text-[11px]">저장</button>
                  </form>
                  {isBiz && c.business_accounts?.company_name && <p className="mt-0.5 text-xs text-neutral-400">{c.business_accounts.company_name}</p>}
                </td>
                <td className="py-3">{c.email}</td>
                <td className="py-3">{c.phone || "-"}</td>
                <td className="py-3">
                  {isBiz ? <Link href={`/admin/customers/${c.id}`} className="text-xs underline">구매가 {pc > 0 ? `${pc}건` : "설정"}</Link> : <span className="text-xs text-neutral-300">-</span>}
                </td>
                <td className="py-3 text-right">
                  <div className="flex justify-end gap-1">
                    <form action={archiveCustomerAction}>
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="archived" value={showArchived ? "false" : "true"} />
                      <button className="rounded border px-2 py-1 text-[11px]">{showArchived ? "복원" : "보관"}</button>
                    </form>
                    <form action={deleteCustomerAction}>
                      <input type="hidden" name="id" value={c.id} />
                      <button className="rounded border px-2 py-1 text-[11px] text-red-500">삭제</button>
                    </form>
                  </div>
                </td>
              </tr>
            );
          })}
          {(!customers || customers.length === 0) && <tr><td colSpan={6} className="py-6 text-center text-neutral-400">{showArchived ? "보관된 고객이 없습니다." : "고객이 없습니다."}</td></tr>}
        </tbody>
      </table>
    </main>
  );
}
