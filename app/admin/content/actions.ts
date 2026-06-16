"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function saveSettingsAction(formData: FormData) {
  const brandCode = String(formData.get("brand") || "mtspace");
  const supabase = createClient();
  const { data: brand } = await supabase.from("brand").select("id").eq("code", brandCode).maybeSingle();
  if (!brand) return;
  const keys = [
    "hero_title", "hero_subtitle", "hero_bg", "hero_image", "home_slides",
    "header_bg", "page_bg", "footer_bg",
    "font_family", "letter_spacing", "line_height", "headline_weight",
    "store_phone", "store_email",
  ];
  for (const k of keys) {
    const v = String(formData.get(k) || "");
    await supabase.from("site_setting").upsert({ brand_id: brand.id, key: k, value: v }, { onConflict: "brand_id,key" });
  }
  revalidatePath("/", "layout");
  revalidatePath("/admin/content");
}

export async function saveCategoryBannerAction(formData: FormData) {
  const slug = String(formData.get("slug") || "");
  const banner = String(formData.get("banner_path") || "");
  const supabase = createClient();
  await supabase.from("category").update({ banner_path: banner || null }).eq("slug", slug);
  revalidatePath(`/collections/${slug}`);
  revalidatePath("/admin/content");
}
