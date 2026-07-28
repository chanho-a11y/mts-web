"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

import { requireAdmin } from "@/lib/auth-guard";
export async function createPromotionAction(formData: FormData) {
  await requireAdmin();
  const placements = ["banner", "popup", "main", "shop"].filter((p) => formData.get(`pl_${p}`) === "on");
  const supabase = createClient();
  await supabase.from("promotion").insert({
    title: String(formData.get("title") || ""),
    kind: String(formData.get("kind") || "general"),
    discount_type: String(formData.get("discount_type") || "percent"),
    value: parseInt(String(formData.get("value") || "0"), 10) || 0,
    placements,
    banner_message: String(formData.get("banner_message") || "") || null,
    code: String(formData.get("code") || "") || null,
    is_active: true,
  });
  revalidatePath("/admin/marketing");
  revalidatePath("/", "layout");
}

export async function togglePromotionAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  const active = formData.get("active") === "true";
  const supabase = createClient();
  await supabase.from("promotion").update({ is_active: !active }).eq("id", id);
  revalidatePath("/admin/marketing");
  revalidatePath("/", "layout");
}
