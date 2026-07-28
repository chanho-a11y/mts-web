"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

import { requireAdmin } from "@/lib/auth-guard";
const KEYS = [
  "detail_section_order", "detail_accent", "detail_font",
  "asset_accent", "asset_font",
  "thumb_layout", "blog_layout", "insta_layout", "cardnews_layout",
];

export async function saveTemplatesAction(formData: FormData) {
  await requireAdmin();
  const brandCode = String(formData.get("brand") || "mtspace");
  const supabase = createClient();
  const { data: brand } = await supabase.from("brand").select("id").eq("code", brandCode).maybeSingle();
  if (!brand) return;
  for (const k of KEYS) {
    const v = String(formData.get(k) ?? "");
    await supabase.from("site_setting").upsert({ brand_id: brand.id, key: k, value: v }, { onConflict: "brand_id,key" });
  }
  revalidatePath("/", "layout");
  revalidatePath("/admin/templates");
}
