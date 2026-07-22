"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

// 저장 등 성공 시 상단 토스트. 클라이언트(AJAX)에서는 adminToast("...") 호출,
// 서버액션 저장은 리다이렉트에 ?saved=1 (선택: &msg=문구) 을 붙이면 자동 노출.
export function adminToast(msg = "저장되었습니다") {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("mts-toast", { detail: msg }));
}

export default function AdminToast() {
  const searchParams = useSearchParams();
  const [msg, setMsg] = useState<string | null>(null);

  // useSearchParams 구독 → 서버액션 redirect(소프트 내비게이션)에서도 ?saved=1 감지
  // (기존: mount 시 1회만 location.search 를 읽어, 저장 후 토스트가 뜨지 않던 버그)
  useEffect(() => {
    if (!searchParams.get("saved")) return;
    setMsg(searchParams.get("msg") || "저장되었습니다");
    const p = new URLSearchParams(searchParams.toString());
    p.delete("saved");
    p.delete("msg");
    const q = p.toString();
    window.history.replaceState(null, "", window.location.pathname + (q ? `?${q}` : ""));
  }, [searchParams]);

  useEffect(() => {
    const onEvt = (e: Event) => setMsg((e as CustomEvent).detail || "저장되었습니다");
    window.addEventListener("mts-toast", onEvt);
    return () => window.removeEventListener("mts-toast", onEvt);
  }, []);

  useEffect(() => {
    if (!msg) return;
    const timer = setTimeout(() => setMsg(null), 2200);
    return () => clearTimeout(timer);
  }, [msg]);

  if (!msg) return null;
  return (
    <div
      role="status"
      className="fixed left-1/2 top-4 z-[100] -translate-x-1/2 rounded-full bg-ink px-5 py-2.5 text-sm text-oat shadow-lg"
      style={{ animation: "mtsToastIn .2s ease-out" }}
    >
      {msg}
      <style dangerouslySetInnerHTML={{ __html: "@keyframes mtsToastIn{from{opacity:0;transform:translate(-50%,-8px)}to{opacity:1;transform:translate(-50%,0)}}" }} />
    </div>
  );
}
