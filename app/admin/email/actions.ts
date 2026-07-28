"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

import { requireAdmin } from "@/lib/auth-guard";
// 자동화 규칙 수정 (지연·대상·활성)
export async function saveAutomationAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  const delay_hours = Math.max(0, parseInt(String(formData.get("delay_hours") || "0"), 10) || 0);
  const segment = String(formData.get("segment") || "all");
  const is_active = formData.get("is_active") === "on";
  if (!id) return;
  const supabase = createClient();
  await supabase.from("email_automation").update({ delay_hours, segment, is_active }).eq("id", id);
  revalidatePath("/admin/email");
}

// 자동화 추가 (템플릿 트리거에서)
export async function addAutomationAction(formData: FormData) {
  await requireAdmin();
  const trigger = String(formData.get("trigger") || "").trim();
  const delay_hours = Math.max(0, parseInt(String(formData.get("delay_hours") || "0"), 10) || 0);
  const segment = String(formData.get("segment") || "subscribers");
  if (!trigger) return;
  const supabase = createClient();
  await supabase.from("email_automation").insert({ trigger, delay_hours, segment, is_active: false });
  revalidatePath("/admin/email");
}

// 자동화 삭제
export async function deleteAutomationAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  if (!id) return;
  const supabase = createClient();
  await supabase.from("email_automation").delete().eq("id", id);
  revalidatePath("/admin/email");
}
