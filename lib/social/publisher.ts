/**
 * 인스타그램 발행 워커 (D-137).
 *
 * social_post 에서 status='scheduled' 이고 scheduled_at 이 지난 행을 한 건씩 집어
 * Instagram Graph API(Instagram Login 경로, graph.instagram.com)로 발행한다.
 *
 * 경계:
 *   - 이 모듈은 mcp/ 를 import 하지 않는다(mcp/ 는 app·lib 를 모르므로 반대 방향도 막는다).
 *   - 상태 전이는 scheduled → published | failed 두 가지만. draft·scheduled 로 가는 전이는 관리자 화면만.
 *   - 토큰은 환경변수(초기값)와 mcp_config(갱신값)에서만 읽고 어떤 응답·로그에도 쓰지 않는다.
 *
 * 멱등성: ig_media_id 가 이미 있으면 다시 발행하지 않는다. 같은 건을 두 워커가 집지 않도록
 * 선점(claim)은 조건부 UPDATE 로 한다(for update skip locked 는 PostgREST 에서 못 쓴다).
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export const BRAND = "mtspace" as const;
const API_VERSION = process.env.IG_API_VERSION || "v21.0";
const GRAPH = `https://graph.instagram.com/${API_VERSION}`;

/** 컨테이너 처리 대기 상한. 이미지 기준 2분. */
const CONTAINER_WAIT_MS = 120_000;
const POLL_MS = 5_000;
/** 재시도 간격(분). 3회 뒤 failed. */
const RETRY_MINUTES = [2, 8, 32];

export interface MediaItem {
  url: string;
  alt?: string | null;
}

export interface SocialPostRow {
  id: string;
  slug: string;
  kind: "image" | "carousel";
  caption: string;
  hashtags: string[];
  media: MediaItem[];
  status: string;
  scheduled_at: string | null;
  ig_media_id: string | null;
  retry_count: number;
}

export interface PublishOutcome {
  slug: string;
  result: "published" | "failed" | "retry" | "skipped" | "quota";
  detail?: string;
  permalink?: string;
}

/* ── 토큰 ──────────────────────────────────────────────────────────── */

interface TokenState {
  token: string;
  issuedAt: Date;
  source: "db" | "env";
}

/**
 * 토큰 읽기. 우선순위: mcp_config.ig_token_<brand> → 환경변수.
 * 환경변수에서 읽은 경우 DB 에 복사해 두어 이후 갱신이 DB 에서만 일어나게 한다.
 */
export async function loadToken(db: SupabaseClient): Promise<TokenState | null> {
  const { data } = await db
    .from("mcp_config")
    .select("key,value")
    .in("key", [`ig_token_${BRAND}`, `ig_token_issued_${BRAND}`]);
  const map = new Map((data ?? []).map((r: { key: string; value: string }) => [r.key, r.value]));
  const dbToken = (map.get(`ig_token_${BRAND}`) ?? "").trim();
  const dbIssued = map.get(`ig_token_issued_${BRAND}`);
  if (dbToken && dbToken !== "env") {
    return { token: dbToken, issuedAt: dbIssued ? new Date(dbIssued) : new Date(0), source: "db" };
  }
  const envToken = (process.env[`IG_ACCESS_TOKEN_${BRAND.toUpperCase()}`] ?? "").trim();
  if (!envToken) return null;
  const now = new Date();
  await db.from("mcp_config").upsert(
    [
      { key: `ig_token_${BRAND}`, value: envToken, note: "Instagram 장기 토큰. 워커가 50일마다 갱신. 절대 MCP 로 노출하지 않는다." },
      { key: `ig_token_issued_${BRAND}`, value: now.toISOString(), note: "토큰 발급(또는 마지막 갱신) 시각" },
    ],
    { onConflict: "key" },
  );
  return { token: envToken, issuedAt: now, source: "env" };
}

/** 50일 지난 토큰은 갱신. 실패해도 기존 토큰으로 계속 간다(만료 전까지). */
export async function refreshTokenIfDue(db: SupabaseClient, state: TokenState): Promise<TokenState> {
  const ageDays = (Date.now() - state.issuedAt.getTime()) / 86_400_000;
  if (ageDays < 50) return state;
  const url = `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(state.token)}`;
  const res = await fetch(url);
  const body = (await res.json().catch(() => ({}))) as { access_token?: string; error?: { message?: string } };
  if (!res.ok || !body.access_token) {
    throw new TokenError(`토큰 갱신 실패: ${body.error?.message ?? `http_${res.status}`}`);
  }
  const now = new Date();
  await db.from("mcp_config").upsert(
    [
      { key: `ig_token_${BRAND}`, value: body.access_token },
      { key: `ig_token_issued_${BRAND}`, value: now.toISOString() },
    ],
    { onConflict: "key" },
  );
  return { token: body.access_token, issuedAt: now, source: "db" };
}

export class TokenError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = "TokenError";
  }
}

/* ── Graph API ─────────────────────────────────────────────────────── */

interface GraphError {
  message?: string;
  code?: number;
  error_subcode?: number;
  type?: string;
}

async function graph<T>(path: string, token: string, init?: { method?: "GET" | "POST"; params?: Record<string, string> }): Promise<T> {
  const params = new URLSearchParams({ ...(init?.params ?? {}), access_token: token });
  const method = init?.method ?? "GET";
  const url = method === "GET" ? `${GRAPH}${path}?${params}` : `${GRAPH}${path}`;
  const res = await fetch(url, method === "GET" ? undefined : { method, body: params });
  const body = (await res.json().catch(() => ({}))) as T & { error?: GraphError };
  if (!res.ok || body.error) {
    const e = body.error ?? {};
    const err = new GraphApiError(e.message ?? `http_${res.status}`, e.code, res.status);
    throw err;
  }
  return body;
}

export class GraphApiError extends Error {
  constructor(msg: string, readonly code?: number, readonly http?: number) {
    super(msg);
    this.name = "GraphApiError";
  }
  /** 190 = 토큰 무효. 4 = 앱 호출 한도, 17/32 = 사용자 호출 한도. 5xx = 일시 장애 */
  get isTokenError() { return this.code === 190; }
  get isTransient() { return (this.http ?? 0) >= 500 || this.code === 4 || this.code === 17 || this.code === 32; }
}

export function buildCaption(caption: string, hashtags: string[]): string {
  const tags = (hashtags ?? []).map((h) => `#${h.replace(/^#/, "")}`).join(" ");
  return tags ? `${caption.trim()}\n\n${tags}` : caption.trim();
}

async function waitContainer(creationId: string, token: string): Promise<void> {
  const deadline = Date.now() + CONTAINER_WAIT_MS;
  while (Date.now() < deadline) {
    const r = await graph<{ status_code?: string; status?: string }>(`/${creationId}`, token, { params: { fields: "status_code,status" } });
    const s = r.status_code ?? "";
    if (s === "FINISHED") return;
    if (s === "ERROR" || s === "EXPIRED") throw new GraphApiError(`컨테이너 상태 ${s}: ${r.status ?? ""}`.trim(), undefined, 400);
    await new Promise((res) => setTimeout(res, POLL_MS));
  }
  throw new GraphApiError("컨테이너 처리 시간 초과(2분)", undefined, 408);
}

/** quota_usage 가 상한에 닿았으면 true */
export async function quotaExhausted(igUserId: string, token: string): Promise<boolean> {
  try {
    const r = await graph<{ data?: { quota_usage?: number; config?: { quota_total?: number } }[] }>(
      `/${igUserId}/content_publishing_limit`,
      token,
      { params: { fields: "quota_usage,config" } },
    );
    const d = r.data?.[0];
    if (!d) return false;
    const total = d.config?.quota_total ?? 100;
    return (d.quota_usage ?? 0) >= total;
  } catch {
    return false; // 한도 조회 실패는 발행을 막지 않는다
  }
}

/** 이미지 1장 또는 캐러셀을 발행하고 media id 와 permalink 를 돌려준다 */
export async function publishToInstagram(
  post: SocialPostRow,
  igUserId: string,
  token: string,
): Promise<{ mediaId: string; permalink: string | null }> {
  const caption = buildCaption(post.caption, post.hashtags);
  let creationId: string;

  if (post.kind === "carousel") {
    const children: string[] = [];
    for (const m of post.media) {
      const c = await graph<{ id: string }>(`/${igUserId}/media`, token, {
        method: "POST",
        params: { image_url: m.url, is_carousel_item: "true" },
      });
      children.push(c.id);
    }
    for (const id of children) await waitContainer(id, token);
    const parent = await graph<{ id: string }>(`/${igUserId}/media`, token, {
      method: "POST",
      params: { media_type: "CAROUSEL", children: children.join(","), caption },
    });
    creationId = parent.id;
  } else {
    const c = await graph<{ id: string }>(`/${igUserId}/media`, token, {
      method: "POST",
      params: { image_url: post.media[0].url, caption },
    });
    creationId = c.id;
  }

  await waitContainer(creationId, token);
  const pub = await graph<{ id: string }>(`/${igUserId}/media_publish`, token, {
    method: "POST",
    params: { creation_id: creationId },
  });

  let permalink: string | null = null;
  try {
    const info = await graph<{ permalink?: string }>(`/${pub.id}`, token, { params: { fields: "permalink" } });
    permalink = info.permalink ?? null;
  } catch {
    /* permalink 는 부가 정보 */
  }
  return { mediaId: pub.id, permalink };
}

/* ── 큐 처리 ───────────────────────────────────────────────────────── */

/** 가장 오래된 due 건 하나를 선점한다. 선점 표식은 last_attempt_at 갱신 + 조건부 업데이트. */
export async function claimNext(db: SupabaseClient): Promise<SocialPostRow | null> {
  const nowIso = new Date().toISOString();
  const { data: cands } = await db
    .from("social_post")
    .select("id,slug,kind,caption,hashtags,media,status,scheduled_at,ig_media_id,retry_count,last_attempt_at")
    .eq("status", "scheduled")
    .lte("scheduled_at", nowIso)
    .order("scheduled_at", { ascending: true })
    .limit(5);
  for (const c of (cands ?? []) as (SocialPostRow & { last_attempt_at: string | null })[]) {
    // 60초 안에 다른 워커가 집은 건은 건너뛴다
    if (c.last_attempt_at && Date.now() - new Date(c.last_attempt_at).getTime() < 60_000) continue;
    let q = db.from("social_post").update({ last_attempt_at: nowIso }).eq("id", c.id).eq("status", "scheduled");
    q = c.last_attempt_at ? q.eq("last_attempt_at", c.last_attempt_at) : q.is("last_attempt_at", null);
    const { data: claimed } = await q.select("id").maybeSingle();
    if (claimed) return c;
  }
  return null;
}

export async function processOne(db: SupabaseClient, post: SocialPostRow, igUserId: string, token: string): Promise<PublishOutcome> {
  // 멱등성
  if (post.ig_media_id) {
    await db.from("social_post").update({ status: "published", published_at: new Date().toISOString() }).eq("id", post.id);
    return { slug: post.slug, result: "published", detail: "이미 발행된 media id 가 있어 상태만 맞췄다" };
  }
  if (!Array.isArray(post.media) || post.media.length === 0) {
    await markFailed(db, post, "미디어가 비어 있다");
    return { slug: post.slug, result: "failed", detail: "미디어 없음" };
  }

  if (await quotaExhausted(igUserId, token)) {
    await db.from("social_post").update({ last_attempt_at: null }).eq("id", post.id);
    return { slug: post.slug, result: "quota", detail: "24시간 발행 한도 도달, 다음 주기에 재시도" };
  }

  try {
    const { mediaId, permalink } = await publishToInstagram(post, igUserId, token);
    await db
      .from("social_post")
      .update({ status: "published", ig_media_id: mediaId, ig_permalink: permalink, published_at: new Date().toISOString(), failure_reason: null })
      .eq("id", post.id);
    return { slug: post.slug, result: "published", permalink: permalink ?? undefined };
  } catch (e) {
    const err = e as GraphApiError;
    if (err instanceof GraphApiError && err.isTokenError) throw new TokenError(err.message);
    if (err instanceof GraphApiError && err.isTransient && post.retry_count < RETRY_MINUTES.length) {
      const delay = RETRY_MINUTES[post.retry_count];
      const next = new Date(Date.now() + delay * 60_000).toISOString();
      await db
        .from("social_post")
        .update({ retry_count: post.retry_count + 1, scheduled_at: next, last_attempt_at: null, failure_reason: `일시 오류, ${delay}분 뒤 재시도: ${err.message}` })
        .eq("id", post.id);
      return { slug: post.slug, result: "retry", detail: `${delay}분 뒤 재시도` };
    }
    await markFailed(db, post, scrub(err.message));
    return { slug: post.slug, result: "failed", detail: scrub(err.message) };
  }
}

async function markFailed(db: SupabaseClient, post: SocialPostRow, reason: string) {
  await db.from("social_post").update({ status: "failed", failure_reason: reason.slice(0, 500), last_attempt_at: null }).eq("id", post.id);
}

/** 오류 문자열에서 토큰 흔적을 지운다 */
export function scrub(s: string): string {
  return String(s ?? "").replace(/access_token=[^&\s]+/gi, "access_token=[redacted]").replace(/IG[A-Za-z0-9_-]{20,}/g, "[redacted]");
}
