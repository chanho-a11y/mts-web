import { createHmac, timingSafeEqual } from "crypto";
import { headers } from "next/headers";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";

/**
 * D-097: 가입 봇 차단 — Turnstile 키 없이도 작동하는 행동 기반 방어.
 *
 * 배경(2026-07-26~29 실측 봇 30건의 공통 패턴):
 *   · 이름 = 공백 없는 랜덤 알파벳 14~24자
 *   · 전화 = 0으로 시작하지 않는 10~11자리(밍국형)
 *   · 가입 즉시 로그인(created_at ≈ last_sign_in_at, 밀리초 단위)
 *   · 주소 1건을 같은 초에 스크립트로 작성
 *   · Gmail 점(dot) 트릭으로 같은 메일박스를 여러 번 사용
 *   · 마케팅 수신 동의 체크(→ 우리 도메인이 해외 피해자에게 스팸 발송하는 구조)
 *
 * 대표 확정(D-097): 해외 개인고객 가입은 계속 허용한다(EMS 배송 있음).
 * 따라서 국가·전화 형식으로 막지 않고 **행동 신호만** 사용한다 — 오탐이 거의 없다.
 *
 * 4중 방어:
 *   ① 허니팟   — 사람에게 보이지 않는 필드가 채워지면 봇
 *   ② 제출 속도 — 폼 렌더 후 최소 3초. HMAC 서명 토큰이라 위조 불가
 *   ③ IP 레이트리밋 — 동일 IP 시간당 5건
 *   ④ Gmail 정규화 중복 — DB unique index(email_norm)와 앱 메시지 이중
 */

export const MIN_FILL_MS = 3_000;        // 사람이 가입 폼을 채우는 최소 시간
export const FORM_TTL_MS = 60 * 60_000;  // 토큰 유효 1시간(오래 열어둔 탭 허용)
export const IP_LIMIT = 5;               // 동일 IP 시간당 허용 가입 수
export const IP_WINDOW_MIN = 60;

function secret(): string {
  // 전용 시크릿이 없으면 서버 전용 키를 파생에 사용(클라이언트로 절대 노출되지 않음)
  return process.env.SIGNUP_FORM_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "dev-only-fallback";
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

/** 폼 렌더 시점에 서버에서 발급 — hidden input 으로 실어 보낸다. */
export function issueFormToken(nowMs: number): string {
  const ts = String(nowMs);
  return `${ts}.${sign(ts)}`;
}

export type SpeedVerdict = "ok" | "too_fast" | "expired" | "bad_token";

/** 제출 시 검증 — 서명 위조·너무 빠른 제출·만료를 구분한다. */
export function verifyFormToken(token: string | null | undefined, nowMs: number): SpeedVerdict {
  if (!token) return "bad_token";
  const [ts, mac] = String(token).split(".");
  if (!ts || !mac || !/^\d+$/.test(ts)) return "bad_token";
  const expected = sign(ts);
  const a = Buffer.from(mac, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return "bad_token";
  const elapsed = nowMs - Number(ts);
  if (elapsed < MIN_FILL_MS) return "too_fast";
  if (elapsed > FORM_TTL_MS) return "expired";
  return "ok";
}

/** Gmail 점·+태그를 무시한 정규형. DB `public.email_norm()` 과 동일 규칙. */
export function normalizeEmail(email: string): string {
  const e = String(email || "").trim().toLowerCase();
  const at = e.lastIndexOf("@");
  if (at < 0) return e;
  let local = e.slice(0, at);
  const domain = e.slice(at + 1);
  const plus = local.indexOf("+");
  if (plus >= 0) local = local.slice(0, plus);
  if (domain === "gmail.com" || domain === "googlemail.com") {
    return local.replace(/\./g, "") + "@gmail.com";
  }
  return `${local}@${domain}`;
}

/** Vercel 프록시 뒤에서의 클라이언트 IP. */
export function clientIp(): string {
  const h = headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return h.get("x-real-ip") || "unknown";
}

/** 가입 시도 기록(차단 사유 포함). 실패해도 가입 흐름을 막지 않는다. */
export async function logSignupAttempt(ip: string, email: string | null, outcome: string): Promise<void> {
  if (!hasServiceRole) return;
  try {
    await createAdminClient().from("signup_attempt").insert({ ip, email, outcome });
  } catch {
    /* 기록 실패는 무시 — 방어 판정 자체에는 영향 없음 */
  }
}

/** 동일 IP 의 최근 1시간 가입 시도 수가 한도를 넘었는가. */
export async function ipRateExceeded(ip: string): Promise<boolean> {
  if (!hasServiceRole || ip === "unknown") return false;
  try {
    const since = new Date(Date.now() - IP_WINDOW_MIN * 60_000).toISOString();
    const { count, error } = await createAdminClient()
      .from("signup_attempt")
      .select("id", { count: "exact", head: true })
      .eq("ip", ip)
      .gte("created_at", since);
    if (error) return false;               // 조회 실패 시 통과(fail-open)
    return (count ?? 0) >= IP_LIMIT;
  } catch {
    return false;
  }
}

/** 정규화 기준으로 이미 가입된 이메일인가(Gmail 점 트릭 차단). */
export async function normalizedEmailTaken(email: string): Promise<boolean> {
  if (!hasServiceRole) return false;
  try {
    const norm = normalizeEmail(email);
    const { data, error } = await createAdminClient()
      .from("profiles").select("id, email").not("email", "is", null).limit(2000);
    if (error || !data) return false;
    return data.some((r) => normalizeEmail(String((r as { email: string }).email)) === norm);
  } catch {
    return false;
  }
}
