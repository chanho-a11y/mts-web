import { createClient } from "@/lib/supabase/server";
import { approveBusinessAction } from "@/app/admin/business/actions";

export const dynamic = "force-dynamic";

export default async function AdminBusinessPage() {
  const supabase = createClient();
  const { data: rows } = await supabase
    .from("business_accounts")
    .select("profile_id,company_name,biz_reg_no,representative,tax_invoice_email,status,created_at")
    .order("created_at", { ascending: false });

  return (
    <main>
      <h1 className="mb-6 text-2xl font-bold">사업자 승인</h1>
      <table className="w-full text-sm">
        <thead><tr className="border-b text-left text-neutral-500">
          <th className="py-2">상호</th><th>사업자번호</th><th>대표</th><th>상태</th><th></th>
        </tr></thead>
        <tbody>
          {(rows ?? []).map((r) => (
            <tr key={r.profile_id} className="border-b">
              <td className="py-3">{r.company_name}</td>
              <td>{r.biz_reg_no}</td>
              <td>{r.representative ?? "-"}</td>
              <td>{r.status === "approved" ? "승인" : r.status === "pending" ? "대기" : "반려"}</td>
              <td className="text-right">
                {r.status === "pending" && (
                  <div className="flex justify-end gap-2">
                    <form action={approveBusinessAction}>
                      <input type="hidden" name="profile_id" value={r.profile_id} />
                      <input type="hidden" name="decision" value="approved" />
                      <button className="rounded bg-black px-3 py-1 text-xs text-white">승인</button>
                    </form>
                    <form action={approveBusinessAction}>
                      <input type="hidden" name="profile_id" value={r.profile_id} />
                      <input type="hidden" name="decision" value="rejected" />
                      <button className="rounded border px-3 py-1 text-xs">반려</button>
                    </form>
                  </div>
                )}
              </td>
            </tr>
          ))}
          {(!rows || rows.length === 0) && <tr><td colSpan={5} className="py-6 text-center text-neutral-400">신청 내역이 없습니다.</td></tr>}
        </tbody>
      </table>
    </main>
  );
}
