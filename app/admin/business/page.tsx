import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { approveBusinessAction } from "@/app/admin/business/actions";

export const dynamic = "force-dynamic";

export default async function AdminBusinessPage() {
  const supabase = createClient();
  const { data: rows } = await supabase
    .from("business_accounts")
    .select("profile_id,company_name,biz_reg_no,representative,tax_invoice_email,status,created_at,biz_reg_file_path")
    .order("created_at", { ascending: false });

  // 사업자등록증(비공개 버킷) 서명 URL 생성 — 관리자만 열람
  const fileUrls: Record<string, string> = {};
  if (hasServiceRole) {
    const admin = createAdminClient();
    for (const r of rows ?? []) {
      if (r.biz_reg_file_path) {
        const { data: signed } = await admin.storage
          .from("business-docs")
          .createSignedUrl(r.biz_reg_file_path, 3600);
        if (signed?.signedUrl) fileUrls[r.profile_id] = signed.signedUrl;
      }
    }
  }

  return (
    <main>
      <h1 className="mb-6 text-2xl font-bold">사업자 승인</h1>
      <table className="w-full text-sm">
        <thead><tr className="border-b text-left text-neutral-500">
          <th className="py-2">상호</th><th>사업자번호</th><th>대표</th><th>등록증</th><th>상태</th><th></th>
        </tr></thead>
        <tbody>
          {(rows ?? []).map((r) => (
            <tr key={r.profile_id} className="border-b">
              <td className="py-3">{r.company_name}</td>
              <td>{r.biz_reg_no}</td>
              <td>{r.representative ?? "-"}</td>
              <td>
                {fileUrls[r.profile_id]
                  ? <a href={fileUrls[r.profile_id]} target="_blank" rel="noreferrer" className="text-clayDeep underline">서류 보기</a>
                  : <span className="text-neutral-400">없음</span>}
              </td>
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
          {(!rows || rows.length === 0) && <tr><td colSpan={6} className="py-6 text-center text-neutral-400">신청 내역이 없습니다.</td></tr>}
        </tbody>
      </table>
    </main>
  );
}
