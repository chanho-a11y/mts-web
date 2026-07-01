import { createClient } from "@/lib/supabase/server";
import { setUserRoleAction } from "@/app/admin/store/actions";

export const dynamic = "force-dynamic";

// 관리자 역할지정 — 사이트 관리자 하위 메뉴 (구 스토어 정보에서 이동)
export default async function AdminRolesPage() {
  const supabase = createClient();
  const { data: admins } = await supabase.from("profiles").select("name,email,role").eq("role", "admin");
  const input = "rounded border px-2 py-1 text-sm";
  return (
    <main className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">관리자 · 역할 지정</h1>
        <p className="mt-1 text-sm text-neutral-500">사이트 관리자 &gt; 관리자 역할지정. 가입된 사용자의 이메일로 역할을 지정합니다. (일반/기업/인플루언서/관리자)</p>
      </div>

      <section className="rounded-xl border p-5">
        <form action={setUserRoleAction} className="flex flex-wrap items-end gap-2 text-sm">
          <label>이메일<input name="email" type="email" placeholder="user@example.com" className={`mt-1 block ${input} w-64`} /></label>
          <label>역할
            <select name="role" className={`mt-1 block ${input}`}>
              <option value="individual">일반회원</option>
              <option value="business">기업회원</option>
              <option value="influencer">인플루언서</option>
              <option value="admin">관리자</option>
            </select>
          </label>
          <button className="rounded-full bg-black px-4 py-1.5 text-white">적용</button>
        </form>
        <div className="mt-4">
          <p className="mb-1 text-xs font-bold uppercase text-neutral-400">현재 관리자</p>
          <ul className="text-sm">
            {(admins ?? []).map((a) => <li key={a.email}>{a.name || "-"} · {a.email}</li>)}
            {(!admins || admins.length === 0) && <li className="text-neutral-400">없음</li>}
          </ul>
        </div>
      </section>
    </main>
  );
}
