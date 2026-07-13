"use server";
import { createClient } from "@/lib/supabase/server";

// M-5: 익명 접수(RLS insert=허용) 스팸 완화 — 형식/길이 검증 + 허니팟.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const cap = (v: FormDataEntryValue | null, n: number) => String(v || "").slice(0, n);

export async function submitContactAction(formData: FormData): Promise<{ ok: boolean; message: string }> {
  // 허니팟: 사람에겐 안 보이는 필드가 채워지면 봇 → 성공한 척 조용히 무시.
  if (String(formData.get("company_url") || "").trim() !== "") {
    return { ok: true, message: "문의가 접수되었습니다. 1영업일 내 회신드리겠습니다." };
  }
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!email) return { ok: false, message: "이메일을 입력해주세요." };
  if (email.length > 254 || !EMAIL_RE.test(email)) return { ok: false, message: "올바른 이메일 형식이 아닙니다." };
  const supabase = createClient();
  const { error } = await supabase.from("contact_message").insert({
    name: cap(formData.get("name"), 100),
    email,
    phone: cap(formData.get("phone"), 40),
    message: cap(formData.get("message"), 5000),
    type: cap(formData.get("type"), 40) || "general",
  });
  if (error) return { ok: false, message: "전송 실패: " + error.message };
  if (formData.get("newsletter") === "on") {
    await supabase.from("newsletter_subscriber").insert({ email }).select();
  }
  return { ok: true, message: "문의가 접수되었습니다. 1영업일 내 회신드리겠습니다." };
}
