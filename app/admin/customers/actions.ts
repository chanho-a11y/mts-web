"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";

import { requireAdmin } from "@/lib/auth-guard";
const CUST = "/admin/customers";

// 고객 추가 — auth 계정 생성(초기 비번 0000, 첫 로그인 시 변경). service-role 필요.
export async function addCustomerAction(formData: FormData) {
  await requireAdmin();
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
  await requireAdmin();
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
  await requireAdmin();
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
  await requireAdmin();
  const id = String(formData.get("id") || "");
  if (!id) redirect(CUST);
  if (!hasServiceRole) redirect(`${CUST}?error=${encodeURIComponent("service-role 키가 필요합니다(배포 환경에서 동작)")}`);
  const admin = createAdminClient();

  // 1) NO ACTION(생성자) 참조 정리 — 이 고객이 만든 단가/승인/환불의 created_by·approved_by를 NULL 처리(삭제 차단 방지)
  await admin.from("customer_variant_prices").update({ created_by: null }).eq("created_by", id);
  await admin.from("business_accounts").update({ approved_by: null }).eq("approved_by", id);
  await admin.from("refund").update({ created_by: null }).eq("created_by", id);

  // 2) 주문 이력이 있으면 하드 삭제 불가(orders FK=RESTRICT) → 보관 처리로 폴백해 목록에서 숨김
  const { count: orderCount } = await admin.from("orders").select("*", { count: "exact", head: true }).eq("profile_id", id);
  if ((orderCount ?? 0) > 0) {
    await admin.from("profiles").update({ archived: true }).eq("id", id);
    revalidatePath(CUST);
    redirect(`${CUST}?archived_instead=1`);
  }

  // 3) 주문 없음 → auth 계정 삭제(profiles·addresses·cart 등은 ON DELETE CASCADE로 함께 제거)
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) {
    await admin.from("profiles").update({ archived: true }).eq("id", id);
    revalidatePath(CUST);
    redirect(`${CUST}?error=${encodeURIComponent("완전 삭제 불가(연관 데이터 존재) → 보관 처리했습니다")}`);
  }
  // cascade로 지워지지 않은 경우 대비 명시적 제거
  await admin.from("profiles").delete().eq("id", id);
  revalidatePath(CUST);
  redirect(`${CUST}?deleted=1`);
}

// 엑셀(CSV) 임포트 — 첨부 양식과 동일 컬럼. 각 행을 사업자 고객으로 생성(비번 0000).
export async function importCustomersAction(formData: FormData) {
  await requireAdmin();
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
  await requireAdmin();
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
  await requireAdmin();
  const id = String(formData.get("id") || "");
  const profileId = String(formData.get("profile_id") || "");
  const supabase = createClient();
  await supabase.from("customer_variant_prices").delete().eq("id", id);
  revalidatePath(`/admin/customers/${profileId}`);
}
