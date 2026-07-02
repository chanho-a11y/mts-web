import { createClient } from "@/lib/supabase/server";
import { createPromotionAction, togglePromotionAction } from "@/app/admin/marketing/actions";

export const dynamic = "force-dynamic";

export default async function AdminMarketingPage() {
  const supabase = createClient();
  const { data: promos } = await supabase.from("promotion").select("*").order("created_at", { ascending: false });
  const input = "mt-1 w-full rounded border px-3 py-2 text-sm";

  // 연동 상태(환경변수 기반). 피드 방식은 키 없이도 동작(URL 등록만).
  const conn = {
    resend: !!process.env.RESEND_API_KEY,
    emailFrom: process.env.EMAIL_FROM || "",
    metaToken: !!process.env.META_ACCESS_TOKEN && !!process.env.META_CATALOG_ID,
    googleMerchant: !!process.env.GOOGLE_MERCHANT_ID,
  };
  const Badge = ({ ok, on, off }: { ok: boolean; on: string; off: string }) => (
    <span className={`rounded-full px-2 py-0.5 text-[11px] ${ok ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>{ok ? on : off}</span>
  );
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

      {/* 연동 대시보드 — 메타 쇼핑 / 구글 머천트 / 이메일 */}
      <section className="space-y-4">
        <h2 className="font-bold">연동 (메타 쇼핑 · 구글 머천트 · 이메일)</h2>

        <div className="rounded-xl border p-5">
          <div className="flex items-center gap-2"><h3 className="font-bold">상품 피드 (Meta · Google 공용)</h3><Badge ok on="피드 준비됨" off="" /></div>
          <p className="mt-2 text-sm text-neutral-600">아래 피드 URL을 등록하면 상품이 자동 동기화됩니다(키 불필요). 활성·재고 상품만, 30분 캐시.</p>
          <code className="mt-2 block rounded bg-neutral-100 px-3 py-2 text-xs">https://mtspace.coffee/feed/shopping.xml</code>
        </div>

        <div className="rounded-xl border p-5">
          <div className="flex items-center gap-2"><h3 className="font-bold">메타(페이스북·인스타그램) 쇼핑</h3><Badge ok={conn.metaToken} on="API 연동됨" off="피드 등록 방식" /></div>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-neutral-600">
            <li>Meta 커머스 관리자 → 카탈로그 → <b>데이터 소스 → 데이터 피드</b>에 위 피드 URL 등록(예약 가져오기: 매일).</li>
            <li>카탈로그를 Instagram Shopping/Facebook Shop에 연결하고, 도메인 인증(<code>mtspace.coffee</code>) 완료.</li>
            <li>(선택) 실시간 API 동기화가 필요하면 <code>META_CATALOG_ID</code>·<code>META_ACCESS_TOKEN</code>을 Vercel env에 추가.</li>
          </ol>
          <p className="mt-2 text-xs text-amber-700">대표 발급 필요: Meta 비즈니스 계정·카탈로그 ID{conn.metaToken ? "" : " (미설정)"} · 도메인 인증 메타태그.</p>
        </div>

        <div className="rounded-xl border p-5">
          <div className="flex items-center gap-2"><h3 className="font-bold">구글 머천트 센터</h3><Badge ok={conn.googleMerchant} on="Merchant ID 설정됨" off="피드 등록 방식" /></div>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-neutral-600">
            <li>Google Merchant Center → <b>제품 → 피드</b>에 위 피드 URL 등록(예약 가져오기).</li>
            <li>웹사이트 소유권 확인 + 배송/세금 설정.</li>
            <li>(선택) Content API 자동 동기화가 필요하면 <code>GOOGLE_MERCHANT_ID</code>·서비스 계정 키를 env에 추가.</li>
          </ol>
          <p className="mt-2 text-xs text-amber-700">대표 발급 필요: Merchant Center 계정{conn.googleMerchant ? "" : " (미설정)"} · 웹사이트 소유권 확인.</p>
        </div>

        <div className="rounded-xl border p-5">
          <div className="flex items-center gap-2"><h3 className="font-bold">이메일 (Resend)</h3><Badge ok={conn.resend} on="API 키 설정됨" off="키 미설정" /></div>
          <p className="mt-2 text-sm text-neutral-600">주문확인·출고알림 등 발송 프로바이더는 <b>Resend</b>입니다. 발송/템플릿은 <a href="/admin/email" className="underline">이메일</a>에서 관리합니다.</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-neutral-600">
            <li>현재 발신주소: <code>{conn.emailFrom || "미설정"}</code> {conn.emailFrom.includes("@mtspace.coffee") ? "" : "(도메인 인증 후 @mtspace.coffee로 전환 권장)"}</li>
            <li>Resend에서 <b>mtspace.coffee 도메인 인증</b>(SPF/DKIM) 후 <code>EMAIL_FROM</code>을 <code>no-reply@mtspace.coffee</code>로 변경.</li>
          </ul>
          <p className="mt-2 text-xs text-amber-700">대표 발급 필요: <code>RESEND_API_KEY</code>{conn.resend ? " (설정됨)" : " (미설정)"} · 도메인 DNS 레코드 등록.</p>
        </div>
        <p className="text-xs text-neutral-400">※ 계정 인증(OAuth)·API 키 발급은 대표님이 진행하시고, 키를 Vercel env에 주입하면 자동 활성화됩니다(결제·이메일과 동일 패턴).</p>
      </section>
    </main>
  );
}
