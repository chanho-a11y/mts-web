"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// 국내 배송 요금 행 수정
export async function saveDomesticRateAction(formData: FormData) {
  const id = String(formData.get("id") || "");
  const fee = parseInt(String(formData.get("fee") || "0"), 10) || 0;
  const label = String(formData.get("label") || "");
  const supabase = createClient();
  await supabase.from("domestic_shipping_rate").update({ fee, label }).eq("id", id);
  revalidatePath("/admin/store");
}

// 국내 배송 요금 행 추가
export async function addDomesticRateAction(formData: FormData) {
  const label = String(formData.get("label") || "");
  const fee = parseInt(String(formData.get("fee") || "0"), 10) || 0;
  const maxRaw = String(formData.get("max_weight_g") || "");
  const max_weight_g = maxRaw === "" ? null : parseInt(maxRaw, 10);
  const position = parseInt(String(formData.get("position") || "0"), 10) || 0;
  const supabase = createClient();
  await supabase.from("domestic_shipping_rate").insert({ label, fee, max_weight_g, position });
  revalidatePath("/admin/store");
}

// EMS 요금 단건 수정(국가·무게구간 가격)
export async function saveEmsRateAction(formData: FormData) {
  const id = String(formData.get("id") || "");
  const price = parseInt(String(formData.get("price") || "0"), 10) || 0;
  const supabase = createClient();
  await supabase.from("ems_rate").update({ price }).eq("id", id);
  revalidatePath("/admin/store");
}

// 세금률 설정 (site_setting vat_rate, 모든 브랜드에 적용)
export async function saveTaxAction(formData: FormData) {
  const vat = String(formData.get("vat_rate") || "10");
  const supabase = createClient();
  const { data: brands } = await supabase.from("brand").select("id");
  for (const b of brands ?? []) {
    await supabase.from("site_setting").upsert({ brand_id: b.id, key: "vat_rate", value: vat }, { onConflict: "brand_id,key" });
  }
  revalidatePath("/admin/store");
}

// 국내 무료배송 기준금액 설정 (site_setting free_ship_threshold_krw, 0/빈칸=무료 없음)
export async function saveFreeShipAction(formData: FormData) {
  const raw = String(formData.get("free_ship_threshold_krw") || "").replace(/[^0-9]/g, "");
  const value = raw ? String(parseInt(raw, 10)) : "0";
  const supabase = createClient();
  const { data: brands } = await supabase.from("brand").select("id");
  for (const b of brands ?? []) {
    await supabase.from("site_setting").upsert({ brand_id: b.id, key: "free_ship_threshold_krw", value }, { onConflict: "brand_id,key" });
  }
  revalidatePath("/admin/store");
}

// 관리자/역할 지정 (이메일로 사용자 찾아 role 변경) — 관리자만 가능(레이아웃에서 보호)
export async function setUserRoleAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const role = String(formData.get("role") || "individual");
  if (!email) return;
  const allowed = ["individual", "business", "influencer", "admin"];
  if (!allowed.includes(role)) return;
  const supabase = createClient();
  const { data: prof } = await supabase.from("profiles").select("id").ilike("email", email).maybeSingle();
  if (prof?.id) {
    await supabase.from("profiles").update({ role }).eq("id", prof.id);
  }
  revalidatePath("/admin/store");
}
