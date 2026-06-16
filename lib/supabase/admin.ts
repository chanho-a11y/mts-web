import { createClient as createSb } from "@supabase/supabase-js";

// 서버 전용 service-role 클라이언트 (RLS 우회). 게스트 주문 등에 사용.
// SUPABASE_SERVICE_ROLE_KEY 가 설정돼야 동작.
export const hasServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

export function createAdminClient() {
  return createSb(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
