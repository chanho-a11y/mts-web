"use server";
import { createClient } from "@/lib/supabase/server";

// M-5: 이메일 형식/길이 검증 + 허니팟(company_url)으로 익명 구독 스팸 완화.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type NewsletterState = { ok: boolean; msg: string };

export async function subscribeNewsletterAction(
  _prev: NewsletterState,
  formData: FormData,
): Promise<NewsletterState> {
  // 허니팟: 봇이 채우면 성공처럼 응답(정체 숨김)하고 실제 저장은 생략.
  if (String(formData.get("company_url") || "").trim() !== "") {
    return { ok: true, msg: "구독이 완료되었습니다. 감사합니다!" };
  }
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    return { ok: false, msg: "올바른 이메일 주소를 입력해 주세요." };
  }
  const supabase = createClient();
  const { error } = await supabase.from("newsletter_subscriber").insert({ email }).select();
  if (error) {
    // 이미 구독한 이메일(unique 위반)은 성공으로 간주.
    if ((error as { code?: string }).code === "23505") {
      return { ok: true, msg: "이미 구독 중인 이메일입니다." };
    }
    return { ok: false, msg: "잠시 후 다시 시도해 주세요." };
  }
  return { ok: true, msg: "구독이 완료되었습니다. 감사합니다!" };
}
