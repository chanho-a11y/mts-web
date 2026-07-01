"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";

const CUST = "/admin/customers";

// 고객 추가 — auth 계정 생성(초기 비번 0000, 첫 로그인 시 변경). service-role 필요.
export async function addCustomerAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const name = String(formData.get("name") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const role = String(formData.get("role") || "individual");
  if (!email) redirect(`${CUST}?error=${encodeURIComponent("이메일을 입력하세요")}`);
  if (!hasServiceRole) redirect(`${CUST}?error=${encodeURIComponent("service-role 키가 필요합니다(배포 환경에서 동작)")}`);
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email, password: "0000", email_confirm: true,
    user_metadata: { name, phone, role },
  });
  if (error) redirect(`${CUST}?error=${encodeURIComponent(error.message)}`);
  if (data.user) await admin.from("profiles").update({ must_change_password: true }).eq("id", data.user.id);
  revalidatePath(CUST);
  redirect(`${CUST}?added=1`);
}

export async function updateCustomerAction(formData: FormData) {
  const id = String(formData.get("id") || "");
  if (!id) redirect(CUST);
  const supabase = createClient();
  await supabase.from("profiles").update({
    name: String(formData.get("name") || ""),
    phone: String(formData.get("phone") || ""),
    role: String(formData.get("role") || "individual") as any,
  }).eq("id", id);
  revalidatePath(CUST);
  redirect(`${CUST}?updated=1`);
}

// 보관(archive) 토글 — 목록에서 숨김
export async function archiveCustomerAction(formData: FormData) {
  const id = String(formData.get("id") || "");
  const archived = String(formData.get("archived") || "true") === "true";
  if (id) {
    const supabase = createClient();
    await supabase.from("profiles").update({ archived }).eq("id", id);
  }
  revalidatePath(CUST);
  redirect(CUST + (archived ? "" : "?show=archived"));
}

// 완전 삭제 — auth 계정까지 제거. service-role 필요.
export async function deleteCustomerAction(formData: FormData) {
  const id = String(formData.get("id") || "");
  if (!id) redirect(CUST);
  if (!hasServiceRole) redirect(`${CUST}?error=${encodeURIComponent("service-role 키가 필요합니다")}`);
  const admin = createAdminClient();
  await admin.auth.admin.deleteUser(id);
  revalidatePath(CUST);
  redirect(`${CUST}?deleted=1`);
}

// 엑셀(CSV) 임포트 — 첨부 양식과 동일 컬럼. 각 행을 사업자 고객으로 생성(비번 0000).
export async function importCustomersAction(formData: FormData) {
  const file = formData.get("file") as File | null;
  if (!file) redirect(`${CUST}?error=${encodeURIComponent("CSV 파일을 선택하세요")}`);
  if (!hasServiceRole) redirect(`${CUST}?error=${encodeURIComponent("service-role 키가 필요합니다(배포 환경에서 동작)")}`);
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) redirect(`${CUST}?error=${encodeURIComponent("데이터 행이 없습니다")}`);
  const header = splitCsv(lines[0]).map((h) => h.trim());
  const col = (row: string[], name: string) => { const idx = header.indexOf(name); return idx >= 0 ? (row[idx] ?? "").trim() : ""; };
  const admin = createAdminClient();
  let ok = 0, fail = 0;
  for (const line of lines.slice(1)) {
    const row = splitCsv(line);
    const email = col(row, "Email").toLowerCase();
    if (!email || !email.includes("@")) { fail++; continue; }
    const first = col(row, "First Name"); const last = col(row, "Last Name");
    const isAscii = (s: string) => /^[\x00-\x7F]*$/.test(s);
    // 한글: 성+이름(공백없이) / 라틴: First Last
    const name = first && last && first !== last
      ? (isAscii(first) && isAscii(last) ? `${first} ${last}` : `${last}${first}`)
      : (first || last || email.split("@")[0]);
    let phone = (col(row, "Phone") || col(row, "Default Address Phone")).replace(/^'/, "").trim();
    if (phone.startsWith("+82")) phone = "0" + phone.slice(3);
    const { data, error } = await admin.auth.admin.createUser({
      email, password: "0000", email_confirm: true, user_metadata: { name, phone, role: "business" },
    });
    if (error) { fail++; continue; }
    if (data.user) await admin.from("profiles").update({ must_change_password: true }).eq("id", data.user.id);
    ok++;
  }
  revalidatePath(CUST);
  redirect(`${CUST}?imported=${ok}&failed=${fail}`);
}

function splitCsv(line: string): string[] {
  const out: string[] = []; let cur = ""; let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) { if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') { q = false; } else cur += c; }
    else { if (c === '"') q = true; else if (c === ",") { out.push(cur); cur = ""; } else cur += c; }
  }
  out.push(cur); return out;
}

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
