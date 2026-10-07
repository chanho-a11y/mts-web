/**
 * 발행 워커 실행기 (D-137). 크론 라우트와 관리자 화면의 "지금 실행"이 같은 함수를 부른다.
 *
 * 한 번 실행에 maxPosts 건까지, budgetMs 안에서 처리한다(Vercel 함수 60초 상한).
 * 토큰 오류(190)가 나면 즉시 중단하고 알림을 보낸다. 다른 건도 전부 실패할 것이기 때문이다.
 */
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { sendEmail, emailLayout } from "@/lib/email";
import {
  BRAND,
  claimNext,
  loadToken,
  processOne,
  refreshTokenIfDue,
  scrub,
  TokenError,
  type PublishOutcome,
} from "@/lib/social/publisher";

export interface WorkerRunResult {
  ok: boolean;
  brand: string;
  processed: PublishOutcome[];
  error?: string;
  token_source?: "db" | "env";
  token_age_days?: number;
}

const NOTIFY_TO = process.env.SOCIAL_NOTIFY_EMAIL || process.env.GMAIL_USER || "chanho@mtspace.coffee";
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://mtspace.coffee";

async function notify(subject: string, lines: string[]) {
  const html = emailLayout(subject, `<ul>${lines.map((l) => `<li>${l}</li>`).join("")}</ul><p><a href="${SITE}/admin/social">/admin/social 열기</a></p>`);
  try {
    await sendEmail(NOTIFY_TO, `[인스타 워커] ${subject}`, html);
  } catch {
    /* 알림 실패가 워커를 죽이지 않는다 */
  }
}

export async function runSocialWorker(opts: { maxPosts: number; budgetMs: number }): Promise<WorkerRunResult> {
  const started = Date.now();
  const processed: PublishOutcome[] = [];
  if (!hasServiceRole) return { ok: false, brand: BRAND, processed, error: "service-role 키 없음" };

  const db = createAdminClient();
  const igUserId = (process.env[`IG_USER_ID_${BRAND.toUpperCase()}`] ?? "").trim();
  if (!igUserId) return { ok: false, brand: BRAND, processed, error: `IG_USER_ID_${BRAND.toUpperCase()} 환경변수 없음` };

  console.log(`[social] worker start brand=${BRAND}`);
  let token = await loadToken(db);
  if (!token) return { ok: false, brand: BRAND, processed, error: `IG_ACCESS_TOKEN_${BRAND.toUpperCase()} 환경변수 없음` };

  try {
    token = await refreshTokenIfDue(db, token);
  } catch (e) {
    // 갱신 실패는 경고만. 기존 토큰이 아직 살아 있을 수 있다.
    await notify("토큰 갱신 실패", [scrub((e as Error).message), "60일 만료 전에 재발급이 필요할 수 있습니다."]);
  }

  const tokenAgeDays = Math.floor((Date.now() - token.issuedAt.getTime()) / 86_400_000);

  try {
    for (let i = 0; i < opts.maxPosts; i++) {
      if (Date.now() - started > opts.budgetMs) break;
      const post = await claimNext(db);
      if (!post) break;
      const outcome = await processOne(db, post, igUserId, token.token, started + opts.budgetMs);
      console.log(`[social] outcome slug=${outcome.slug} result=${outcome.result}${outcome.detail ? " " + outcome.detail : ""}`);
      processed.push(outcome);
      if (outcome.result === "quota") break;
    }
  } catch (e) {
    if (e instanceof TokenError) {
      await notify("토큰 오류로 워커 중단", [scrub(e.message), "developers.facebook.com 에서 토큰을 재발급해 환경변수와 mcp_config 를 교체하세요."]);
      return { ok: false, brand: BRAND, processed, error: "token_error", token_source: token.source, token_age_days: tokenAgeDays };
    }
    return { ok: false, brand: BRAND, processed, error: scrub((e as Error).message) };
  }

  const failed = processed.filter((p) => p.result === "failed");
  const published = processed.filter((p) => p.result === "published");
  if (failed.length) {
    await notify(`발행 실패 ${failed.length}건`, failed.map((f) => `${f.slug}: ${f.detail ?? ""}`));
  }
  if (published.length) {
    await notify(`발행 완료 ${published.length}건`, published.map((p) => `${p.slug}${p.permalink ? ` → <a href="${p.permalink}">${p.permalink}</a>` : ""}`));
  }

  return { ok: true, brand: BRAND, processed, token_source: token.source, token_age_days: tokenAgeDays };
}
