"use server";
import { createClient } from "@/lib/supabase/server";

// M-5: 이메일 형식/길이 검증 + 허니팟(company_url)으로 익명 구독 스팸 완화.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type NewsletterState = { ok: boolean; msg: string };

// EN 사이트 구독 폼은 hidden locale=en 을 보낸다.
const MSG = {
  ko: { done: "구독이 완료되었습니다. 감사합니다!", bad: "올바른 이메일 주소를 입력해 주세요.", dup: "이미 구독 중인 이메일입니다.", retry: "잠시 후 다시 시도해 주세요." },
  en: { done: "You're subscribed. Thank you!", bad: "Please enter a valid email address.", dup: "This email is already subscribed.", retry: "Something went wrong. Please try again shortly." },
};

export async function subscribeNewsletterAction(
  _prev: NewsletterState,
  formData: FormData,
): Promise<NewsletterState> {
  const m = MSG[formData.get("locale") === "en" ? "en" : "ko"];
  // 허니팟: 봇이 채우면 성공처럼 응답(정체 숨김)하고 실제 저장은 생략.
  if (String(formData.get("company_url") || "").trim() !== "") {
    return { ok: true, msg: m.done };
  }
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    return { ok: false, msg: m.bad };
  }
  const supabase = createClient();
  const { error } = await supabase.from("newsletter_subscriber").insert({ email }).select();
  if (error) {
    // 이미 구독한 이메일(unique 위반)은 성공으로 간주.
    if ((error as { code?: string }).code === "23505") {
      return { ok: true, msg: m.dup };
    }
    return { ok: false, msg: m.retry };
  }
  return { ok: true, msg: m.done };
}
