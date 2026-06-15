import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOutAction } from "@/app/account/actions";

export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<string, string> = {
  individual: "일반 회원", business: "기업 회원", influencer: "인플루언서", admin: "관리자",
};

export default async function AccountPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/account/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("name,email,phone,role,language,marketing_opt_in")
    .eq("id", user.id)
    .maybeSingle();

  const { data: biz } = await supabase
    .from("business_accounts")
    .select("company_name,biz_reg_no,status")
    .eq("profile_id", user.id)
    .maybeSingle();

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">마이페이지</h1>
        <form action={signOutAction}>
          <button className="rounded border px-4 py-1.5 text-sm">로그아웃</button>
        </form>
      </div>

      <section className="mt-6 rounded-xl border p-5 text-sm">
        <h2 className="mb-3 font-bold">회원 정보</h2>
        <dl className="space-y-2">
          <Row k="이름" v={profile?.name} />
          <Row k="이메일" v={profile?.email ?? user.email} />
          <Row k="전화번호" v={profile?.phone} />
          <Row k="등급" v={ROLE_LABEL[profile?.role ?? "individual"]} />
          <Row k="사용 언어" v={profile?.language === "en" ? "English" : "한국어"} />
          <Row k="마케팅 수신" v={profile?.marketing_opt_in ? "동의" : "미동의"} />
        </dl>
      </section>

      {biz && (
        <section className="mt-4 rounded-xl border p-5 text-sm">
          <h2 className="mb-3 font-bold">사업자 정보</h2>
          <dl className="space-y-2">
            <Row k="상호" v={biz.company_name} />
            <Row k="사업자번호" v={biz.biz_reg_no} />
            <Row k="승인 상태" v={biz.status === "approved" ? "승인됨 (도매가 적용)" : biz.status === "pending" ? "승인 대기 중" : "반려"} />
          </dl>
        </section>
      )}

      <section className="mt-4 rounded-xl border p-5 text-sm text-neutral-500">
        <h2 className="mb-2 font-bold text-black">구매 내역</h2>
        주문 기능(P3)·재주문은 다음 단계에서 연결됩니다.
      </section>
    </main>
  );
}

function Row({ k, v }: { k: string; v?: string | null }) {
  return (
    <div className="flex gap-4">
      <dt className="w-24 shrink-0 text-neutral-500">{k}</dt>
      <dd>{v || "-"}</dd>
    </div>
  );
}
