"use server";
import { createClient } from "@/lib/supabase/server";

export async function submitContactAction(formData: FormData): Promise<{ ok: boolean; message: string }> {
  const email = String(formData.get("email") || "");
  if (!email) return { ok: false, message: "이메일을 입력해주세요." };
  const supabase = createClient();
  const { error } = await supabase.from("contact_message").insert({
    name: String(formData.get("name") || ""),
    email,
    phone: String(formData.get("phone") || ""),
    message: String(formData.get("message") || ""),
    type: String(formData.get("type") || "general"),
  });
  if (error) return { ok: false, message: "전송 실패: " + error.message };
  if (formData.get("newsletter") === "on") {
    await supabase.from("newsletter_subscriber").insert({ email }).select();
  }
  return { ok: true, message: "문의가 접수되었습니다. 1영업일 내 회신드리겠습니다." };
}
