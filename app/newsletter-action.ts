"use server";
import { createClient } from "@/lib/supabase/server";

// M-5: 이메일 형식/길이 검증 + 허니팟으로 익명 구독 스팸 완화.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function subscribeNewsletterAction(formData: FormData) {
  if (String(formData.get("company_url") || "").trim() !== "") return; // 허니팟
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) return;
  const supabase = createClient();
  await supabase.from("newsletter_subscriber").insert({ email }).select();
}
