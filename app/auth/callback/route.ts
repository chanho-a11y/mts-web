import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// OAuth(카카오 등) 콜백 — 인가코드(PKCE)를 세션으로 교환한 뒤 리다이렉트한다.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const nextParam = url.searchParams.get("next") || "/account";
  // open-redirect 방지: 내부 경로만 허용
  const next = nextParam.startsWith("/") ? nextParam : "/account";

  // 멀티 도메인(mtspace.coffee / normcorecoffee.com) 대응: 원 요청 호스트 기준으로 절대경로 생성
  const forwardedHost = req.headers.get("x-forwarded-host");
  const proto = req.headers.get("x-forwarded-proto") || url.protocol.replace(":", "");
  const origin = forwardedHost ? `${proto}://${forwardedHost}` : url.origin;

  const oauthError = url.searchParams.get("error_description") || url.searchParams.get("error");
  if (oauthError) {
    return NextResponse.redirect(`${origin}/account/login?error=${encodeURIComponent(oauthError)}`);
  }

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    return NextResponse.redirect(`${origin}/account/login?error=${encodeURIComponent(error.message)}`);
  }

  return NextResponse.redirect(
    `${origin}/account/login?error=${encodeURIComponent("소셜 로그인에 실패했습니다. 다시 시도해 주세요.")}`,
  );
}
