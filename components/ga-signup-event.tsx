"use client";
import { useEffect } from "react";

// D-146: 회원가입 완료 전환 계측. signUpAction 이 /account?signup=<role> 로 보내면
// GA4 권장 이벤트 sign_up(method=email, customer_type=individual|business)을 한 번만 보내고
// 주소의 signup 표시를 지운다(새로고침, 뒤로가기로 중복 집계되지 않도록).
// GA 스크립트는 afterInteractive 로 늦게 뜨므로 최대 5초까지 gtag 를 기다린다.
type Gtag = (...args: unknown[]) => void;

export default function GaSignupEvent({ customerType }: { customerType: "individual" | "business" }) {
  useEffect(() => {
    let tries = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const strip = () => {
      try {
        const url = new URL(window.location.href);
        if (!url.searchParams.has("signup")) return;
        url.searchParams.delete("signup");
        window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
      } catch {
        // 주소 정리 실패는 무시한다
      }
    };
    const send = () => {
      try {
        const gtag = (window as unknown as { gtag?: Gtag }).gtag;
        if (typeof gtag === "function") {
          gtag("event", "sign_up", { method: "email", customer_type: customerType });
          strip();
          return;
        }
      } catch {
        // 계측 실패가 화면을 막으면 안 된다
      }
      if (tries++ < 25) timer = setTimeout(send, 200);
      else strip();
    };
    send();
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [customerType]);
  return null;
}
