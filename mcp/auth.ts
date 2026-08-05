/**
 * 인증 어댑터 — 경로 두 개, 인가는 하나.
 *
 *   A) OAuth 2.1 액세스 토큰 (기본 경로)
 *      고객사 사람들이 claude.ai 커넥터로 붙는 정상 경로.
 *      JWKS 로 검증해 sub 만 꺼내고, 인가는 profiles.role 이 결정한다.
 *      액세스 토큰은 DB 에 닿지 않는다 — 이유는 oauth.ts 머리말 참조.
 *
 *   B) 정적 토큰 mcpk_* (MTS 운영 경로)
 *      납품 검수·비상 접근 전용. 고객사 사람에게 주지 않는다.
 *      인도 전 revoked_at 을 찍는다(checklists/launch.md).
 *      즉시 폐기가 가능하고 사람 없이 실행되므로 자동화·검수에 쓴다.
 *
 * 두 경로 모두 profiles.role 로 수렴한다. 인가 로직은 한 곳뿐이다.
 * 토큰의 scopes 는 "더 좁히는" 용도로만 쓰인다(교집합). 넓히지 못한다.
 */
import { createHash } from "node:crypto";
import { looksLikeJwt, verifyAccessToken } from "./oauth";
import type { DbClient, Identity, Scope } from "./types";

/** 정적 토큰 접두사. 경로 분기의 기준이다. */
const STATIC_TOKEN_PREFIX = "mcpk_";

/** 프로덕션에서 정적 토큰 경로를 닫고 싶으면 MCP_ALLOW_STATIC_TOKEN=0 으로 둔다. */
const STATIC_TOKEN_ENABLED = (process.env.MCP_ALLOW_STATIC_TOKEN ?? "1") !== "0";

export class McpAuthError extends Error {
  constructor(message: string, readonly hint?: string) {
    super(message);
    this.name = "McpAuthError";
  }
}

const ALL: Scope[] = [
  "catalog:read",
  "inventory:read",
  "pricing:read",
  "orders:read",
  "orders:raw",
  "customers:read",
  "customers:pii",
  "analytics:read",
  "analytics:sql",
  "content:read",
  "content:write",
  "brand:read",
];

/**
 * 현재 DB의 customer_role enum: guest | individual | business | influencer | admin.
 * 직원 세부 역할(manager·cs·marketer·analyst·operator)은 아직 스키마에 없다 → P1에서 추가.
 * 그때까지 세분화가 필요하면 토큰 scopes 로 좁힌다.
 */
const ROLE_SCOPES: Record<string, Scope[]> = {
  admin: ALL,
  business: [],
  individual: [],
  influencer: [],
  guest: [],
};

function sha256(v: string): string {
  return createHash("sha256").update(v, "utf8").digest("hex");
}

function extractToken(req: Request): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  const custom = req.headers.get("x-mcp-token");
  return custom?.trim() || null;
}

function intersect(a: Scope[], b: Scope[]): Scope[] {
  const set = new Set(b);
  return a.filter((s) => set.has(s));
}

/** role → 실효 스코프. 권한 없는 역할은 여기서 걸러진다. */
function scopesForRole(role: string): Scope[] {
  const roleScopes = ROLE_SCOPES[role] ?? [];
  if (roleScopes.length === 0) {
    throw new McpAuthError(
      `이 계정 역할(${role})에는 MCP 접근 권한이 없습니다.`,
      "관리자에게 권한을 요청하세요.",
    );
  }
  return roleScopes;
}

export async function resolveIdentity(req: Request, db: DbClient): Promise<Identity> {
  const presented = extractToken(req);
  if (!presented) {
    throw new McpAuthError(
      "인증 토큰이 없습니다.",
      "커넥터를 다시 연결해 인증을 완료하세요.",
    );
  }

  // ── 경로 A: OAuth 액세스 토큰 ────────────────────────────────────
  // 정적 토큰 접두사가 아니고 JWT 모양이면 OAuth 로 본다.
  if (!presented.startsWith(STATIC_TOKEN_PREFIX) && looksLikeJwt(presented)) {
    return resolveOAuthIdentity(presented, db);
  }

  // ── 경로 B: 정적 토큰 ────────────────────────────────────────────
  if (!STATIC_TOKEN_ENABLED) {
    throw new McpAuthError(
      "이 환경에서는 정적 토큰이 비활성화되어 있습니다.",
      "OAuth 로 커넥터를 연결하세요.",
    );
  }

  // 환경변수 기반 부트스트랩 토큰은 제공하지 않는다.
  // 폐기 불가·만료 없음·감사 귀속 불가 자격증명이 되기 때문이다(결함 03).
  // 최초 연결도 mcp_token 행을 발급해서 쓴다 — db/README.md 의 토큰 발급 절차 참조.

  const { data, error } = await db.rpc("mcp_verify_token", { p_hash: sha256(presented) });
  if (error) {
    throw new McpAuthError(
      `토큰 검증에 실패했습니다: ${error.message}`,
      "MCP 설치 SQL(db/install.sql) 적용 여부와 mcp_verify_token EXECUTE 권한을 확인하세요.",
    );
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    throw new McpAuthError("유효하지 않거나 폐기된 토큰입니다.", "관리자 화면에서 토큰을 재발급하세요.");
  }

  const roleScopes = scopesForRole(String(row.role));

  const tokenScopes = (row.scopes ?? []) as Scope[];
  const effective = tokenScopes.length ? intersect(roleScopes, tokenScopes) : roleScopes;

  // 사용 흔적. 실패해도 요청을 막지 않는다.
  void db.rpc("mcp_touch_token", { p_token_id: row.token_id });

  return {
    tokenId: row.token_id as string,
    profileId: row.profile_id as string,
    role: String(row.role),
    scopes: effective,
    tokenName: String(row.name ?? ""),
  };
}

/**
 * OAuth 경로: 액세스 토큰 → sub → profiles.role.
 *
 * 액세스 토큰의 scope 클레임은 인가에 쓰지 않는다. Supabase 의 OAuth 스코프
 * (openid·email·profile·phone)는 데이터 접근을 제어하지 않으며 커스텀 스코프도 없다.
 * 스코프로 좁히고 싶다면 정적 토큰 경로를 쓴다.
 */
async function resolveOAuthIdentity(accessToken: string, db: DbClient): Promise<Identity> {
  let subject;
  try {
    subject = await verifyAccessToken(accessToken);
  } catch (e) {
    throw new McpAuthError(
      `액세스 토큰 검증에 실패했습니다: ${e instanceof Error ? e.message : String(e)}`,
      "커넥터를 다시 연결해 인증을 갱신하세요.",
    );
  }

  const { data, error } = await db.rpc("mcp_verify_subject", { p_sub: subject.sub });
  if (error) {
    throw new McpAuthError(
      `신원 조회에 실패했습니다: ${error.message}`,
      "mcp_verify_subject 함수 설치 여부와 mcp_reader EXECUTE 권한을 확인하세요.",
    );
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    // 계정이 없거나 archived 다. 어느 쪽인지 알려주지 않는다(계정 존재 여부 노출 방지).
    throw new McpAuthError(
      "이 계정으로는 MCP 에 접근할 수 없습니다.",
      "관리자에게 계정 상태를 확인하세요.",
    );
  }

  return {
    // 정적 토큰이 아니므로 token_id 가 없다. 감사로그에서 OAuth 경로를 구분하는 표식이 된다.
    tokenId: null,
    profileId: row.profile_id as string,
    role: String(row.role),
    scopes: scopesForRole(String(row.role)),
    tokenName: subject.clientId ? `oauth:${subject.clientId}` : "oauth",
  };
}
