"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// 카카오 소셜 로그인/가입 버튼 (개인 회원 전용).
// 성공 시 브라우저가 카카오로 이동하고, /auth/callback 에서 세션으로 교환된다.
export default function KakaoLoginButton({ label, next = "/account" }: { label: string; next?: string }) {
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function start() {
    setErr(null);
    setLoading(true);
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: { redirectTo },
    });
    // 이 아래는 시작 자체가 실패했을 때만 실행됨(성공 시 이미 리다이렉트)
    if (error) {
      setErr(error.message);
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={start}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-[#FEE500] py-3 text-sm font-medium text-[#191600] transition hover:brightness-95 disabled:opacity-60"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <path
            fill="#191600"
            d="M9 1.6C4.86 1.6 1.5 4.19 1.5 7.38c0 2.06 1.37 3.87 3.44 4.94-.15.54-.55 1.98-.63 2.29-.1.38.14.37.29.27.12-.08 1.86-1.26 2.62-1.78.42.06.85.09 1.28.09 4.14 0 7.5-2.59 7.5-5.8C16 4.19 12.64 1.6 9 1.6Z"
          />
        </svg>
        {label}
      </button>
      {err && <p className="mt-2 text-center text-xs text-red-600">{err}</p>}
    </div>
  );
}
