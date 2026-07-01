"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function updatePasswordAction(formData: FormData) {
  const pw = String(formData.get("password") || "");
  const pw2 = String(formData.get("password2") || "");
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/account/login");
  if (pw.length < 6) redirect("/account/change-password?error=" + encodeURIComponent("비밀번호는 6자 이상이어야 합니다"));
  if (pw !== pw2) redirect("/account/change-password?error=" + encodeURIComponent("비밀번호가 일치하지 않습니다"));
  if (pw === "0000") redirect("/account/change-password?error=" + encodeURIComponent("초기 비밀번호는 사용할 수 없습니다"));
  const { error } = await supabase.auth.updateUser({ password: pw });
  if (error) redirect("/account/change-password?error=" + encodeURIComponent(error.message));
  await supabase.from("profiles").update({ must_change_password: false }).eq("id", user.id);
  redirect("/account?pw=changed");
}
