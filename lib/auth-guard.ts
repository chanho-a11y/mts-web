import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * C-2: 관리자 Server Action 인가 가드.
 *
 * `app/admin/layout.tsx` 의 admin 체크는 **페이지 렌더링 경로에만** 적용된다.
 * Next.js Server Action 은 action ID 로 직접 호출되는 POST 엔드포인트라 layout 을 거치지 않으므로,
 * 액션 자신이 권한을 확인하지 않으면 무방비다.
 *
 * · `createClient()`(사용자 세션) 로 쓰는 액션은 RLS 가 2차 방어선이 되지만,
 * · `createAdminClient()`(service-role) 는 **RLS 를 우회**하므로 이 가드가 유일한 방어선이다.
 *
 * 모든 관리자 서버 액션은 첫 줄에서 이 함수들 중 하나를 호출한다.
 */

/** 현재 세션 사용자가 admin 이면 User 를, 아니면 null 을 반환. */
export async function getAdminUser(): Promise<User | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: prof } = await supabase
    .from("profiles").select("role").eq("id", user.id).maybeSingle();
  return prof?.role === "admin" ? user : null;
}

export async function isAdminUser(): Promise<boolean> {
  return (await getAdminUser()) !== null;
}

/**
 * 관리자가 아니면 예외를 던져 액션 실행 자체를 중단한다.
 * (redirect 대신 throw — 비관리자에게 관리자 경로의 동작을 노출하지 않기 위함)
 */
export async function requireAdmin(): Promise<User> {
  const user = await getAdminUser();
  if (!user) throw new Error("forbidden: admin only");
  return user;
}

/**
 * 값을 반환하는 액션용 — throw 대신 실패 결과를 돌려주고 싶을 때.
 * 반환 형태는 호출부의 기존 계약({ ok, message })에 맞춘다.
 */
export async function guardAdminResult(): Promise<{ ok: false; message: string } | null> {
  if (await isAdminUser()) return null;
  return { ok: false, message: "관리자 권한이 필요합니다." };
}
