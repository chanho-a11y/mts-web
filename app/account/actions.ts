"use server";
import { createHash } from "crypto";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function hashAnswer(a: string): string {
  return createHash("sha256").update((a ?? "").trim().toLowerCase()).digest("hex");
}

export async function signUpAction(formData: FormData) {
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const role = String(formData.get("role") || "individual"); // individual | business
  const language = String(formData.get("language") || "ko");

  const security = [1, 2, 3].map((i) => ({
    idx: i,
    q: String(formData.get(`sq${i}`) || ""),
    a: hashAnswer(String(formData.get(`sa${i}`) || "")),
  })).filter((s) => s.q && s.a);

  const meta: Record<string, unknown> = {
    name: String(formData.get("name") || ""),
    phone: String(formData.get("phone") || ""),
    role,
    language,
    marketing_opt_in: formData.get("marketing") === "on",
    address: {
      recipient: String(formData.get("name") || ""),
      phone: String(formData.get("phone") || ""),
      country: String(formData.get("country") || "KR"),
      zipcode: String(formData.get("zipcode") || ""),
      addr1: String(formData.get("addr1") || ""),
      addr2: String(formData.get("addr2") || ""),
    },
    security,
  };

  if (role === "business") {
    meta.business = {
      company_name: String(formData.get("company_name") || ""),
      biz_reg_no: String(formData.get("biz_reg_no") || ""),
      representative: String(formData.get("representative") || ""),
      contact_name: String(formData.get("name") || ""),
      contact_phone: String(formData.get("phone") || ""),
      tax_invoice_email: String(formData.get("tax_invoice_email") || email),
    };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: meta },
  });
  if (error) redirect(`/account/signup?error=${encodeURIComponent(error.message)}`);
  // try immediate sign-in (works if email confirmation disabled)
  await supabase.auth.signInWithPassword({ email, password });
  redirect("/account");
}

export async function signInAction(formData: FormData) {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email") || ""),
    password: String(formData.get("password") || ""),
  });
  if (error) redirect(`/account/login?error=${encodeURIComponent(error.message)}`);
  redirect("/account");
}

export async function signOutAction() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/");
}
