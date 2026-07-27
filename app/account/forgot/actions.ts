"use server";
import { createHash, randomInt, timingSafeEqual } from "crypto";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { sendEmail, passwordResetCodeHtml } from "@/lib/email";
import { CODE_TTL_MIN, MAX_ATTEMPTS, RESEND_COOLDOWN_SEC } from "@/lib/password-reset";

// 비밀번호 재설정 — 6자리 인증코드(메일) + 링크 자동입력 겸용.
// 정책(D-086): TTL 10분 · 오입력 5회 · 재발송 쿨다운 60초 · 성공 시 자동 로그인 · 미가입 이메일은 명시 안내.
// 코드는 평문 저장하지 않고 sha256 해시만 password_reset_codes 에 보관(service-role 전용 테이블).
 
const SITE = () => process.env.NEXT_PUBLIC_SITE_URL || "https://mtspace.coffee";

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

// 타이밍 공격 방지 비교(길이 동일한 hex 문자열끼리 비교)
function sameHash(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

function normEmail(v: FormDataEntryValue | null): string {
  return String(v || "").trim().toLowerCase();
}

function toForgot(msg: string, email?: string): never {
  const q = new URLSearchParams({ error: msg });
  if (email) q.set("email", email);
  redirect(`/account/forgot?${q.toString()}`);
}

function toReset(email: string, msg: string): never {
  const q = new URLSearchParams({ email, error: msg });
  redirect(`/account/reset-password?${q.toString()}`);
}

/* ---------- 1단계: 인증코드 발급 · 메일 발송 ---------- */

export async function requestPasswordResetAction(formData: FormData) {
  const email = normEmail(formData.get("email"));
  // 재발송(2단계 화면)에서 호출된 경우 실패 시에도 2단계 화면에 머문다.
  const stay = String(formData.get("stay") || "") === "1";
  const fail: (msg: string) => never = (msg) => (stay ? toReset(email, msg) : toForgot(msg, email));

  if (!email || !email.includes("@")) fail("이메일 주소를 정확히 입력해 주세요.");
  if (!hasServiceRole) fail("서버 설정 오류로 재설정을 처리할 수 없습니다. 고객센터로 문의해 주세요.");

  const admin = createAdminClient();

  const { data: profs, error: profErr } = await admin
    .from("profiles")
    .select("id,email,name,archived")
    .eq("email", email)
    .limit(1);
  if (profErr) fail("일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");

  const prof = profs?.[0];
  if (!prof) fail("가입되지 않은 이메일입니다.");
  if (prof.archived) fail("사용할 수 없는 계정입니다. 고객센터로 문의해 주세요.");

  // 재발송 쿨다운 — 가장 최근 발급 시각 기준 60초
  const { data: recent } = await admin
    .from("password_reset_codes")
    .select("created_at")
    .eq("user_id", prof.id)
    .order("created_at", { ascending: false })
    .limit(1);
  const lastAt = recent?.[0]?.created_at ? new Date(recent[0].created_at as string).getTime() : 0;
  const elapsed = Math.floor((Date.now() - lastAt) / 1000);
  if (lastAt && elapsed < RESEND_COOLDOWN_SEC) {
    fail(`인증코드를 방금 보냈습니다. ${RESEND_COOLDOWN_SEC - elapsed}초 후에 다시 요청해 주세요.`);
  }

  // 유효한 이전 코드는 모두 무효화 — 항상 최신 코드 1개만 살아 있게 한다.
  await admin
    .from("password_reset_codes")
    .update({ consumed_at: new Date().toISOString() })
    .eq("user_id", prof.id)
    .is("consumed_at", null);

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const { data: inserted, error: insErr } = await admin
    .from("password_reset_codes")
    .insert({
      user_id: prof.id,
      email: prof.email,
      code_hash: hashCode(code),
      expires_at: new Date(Date.now() + CODE_TTL_MIN * 60_000).toISOString(),
    })
    .select("id")
    .single();
  if (insErr || !inserted) fail("일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");

  const link = `${SITE()}/account/reset-password?email=${encodeURIComponent(prof.email as string)}&code=${code}`;
  const res = await sendEmail(
    prof.email as string,
    "[MTSPACE COFFEE] 비밀번호 재설정 인증코드",
    passwordResetCodeHtml(code, link, (prof.name as string) || undefined, CODE_TTL_MIN),
  );
  if (!res.sent) {
    // 발송 실패한 코드는 즉시 폐기(쿨다운에 걸려 재시도를 막지 않도록 행 자체를 삭제)
    await admin.from("password_reset_codes").delete().eq("id", inserted.id);
    fail("인증 메일 발송에 실패했습니다. 잠시 후 다시 시도하거나 고객센터로 문의해 주세요.");
  }

  redirect(`/account/reset-password?email=${encodeURIComponent(prof.email as string)}&sent=1`);
}

/* ---------- 2단계: 코드 검증 · 새 비밀번호 적용 · 자동 로그인 ---------- */

export async function resetPasswordAction(formData: FormData) {
  const email = normEmail(formData.get("email"));
  const code = String(formData.get("code") || "").replace(/\D/g, "");
  const pw = String(formData.get("password") || "");
  const pw2 = String(formData.get("password2") || "");

  if (!email) toForgot("이메일 주소를 다시 입력해 주세요.");
  if (!hasServiceRole) toReset(email, "서버 설정 오류로 재설정을 처리할 수 없습니다. 고객센터로 문의해 주세요.");
  if (code.length !== 6) toReset(email, "인증코드 6자리를 정확히 입력해 주세요.");
  if (pw.length < 6) toReset(email, "비밀번호는 6자 이상이어야 합니다.");
  if (pw !== pw2) toReset(email, "비밀번호가 일치하지 않습니다.");
  if (pw === "0000") toReset(email, "초기 비밀번호는 사용할 수 없습니다.");

  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("password_reset_codes")
    .select("id,user_id,email,code_hash,expires_at,attempts")
    .eq("email", email)
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1);

  const row = rows?.[0];
  if (!row) toReset(email, "유효한 인증코드가 없습니다. 인증코드를 다시 발급받아 주세요.");

  const nowIso = new Date().toISOString();
  if (new Date(row.expires_at as string).getTime() < Date.now()) {
    await admin.from("password_reset_codes").update({ consumed_at: nowIso }).eq("id", row.id);
    toReset(email, "인증코드가 만료되었습니다. 다시 발급받아 주세요.");
  }
  const attempts = Number(row.attempts ?? 0);
  if (attempts >= MAX_ATTEMPTS) {
    await admin.from("password_reset_codes").update({ consumed_at: nowIso }).eq("id", row.id);
    toReset(email, "인증 시도 횟수를 초과했습니다. 인증코드를 다시 발급받아 주세요.");
  }
  if (!sameHash(hashCode(code), String(row.code_hash))) {
    const left = MAX_ATTEMPTS - (attempts + 1);
    await admin.from("password_reset_codes").update({ attempts: attempts + 1 }).eq("id", row.id);
    if (left <= 0) {
      await admin.from("password_reset_codes").update({ consumed_at: nowIso }).eq("id", row.id);
      toReset(email, "인증 시도 횟수를 초과했습니다. 인증코드를 다시 발급받아 주세요.");
    }
    toReset(email, `인증코드가 일치하지 않습니다. (남은 시도 ${left}회)`);
  }

  // 코드 소진 처리 후 비밀번호 교체 (재사용 방지)
  await admin.from("password_reset_codes").update({ consumed_at: nowIso }).eq("id", row.id);

  const { error: upErr } = await admin.auth.admin.updateUserById(String(row.user_id), { password: pw });
  if (upErr) toReset(email, upErr.message);

  await admin.from("profiles").update({ must_change_password: false }).eq("id", row.user_id);

  // 자동 로그인 → 마이페이지
  const supabase = createClient();
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email: String(row.email),
    password: pw,
  });
  if (signInErr) {
    redirect(`/account/login?error=${encodeURIComponent("비밀번호가 변경되었습니다. 새 비밀번호로 로그인해 주세요.")}`);
  }
  redirect("/account?pw=reset");
}
