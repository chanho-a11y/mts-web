import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const TRIGGER: Record<string, string> = { new_product: "신규 제품 안내", abandoned_cart: "중단된 결제 리마인드" };

export default async function AdminEmailPage() {
  const supabase = createClient();
  const { data: autos } = await supabase.from("email_automation").select("*").order("trigger");
  return (
    <main className="max-w-2xl">
      <h1 className="mb-2 text-2xl font-bold">이메일 · 자동화</h1>
      <p className="mb-5 text-sm text-neutral-500">Gmail 연동(OAuth) 후 활성화됩니다. 자동화 규칙·지연시간은 설정돼 있습니다.</p>
      <table className="w-full text-sm">
        <thead><tr className="border-b text-left text-neutral-500"><th className="py-2">트리거</th><th>지연</th><th>대상</th><th>상태</th></tr></thead>
        <tbody>
          {(autos ?? []).map((a: any) => (
            <tr key={a.id} className="border-b">
              <td className="py-2">{TRIGGER[a.trigger] ?? a.trigger}</td>
              <td>{a.delay_hours}시간 후</td>
              <td>{a.segment}</td>
              <td>{a.is_active ? "활성" : "대기(연동 필요)"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-4 text-xs text-neutral-400">신규 제품 12시간 후 · 중단 결제 5시간 후 자동발송 규칙 준비됨. 발송 엔진은 Gmail 연동 + Vercel Cron에서 구동.</p>
    </main>
  );
}
