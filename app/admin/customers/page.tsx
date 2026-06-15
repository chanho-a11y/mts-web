import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const ROLE: Record<string, string> = { individual: "일반", business: "기업", influencer: "인플루언서", admin: "관리자" };

export default async function AdminCustomersPage() {
  const supabase = createClient();
  const { data: customers } = await supabase
    .from("profiles")
    .select("id,name,email,phone,role,business_accounts(company_name,status)")
    .order("created_at", { ascending: false })
    .limit(200);
  return (
    <main>
      <h1 className="mb-6 text-2xl font-bold">고객 관리</h1>
      <table className="w-full text-sm">
        <thead><tr className="border-b text-left text-neutral-500"><th className="py-2">이름</th><th>이메일</th><th>등급</th><th>상호</th><th></th></tr></thead>
        <tbody>
          {(customers ?? []).map((c: any) => (
            <tr key={c.id} className="border-b">
              <td className="py-3">{c.name || "-"}</td>
              <td>{c.email}</td>
              <td>{ROLE[c.role] ?? c.role}</td>
              <td>{c.business_accounts?.company_name ?? "-"}</td>
              <td className="text-right"><Link href={`/admin/customers/${c.id}`} className="text-xs underline">단가·내역</Link></td>
            </tr>
          ))}
          {(!customers || customers.length === 0) && <tr><td colSpan={5} className="py-6 text-center text-neutral-400">고객이 없습니다.</td></tr>}
        </tbody>
      </table>
    </main>
  );
}
