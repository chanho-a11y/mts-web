// Cloudflare Turnstile 서버 검증 (가입 봇 차단, D-091).
// 배경: 2026-07-26~28 가입 폼 자동화 봇 유입(랜덤 문자열 이름/주소, 해외 이메일, 가입 폭탄 패턴).
// 가입이 admin.createUser(자동확인) 경로라 Supabase 대시보드 CAPTCHA 설정으로는 막을 수 없어
// 서버 액션에서 직접 토큰을 검증한다.
//
// 동작: TURNSTILE_SECRET_KEY 미설정이면 검증을 건너뛴다(키 배포 전 가입 중단 방지).
// 설정돼 있으면 토큰 누락·실패 시 false → 호출부에서 가입 거절.

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export const turnstileEnabled = !!process.env.TURNSTILE_SECRET_KEY;

export async function verifyTurnstile(token: string | null | undefined): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // 미설정 = 비활성 (배포 순서 보호)
  if (!token) return false;
  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
      // 검증 API 지연이 가입을 무한 대기시키지 않도록 제한
      signal: AbortSignal.timeout(5000),
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    // 검증 API 장애 시: 실제 고객 가입을 막는 것보다 통과가 낫다(fail-open).
    // 봇 차단이 뚫리는 건 일시적이지만, 가입 불가는 즉시 매출 손실이다.
    return true;
  }
}
