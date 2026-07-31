"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * 동의 화면의 승인/거부 처리.
 *
 * Supabase 는 동의 UI 를 제공하지 않는다. 인가 요청이 들어오면
 * `<Site URL><Authorization Path>?authorization_id=...` 로 사용자를 보내고,
 * 우리가 approve/deny 를 호출해 받은 redirect_url 로 되돌려보내야 한다.
 *
 * ⚠️ skipBrowserRedirect: true 가 필수다.
 *    기본값(false)은 SDK 가 브라우저를 직접 이동시키려 하는데, 서버 액션에는 브라우저가 없다.
 *    true 로 두고 redirect_url 을 받아 서버에서 리다이렉트한다.
 *
 * ⚠️ 이 파일은 "use server" 라 async export 만 둘 수 있다(docs/03_standards.md §11).
 */

function message(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error);
}

/** 승인 → 인가서버가 돌려준 redirect_url. 호출자가 리다이렉트한다. */
export async function approveAuthorization(authorizationId: string): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.oauth.approveAuthorization(authorizationId, {
    skipBrowserRedirect: true,
  });
  if (error) throw new Error(message(error));
  if (!data?.redirect_url) throw new Error("인가서버가 redirect_url 을 돌려주지 않았습니다.");
  return data.redirect_url;
}

/** 거부 → redirect_url(access_denied 포함). 없으면 홈으로 보낸다. */
export async function denyAuthorization(authorizationId: string): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.oauth.denyAuthorization(authorizationId, {
    skipBrowserRedirect: true,
  });
  if (error) throw new Error(message(error));
  return data?.redirect_url ?? "/";
}
