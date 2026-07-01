"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { pageById } from "@/lib/page-content";

export async function savePageContentAction(formData: FormData) {
  const pageId = String(formData.get("page") || "");
  const def = pageById(pageId);
  if (!def) redirect("/admin/content/pages");
  const supabase = createClient();
  const { data: brand } = await supabase.from("brand").select("id").eq("code", "mtspace").maybeSingle();
  if (!brand) redirect("/admin/content/pages");
  for (const f of def.fields) {
    const v = String(formData.get(f.key) || "");
    await supabase.from("site_setting").upsert({ brand_id: brand.id, key: f.key, value: v }, { onConflict: "brand_id,key" });
  }
  revalidatePath(def.path);
  revalidatePath(`/admin/content/pages/${pageId}`);
  redirect(`/admin/content/pages/${pageId}?saved=1`);
}
