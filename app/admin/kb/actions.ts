"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addKbAction(formData: FormData) {
  const term = String(formData.get("term") || "").trim();
  const definition = String(formData.get("definition") || "").trim();
  const category = String(formData.get("category") || "").trim() || null;
  if (!term) return;
  const supabase = createClient();
  await supabase.from("kb_entry").insert({ term, definition, category });
  revalidatePath("/admin/kb");
}

export async function updateKbAction(formData: FormData) {
  const id = String(formData.get("id") || "");
  const term = String(formData.get("term") || "").trim();
  const definition = String(formData.get("definition") || "").trim();
  const category = String(formData.get("category") || "").trim() || null;
  const supabase = createClient();
  await supabase.from("kb_entry").update({ term, definition, category }).eq("id", id);
  revalidatePath("/admin/kb");
}

export async function deleteKbAction(formData: FormData) {
  const id = String(formData.get("id") || "");
  const supabase = createClient();
  await supabase.from("kb_entry").delete().eq("id", id);
  revalidatePath("/admin/kb");
}
