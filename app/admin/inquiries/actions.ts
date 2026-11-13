"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth-guard";
import { isInquiryStatus } from "@/lib/contact-inbox";

// D-166: 문의 상태 변경. Server Action 은 layout 가드를 거치지 않으므로 첫 줄에서 인가 검사(D-092).
// 사용자 세션 클라이언트로 쓰므로 RLS(contact_admin_update, is_admin())가 2차 방어선이다.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function updateInquiryAction(formData: FormData) {
  const user = await requireAdmin();
  const id = String(formData.get("id") || "");
  const status = String(formData.get("status") || "");
  const note = String(formData.get("admin_note") || "").slice(0, 2000).trim();
  if (!UUID_RE.test(id) || !isInquiryStatus(status)) return;

  const supabase = createClient();
  await supabase
    .from("contact_message")
    .update({
      status,
      admin_note: note || null,
      handled_at: status === "new" ? null : new Date().toISOString(),
      handled_by: status === "new" ? null : user.id,
    })
    .eq("id", id);
  revalidatePath("/admin/inquiries");
}
