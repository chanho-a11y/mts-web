"use client";
import { useEffect, useRef } from "react";

// 로그인·로그아웃이 전체 새로고침 없이 일어나면 ga4-init 스크립트는 다시 실행되지 않는다.
// 서버 레이아웃이 새 userId/role 을 내려줄 때만 GA4 식별 정보를 갱신한다.
// 첫 렌더는 ga4-init 이 이미 처리했으므로 건너뛴다(page_view 중복 방지).
type Gtag = (...args: unknown[]) => void;

export default function GaIdentity({
  measurementId,
  userId,
  role,
}: {
  measurementId: string;
  userId: string | null;
  role: string | null;
}) {
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const gtag = (window as unknown as { gtag?: Gtag }).gtag;
    if (typeof gtag !== "function") return;
    if (userId) {
      gtag("set", "user_properties", { customer_type: role || "individual" });
      gtag("config", measurementId, { user_id: userId, send_page_view: false, ...(role === "admin" ? { traffic_type: "internal" } : {}) });
    } else {
      gtag("config", measurementId, { user_id: null, send_page_view: false });
    }
  }, [measurementId, userId, role]);
  return null;
}
