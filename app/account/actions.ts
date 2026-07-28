"use server";
import { createHash } from "crypto";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { verifyTurnstile } from "@/lib/turnstile";

function hashAnswer(a: string): string {
  return createHash("sha256").update((a ?? "").trim().toLowerCase()).digest("hex");
}

// C-1: 공개 가입에서 선택 가능한 등급은 이 둘뿐이다.
// customer_role enum 에는 admin·influencer 도 존재하므로, 폼 값을 그대로 신뢰하면
// 가입 요청에 role=admin 을 실어 보내는 것만으로 관리자 권한이 발급된다(권한상승).
// → 화이트리스트로 강제하고, DB 트리거(handle_new_user)에서도 동일하게 재차 막는다(2중 방어).
const SIGNUP_ROLES = ["individual", "business"] as const;
function safeSignupRole(v: FormDataEntryValue | null): "individual" | "business" {
  const s = String(v || "individual");
  return (SIGNUP_ROLES as readonly string[]).includes(s) ? (s as "individual" | "business") : "individual";
}

export async function signUpAction(formData: FormData) {
  // 봇 가입 차단 (D-091) — Turnstile 토큰 서버 검증.
  // 자동확인(admin.createUser) 가입이라 Supabase 대시보드 CAPTCHA 로는 막을 수 없어 여기서 직접 검증.
  // TURNSTILE_SECRET_KEY 미설정이면 통과(키 배포 전 가입 중단 방지).
  const human = await verifyTurnstile(String(formData.get("cf-turnstile-response") || "") || null);
  if (!human) {
    redirect(`/account/signup?error=${encodeURIComponent("자동가입 방지 확인에 실패했습니다. 체크박스를 확인한 뒤 다시 시도해주세요.")}`);
  }

  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const role = safeSignupRole(formData.get("role")); // individual | business 로 강제(C-1)
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

  const bizFile = formData.get("biz_reg_file");
  const hasBizFile = bizFile instanceof File && bizFile.size > 0;

  if (role === "business") {
    // 사업자 신청은 사업자등록증 첨부 필수
    if (!hasBizFile) {
      redirect(`/account/signup?error=${encodeURIComponent("사업자등록증 파일을 첨부해야 가입할 수 있습니다.")}`);
    }
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

  // 가입 즉시 이용(쇼핑) 가능해야 하므로 이메일 확인을 자동 처리한다.
  // service-role 이 있으면 admin.createUser(email_confirm:true)로 '확인 완료' 상태로 생성 →
  // 인증 메일 없이 바로 로그인/쇼핑 가능. (일반 회원은 승인 불필요, 사업자 승인 게이트는 checkout 에서 별도 처리)
  // fallback: service-role 미설정 시 일반 signUp (이 경우 Supabase 대시보드 '이메일 확인' 설정을 따른다).
  let newUserId: string | null | undefined = null;
  if (hasServiceRole) {
    const admin = createAdminClient();
    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: meta,
    });
    if (error) redirect(`/account/signup?error=${encodeURIComponent(error.message)}`);
    newUserId = created?.user?.id;
  } else {
    const { data: signUpData, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: meta },
    });
    if (error) redirect(`/account/signup?error=${encodeURIComponent(error.message)}`);
    newUserId = signUpData?.user?.id;
  }

  // 사업자등록증 업로드(service-role 로 RLS 우회) 후 business_accounts 에 경로 저장.
  // handle_new_user 트리거가 business_accounts 행을 이미 생성하므로 UPDATE 로 경로만 채운다.
  if (role === "business" && hasBizFile && newUserId && hasServiceRole) {
    try {
      const file = bizFile as File;
      const ext = (file.name.split(".").pop() || "bin").toLowerCase();
      const path = `${newUserId}/biz-reg-${Date.now()}.${ext}`;
      const admin = createAdminClient();
      const bytes = new Uint8Array(await file.arrayBuffer());
      const { error: upErr } = await admin.storage
        .from("business-docs")
        .upload(path, bytes, { contentType: file.type || "application/octet-stream", upsert: true });
      if (!upErr) {
        await admin.from("business_accounts").update({ biz_reg_file_path: path }).eq("profile_id", newUserId);
      }
    } catch {
      // 업로드 실패해도 가입 자체는 유지 — 관리자 승인 단계에서 재요청 가능
    }
  }

  // 즉시 로그인 — 위에서 이메일 확인을 완료했으므로 성공한다.
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

/* ---------- 배송지 주소록 (마이페이지) ---------- */

export async function saveAddressAction(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/account/login");

  const makeDefault = formData.get("is_default") === "on";
  const row = {
    profile_id: user.id,
    recipient: String(formData.get("recipient") || "").trim(),
    phone: String(formData.get("phone") || "").trim(),
    country: String(formData.get("country") || "KR"),
    zipcode: String(formData.get("zipcode") || "").trim(),
    addr1: String(formData.get("addr1") || "").trim(),
    addr2: String(formData.get("addr2") || "").trim(),
    entrance_memo: String(formData.get("entrance_memo") || "").trim() || null,
    is_default: makeDefault,
  };

  // 기본 배송지로 지정하면 기존 기본값 해제
  if (makeDefault) {
    await supabase.from("addresses").update({ is_default: false }).eq("profile_id", user.id);
  }
  // 첫 주소는 자동으로 기본 배송지
  const { count } = await supabase
    .from("addresses").select("id", { count: "exact", head: true }).eq("profile_id", user.id);
  if (!count) row.is_default = true;

  await supabase.from("addresses").insert(row);
  redirect("/account?saved=address");
}

export async function deleteAddressAction(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/account/login");
  const id = String(formData.get("id") || "");
  await supabase.from("addresses").delete().eq("id", id).eq("profile_id", user.id);
  redirect("/account");
}

export async function setDefaultAddressAction(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/account/login");
  const id = String(formData.get("id") || "");
  await supabase.from("addresses").update({ is_default: false }).eq("profile_id", user.id);
  await supabase.from("addresses").update({ is_default: true }).eq("id", id).eq("profile_id", user.id);
  redirect("/account");
}
