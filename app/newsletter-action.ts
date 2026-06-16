"use server";
import { createClient } from "@/lib/supabase/server";

export async function subscribeNewsletterAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  if (!email) return;
  const supabase = createClient();
  await supabase.from("newsletter_subscriber").insert({ email }).select();
}
