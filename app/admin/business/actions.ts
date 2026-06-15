"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function approveBusinessAction(formData: FormData) {
  const profileId = String(formData.get("profile_id") || "");
  const decision = String(formData.get("decision") || "approved"); // approved | rejected
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  await supabase.from("business_accounts")
    .update({ status: decision, approved_by: user?.id ?? null, approved_at: new Date().toISOString() })
    .eq("profile_id", profileId);

  if (decision === "approved") {
    const { data: tier } = await supabase.from("price_tier").select("id").eq("name", "도매-기본").maybeSingle();
    await supabase.from("profiles").update({ role: "business", price_tier_id: tier?.id ?? null }).eq("id", profileId);
  }
  revalidatePath("/admin/business");
}
