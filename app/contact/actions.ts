"use server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { notifyNewInquiry } from "@/lib/contact-inbox";

// M-5: 익명 접수(RLS insert=허용) 스팸 완화 — 형식/길이 검증 + 허니팟.
// D-166: 중복 제출 방지(같은 이메일, 같은 내용 10분 이내) + 이메일당 10분 5건 제한 + 신규 문의 메일 알림.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const cap = (v: FormDataEntryValue | null, n: number) => String(v || "").slice(0, n);
const OK_MSG = "문의가 접수되었습니다. 1영업일 내 회신드리겠습니다.";
const DEDUPE_WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;

export async function submitContactAction(formData: FormData): Promise<{ ok: boolean; message: string }> {
  // 허니팟: 사람에겐 안 보이는 필드가 채워지면 봇 → 성공한 척 조용히 무시.
  if (String(formData.get("company_url") || "").trim() !== "") {
    return { ok: true, message: OK_MSG };
  }
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!email) return { ok: false, message: "이메일을 입력해주세요." };
  if (email.length > 254 || !EMAIL_RE.test(email)) return { ok: false, message: "올바른 이메일 형식이 아닙니다." };

  const row = {
    name: cap(formData.get("name"), 100).trim(),
    email,
    phone: cap(formData.get("phone"), 40).trim(),
    message: cap(formData.get("message"), 5000),
    type: cap(formData.get("type"), 40) || "general",
  };

  // 서버측 중복 가드. 익명 세션은 RLS 상 SELECT 권한이 없으므로 service-role 로 조회만 한다.
  if (hasServiceRole) {
    const admin = createAdminClient();
    const since = new Date(Date.now() - DEDUPE_WINDOW_MS).toISOString();
    const { data: recent } = await admin
      .from("contact_message")
      .select("message,type")
      .eq("email", email)
      .gte("created_at", since)
      .limit(MAX_PER_WINDOW + 1);
    const list = recent ?? [];
    const norm = (s: string | null) => (s || "").replace(/\s+/g, " ").trim();
    const isDup = list.some((r) => r.type === row.type && norm(r.message) === norm(row.message));
    if (isDup || list.length >= MAX_PER_WINDOW) return { ok: true, message: OK_MSG };
  }

  const supabase = createClient();
  const { error } = await supabase.from("contact_message").insert(row);
  if (error) return { ok: false, message: "전송 실패: " + error.message };
  if (formData.get("newsletter") === "on") {
    await supabase.from("newsletter_subscriber").insert({ email }).select();
  }
  await notifyNewInquiry(row);
  return { ok: true, message: OK_MSG };
}
