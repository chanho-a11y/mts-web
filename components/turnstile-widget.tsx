"use client";
import Script from "next/script";
import { useEffect, useRef } from "react";

// Cloudflare Turnstile 위젯 (가입 봇 차단, D-091).
// 렌더되면 폼 제출 시 hidden input `cf-turnstile-response` 가 자동 포함된다 —
// 서버 액션에서 verifyTurnstile(formData.get("cf-turnstile-response"))로 검증.
// NEXT_PUBLIC_TURNSTILE_SITE_KEY 미설정이면 아무것도 렌더하지 않는다(서버 검증도 함께 꺼짐).
//
// D-160 수정 두 가지(키를 처음 넣은 2026-11-09 배포에서 드러남, 롤백 후 수정):
//  1) 스크립트 주소가 /turnstile/api.js(404)였다. 정식 주소는 /turnstile/v0/api.js.
//  2) 자동 렌더(class="cf-turnstile")는 스크립트가 처음 실행될 때 한 번만 화면을 훑는다.
//     로그인 화면에 갔다가 가입 화면으로 돌아오는 SPA 이동에서는 위젯이 안 그려져 가입이 막힌다.
//     → render=explicit 로 바꾸고 마운트될 때마다 직접 그린다.
type TurnstileApi = { render: (el: HTMLElement, opts: Record<string, unknown>) => string };

export default function TurnstileWidget({ locale = "ko" }: { locale?: string }) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const ref = useRef<HTMLDivElement>(null);

  const draw = () => {
    const ts = (window as unknown as { turnstile?: TurnstileApi }).turnstile;
    const el = ref.current;
    if (!siteKey || !ts || !el || el.childElementCount > 0) return;
    ts.render(el, { sitekey: siteKey, language: locale, theme: "light" });
  };

  // 스크립트가 이미 로드된 상태로 다시 마운트되는 경우(SPA 이동)
  useEffect(draw, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!siteKey) return null;
  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onReady={draw} />
      <div ref={ref} />
    </>
  );
}
