import Script from "next/script";

// Google Analytics 4 연동 자리(placeholder).
// 환경변수 NEXT_PUBLIC_GA_ID (예: G-XXXXXXXXXX) 설정 시 자동 활성화됩니다.
// 측정 ID가 없으면 아무것도 렌더링하지 않습니다.
export default function GoogleAnalytics() {
  const id = process.env.NEXT_PUBLIC_GA_ID;
  if (!id) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${id}`} strategy="afterInteractive" />
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${id}');`}
      </Script>
    </>
  );
}
