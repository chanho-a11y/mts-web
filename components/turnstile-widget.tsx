"use client";
import Script from "next/script";

// Cloudflare Turnstile 위젯 (가입 봇 차단, D-091).
// 렌더되면 폼 제출 시 hidden input `cf-turnstile-response` 가 자동 포함된다 —
// 서버 액션에서 verifyTurnstile(formData.get("cf-turnstile-response"))로 검증.
// NEXT_PUBLIC_TURNSTILE_SITE_KEY 미설정이면 아무것도 렌더하지 않는다(서버 검증도 함께 꺼짐).
export default function TurnstileWidget({ locale = "ko" }: { locale?: string }) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  if (!siteKey) return null;
  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/api.js" strategy="lazyOnload" />
      <div className="cf-turnstile" data-sitekey={siteKey} data-language={locale} data-theme="light" />
    </>
  );
}
