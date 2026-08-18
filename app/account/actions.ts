"use server";
import { createHash } from "crypto";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { verifyTurnstile } from "@/lib/turnstile";
import { MAX_ADDRESSES } from "@/lib/address";
import {
  clientIp, ipRateExceeded, logSignupAttempt, normalizedEmailTaken, verifyFormToken,
} from "@/lib/signup-guard";

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

// 봇에게만 보이는 필드가 채워졌거나 검증에 걸렸을 때의 공통 처리.
// 봇에게는 실패 사유를 알려주지 않는다(우회 학습 방지) — 일반적인 문구로만 응답.
const SIGNUP_REJECT = "가입 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.";

export async function signUpAction(formData: FormData) {
  const emailRaw = String(formData.get("email") || "").trim();
  const ip = clientIp();

  // ── D-097 ① 허니팟 ──
  // 사람에게는 보이지 않는 필드(website). 채워져 있으면 자동 입력 봇이다.
  if (String(formData.get("website") || "").trim() !== "") {
    await logSignupAttempt(ip, emailRaw || null, "blocked_honeypot");
    redirect(`/account/signup?error=${encodeURIComponent(SIGNUP_REJECT)}`);
  }

  // ── D-097 ② 제출 속도 ──
  // 폼 렌더 시 발급한 HMAC 서명 토큰으로 경과시간 확인. 봇은 즉시 제출한다(실측: 밀리초 단위).
  // 토큰이 아예 없는 경우는 캐시된 구버전 폼일 수 있어 통과시킨다(가입 중단 방지).
  const speed = verifyFormToken(String(formData.get("fts") || "") || null, Date.now());
  if (speed === "too_fast") {
    await logSignupAttempt(ip, emailRaw || null, "blocked_speed");
    redirect(`/account/signup?error=${encodeURIComponent("입력이 너무 빠르게 제출되었습니다. 다시 시도해 주세요.")}`);
  }
  if (speed === "expired") {
    redirect(`/account/signup?error=${encodeURIComponent("페이지를 너무 오래 열어두셨습니다. 새로고침 후 다시 시도해 주세요.")}`);
  }

  // ── D-097 ③ IP 레이트리밋 ──
  if (await ipRateExceeded(ip)) {
    await logSignupAttempt(ip, emailRaw || null, "blocked_rate");
    redirect(`/account/signup?error=${encodeURIComponent("가입 시도가 많습니다. 잠시 후 다시 시도해 주세요.")}`);
  }

  // ── D-091 Turnstile (키가 주입되면 여기서 함께 작동) ──
  const human = await verifyTurnstile(String(formData.get("cf-turnstile-response") || "") || null);
  if (!human) {
    await logSignupAttempt(ip, emailRaw || null, "blocked_captcha");
    redirect(`/account/signup?error=${encodeURIComponent("자동가입 방지 확인에 실패했습니다. 체크박스를 확인한 뒤 다시 시도해주세요.")}`);
  }

  // ── D-097 ④ Gmail 점(dot)·+태그 트릭 중복 차단 ──
  // a.b@gmail.com / ab@gmail.com / ab+x@gmail.com 은 같은 메일박스다. DB unique index 와 이중 방어.
  if (emailRaw && (await normalizedEmailTaken(emailRaw))) {
    await logSignupAttempt(ip, emailRaw, "blocked_dup");
    redirect(`/account/signup?error=${encodeURIComponent("이미 가입된 이메일입니다. 로그인 또는 비밀번호 찾기를 이용해 주세요.")}`);
  }

  await logSignupAttempt(ip, emailRaw || null, "attempt");

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

// 폼 → DB 행. 필수값 검증까지 함께 처리한다.
function readAddressForm(formData: FormData):
  | { ok: true; row: Record<string, string | null> }
  | { ok: false; error: string } {
  const recipient = String(formData.get("recipient") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const addr1 = String(formData.get("addr1") || "").trim();
  if (!recipient || !phone || !addr1) {
    return { ok: false, error: "받는 분·전화번호·기본 주소는 필수입니다." };
  }
  return {
    ok: true,
    row: {
      label: String(formData.get("label") || "").trim().slice(0, 20) || null,
      recipient,
      phone,
      country: String(formData.get("country") || "KR"),
      zipcode: String(formData.get("zipcode") || "").trim(),
      addr1,
      addr2: String(formData.get("addr2") || "").trim(),
      entrance_memo: String(formData.get("entrance_memo") || "").trim() || null,
    },
  };
}

function addressError(msg: string): never {
  redirect(`/account?error=${encodeURIComponent(msg)}#addresses`);
}

export async function saveAddressAction(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/account/login");

  const parsed = readAddressForm(formData);
  if (!parsed.ok) addressError(parsed.error);

  // 상한(D-113) — 기존에 상한을 넘겨 저장된 계정은 그대로 두고, 신규 추가만 막는다.
  const { count } = await supabase
    .from("addresses").select("id", { count: "exact", head: true }).eq("profile_id", user.id);
  const existing = count ?? 0;
  if (existing >= MAX_ADDRESSES) {
    addressError(`배송지는 최대 ${MAX_ADDRESSES}개까지 저장할 수 있습니다. 기존 배송지를 삭제하거나 수정해 주세요.`);
  }

  // 첫 주소는 무조건 기본. 그 외에는 체크박스를 따른다.
  const makeDefault = existing === 0 || formData.get("is_default") === "on";

  // 순서가 중요하다: 먼저 is_default=false 로 넣고, 성공한 뒤에 RPC 로 기본을 옮긴다.
  // (기존 기본을 먼저 해제했다가 INSERT 가 실패하면 '기본 배송지 0건' 상태로 남는다.)
  const { data: inserted, error } = await supabase
    .from("addresses")
    .insert({ ...parsed.row, profile_id: user.id, is_default: existing === 0 })
    .select("id")
    .single();

  // 예전 구현은 error 를 버리고 무조건 성공처럼 리다이렉트했다 → 저장 안 됐는데 저장된 줄 알던 문제.
  if (error || !inserted) {
    console.error("[address-insert-failed]", error?.message);
    addressError("배송지 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.");
  }

  if (makeDefault && existing > 0) {
    const { error: dErr } = await supabase.rpc("set_default_address", { p_address_id: inserted.id });
    if (dErr) console.error("[address-set-default-failed]", dErr.message);
  }
  redirect("/account?saved=address#addresses");
}

export async function updateAddressAction(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/account/login");

  const id = String(formData.get("id") || "");
  if (!id) addressError("수정할 배송지를 찾을 수 없습니다.");

  const parsed = readAddressForm(formData);
  if (!parsed.ok) addressError(parsed.error);

  // is_default 는 여기서 건드리지 않는다 — 전환은 RPC 한 번으로 원자적으로 처리한다.
  // .eq("profile_id") 는 RLS 와 별개로 한 번 더 두는 소유권 방어선.
  const { error } = await supabase
    .from("addresses")
    .update({ ...parsed.row, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("profile_id", user.id);

  if (error) {
    console.error("[address-update-failed]", error.message);
    addressError("배송지 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.");
  }

  if (formData.get("is_default") === "on") {
    const { error: dErr } = await supabase.rpc("set_default_address", { p_address_id: id });
    if (dErr) console.error("[address-set-default-failed]", dErr.message);
  }
  redirect("/account?saved=address#addresses");
}

export async function deleteAddressAction(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/account/login");
  const id = String(formData.get("id") || "");
  // 기본 배송지를 지우면 DB 트리거(addresses_promote_default_after_delete)가
  // 남은 주소 중 최신 1건을 자동으로 기본으로 승격한다.
  await supabase.from("addresses").delete().eq("id", id).eq("profile_id", user.id);
  redirect("/account#addresses");
}

export async function setDefaultAddressAction(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/account/login");
  const id = String(formData.get("id") || "");
  if (!id) redirect("/account#addresses");

  // 해제 → 지정을 한 트랜잭션에서 처리(RPC). 두 번의 UPDATE 사이에 다른 요청이 끼어들어
  // 기본 배송지가 0건이나 2건이 되는 경합을 막는다.
  const { error } = await supabase.rpc("set_default_address", { p_address_id: id });
  if (error) {
    console.error("[address-set-default-failed]", error.message);
    addressError("기본 배송지 변경에 실패했습니다. 잠시 후 다시 시도해 주세요.");
  }
  redirect("/account?saved=address#addresses");
}

/* ---------- 마케팅 수신동의 (마이페이지) ---------- */

export async function updateMarketingOptInAction(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/account/login");

  // 본인 행만 갱신. role·price_tier_id·archived 는 건드리지 않으므로
  // profiles_guard_privileged 트리거(관리자 전용 컬럼 보호)에 걸리지 않는다.
  await supabase
    .from("profiles")
    .update({ marketing_opt_in: formData.get("marketing") === "on" })
    .eq("id", user.id);

  redirect("/account?saved=marketing");
}
