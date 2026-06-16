"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function saveSettingsAction(formData: FormData) {
  const brandCode = String(formData.get("brand") || "mtspace");
  const supabase = createClient();
  const { data: brand } = await supabase.from("brand").select("id").eq("code", brandCode).maybeSingle();
  if (!brand) return;
  const keys = ["hero_title", "hero_subtitle", "hero_bg"];
  for (const k of keys) {
    const v = String(formData.get(k) || "");
    await supabase.from("site_setting").upsert({ brand_id: brand.id, key: k, value: v }, { onConflict: "brand_id,key" });
  }
  revalidatePath("/", "layout");
  revalidatePath("/admin/content");
}
