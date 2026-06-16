"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// 기업 고객별 할인 설정 (금액/% 할인 또는 직접 단가 → 절대 개별가로 환산, resolve_price 최우선)
export async function setCustomerPriceAction(formData: FormData) {
  const profileId = String(formData.get("profile_id") || "");
  const variantId = String(formData.get("variant_id") || "");
  const mode = String(formData.get("mode") || "fixed"); // amount | percent | fixed
  const value = parseFloat(String(formData.get("value") || "0")) || 0;
  if (!profileId || !variantId || value <= 0) return;

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 정가 조회 → 할인 방식에 따라 최종 개별가 환산
  const { data: v } = await supabase.from("product_variant").select("base_price").eq("id", variantId).maybeSingle();
  const base = v?.base_price ?? 0;
  let price = 0;
  if (mode === "amount") price = Math.max(0, base - Math.round(value));
  else if (mode === "percent") price = Math.max(0, Math.round(base * (1 - value / 100)));
  else price = Math.round(value); // fixed: 직접 단가
  if (price <= 0) return;

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
