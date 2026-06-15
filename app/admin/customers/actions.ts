"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// 기업 고객별 단가 설정 (customer_variant_prices = 회원 개별가, resolve_price 최우선)
export async function setCustomerPriceAction(formData: FormData) {
  const profileId = String(formData.get("profile_id") || "");
  const variantId = String(formData.get("variant_id") || "");
  const price = parseInt(String(formData.get("price") || "0"), 10) || 0;
  if (!profileId || !variantId || price <= 0) return;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from("customer_variant_prices").insert({
    profile_id: profileId, variant_id: variantId, price, created_by: user?.id ?? null,
  });
  revalidatePath(`/admin/customers/${profileId}`);
}

export async function deleteCustomerPriceAction(formData: FormData) {
  const id = String(formData.get("id") || "");
  const profileId = String(formData.get("profile_id") || "");
  const supabase = createClient();
  await supabase.from("customer_variant_prices").delete().eq("id", id);
  revalidatePath(`/admin/customers/${profileId}`);
}
