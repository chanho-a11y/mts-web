"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const DAYS: Record<string, number> = { "2w": 14, "4w": 28, "8w": 56 };

export async function createSubscriptionAction(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/account/login?error=" + encodeURIComponent("구독은 로그인이 필요합니다"));
  const variantId = String(formData.get("variant_id") || "");
  const interval = String(formData.get("interval") || "4w");
  const grind = String(formData.get("grind") || "whole");
  const next = new Date(Date.now() + (DAYS[interval] ?? 28) * 86400000).toISOString();
  if (variantId) {
    await supabase.from("subscription").insert({
      profile_id: user.id, variant_id: variantId, interval, grind, next_charge_at: next, status: "active",
    });
  }
  redirect("/account?sub=ok");
}
