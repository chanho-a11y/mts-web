/**
 * 인증 어댑터 (P0 = 정적 헤더 토큰).
 *
 * 인도본에서는 OAuth 로 교체될 수 있으므로 이 파일의 인터페이스만 지키면 된다:
 *   resolveIdentity(req, db) -> Identity
 *
 * 권한(인가)은 토큰이 아니라 profiles.role 이 결정한다.
 * 토큰의 scopes 는 "더 좁히는" 용도로만 쓰인다(교집합). 넓히지 못한다.
 */
import { createHash } from "node:crypto";
import type { DbClient, Identity, Scope } from "./types";

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

export async function resolveIdentity(req: Request, db: DbClient): Promise<Identity> {
  const presented = extractToken(req);
  if (!presented) {
    throw new McpAuthError(
      "인증 토큰이 없습니다.",
      "커넥터 설정에서 Authorization 헤더(Bearer)를 지정하세요.",
    );
  }

  // 부트스트랩: mcp_token 행이 아직 없을 때 최초 연결용. 감사로그에 표시된다.
  const bootstrap = process.env.MCP_BOOTSTRAP_TOKEN;
  if (bootstrap && presented === bootstrap) {
    return {
      tokenId: null,
      profileId: null,
      role: "admin",
      scopes: ALL,
      tokenName: "bootstrap",
      bootstrap: true,
    };
  }

  const { data, error } = await db.rpc("mcp_verify_token", { p_hash: sha256(presented) });
  if (error) {
    throw new McpAuthError(
      `토큰 검증에 실패했습니다: ${error.message}`,
      "mcp-foundation SQL 적용 여부와 mcp_verify_token EXECUTE 권한을 확인하세요.",
    );
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    throw new McpAuthError("유효하지 않거나 폐기된 토큰입니다.", "관리자 화면에서 토큰을 재발급하세요.");
  }

  const roleScopes = ROLE_SCOPES[String(row.role)] ?? [];
  if (roleScopes.length === 0) {
    throw new McpAuthError(
      `이 계정 역할(${row.role})에는 MCP 접근 권한이 없습니다.`,
      "관리자 계정으로 발급된 토큰을 사용하세요.",
    );
  }

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
    bootstrap: false,
  };
}
