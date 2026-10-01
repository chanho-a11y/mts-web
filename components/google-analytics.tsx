import Script from "next/script";
import GaIdentity from "@/components/ga-identity";

// Google Analytics 4 연동.
// 환경변수 NEXT_PUBLIC_GA_ID (예: G-XXXXXXXXXX) 설정 시 자동 활성화됩니다.
// 측정 ID가 없으면 아무것도 렌더링하지 않습니다.
//
// 방문자 구분(2026-10-01, D-128):
// - 로그인 회원은 user_id(profiles.id UUID, 개인정보 아님)와 사용자 속성 customer_type(admin/business/individual)을 보낸다.
//   비로그인 방문자는 둘 다 보내지 않는다.
// - 관리자 로그인 상태이거나, 이 브라우저에서 ?ga_internal=1 로 한 번 접속한 기기는 traffic_type=internal 을 보낸다.
//   GA4 데이터 필터 "Internal Traffic"이 이 값을 기준으로 내부 접속을 걸러낸다. 해제는 ?ga_internal=0.
// - traffic_type 은 첫 page_view 에 실려야 하므로 config 호출 전에 결정한다.
export default function GoogleAnalytics({ userId, role }: { userId?: string | null; role?: string | null }) {
  const id = process.env.NEXT_PUBLIC_GA_ID;
  if (!id) return null;
  const init = {
    userId: userId ?? null,
    role: role ?? null,
  };
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${id}`} strategy="afterInteractive" />
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
(function(){
  var v = ${JSON.stringify(init)};
  var internal = v.role === 'admin';
  try {
    var q = new URLSearchParams(location.search).get('ga_internal');
    if (q === '1') localStorage.setItem('mts_ga_internal', '1');
    if (q === '0') localStorage.removeItem('mts_ga_internal');
    if (localStorage.getItem('mts_ga_internal') === '1') internal = true;
  } catch (e) {}
  var cfg = {};
  if (internal) cfg.traffic_type = 'internal';
  if (v.userId) {
    cfg.user_id = v.userId;
    gtag('set', 'user_properties', { customer_type: v.role || 'individual' });
  }
  gtag('config', '${id}', cfg);
})();`}
      </Script>
      <GaIdentity measurementId={id} userId={init.userId} role={init.role} />
    </>
  );
}
