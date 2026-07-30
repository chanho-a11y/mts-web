/**
 * DB 접근 어댑터.
 *
 * 원칙: 질의는 mcp_reader 롤로만 나간다. mcp_reader 는 어떤 테이블에도 권한이 없고
 *       mcp_v_* 뷰와 지정 함수(mcp_*)만 볼 수 있다. service_role 은 쓰지 않는다.
 *
 * 두 모드:
 *   A) reader  — SUPABASE_JWT_SECRET 으로 role=mcp_reader 단명 JWT 를 발급해 붙인다. (정상)
 *   B) fallback— MCP_ALLOW_SERVICE_FALLBACK=1 일 때만 service_role 키 사용. (마이그레이션 적용 전 개발용)
 *
 * B 는 로그에 항상 경고를 남기며, 프로덕션에서는 켜지 않는다.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SignJWT } from "jose";
import type { DbClient } from "./types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const JWT_SECRET = process.env.SUPABASE_JWT_SECRET;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ALLOW_FALLBACK = process.env.MCP_ALLOW_SERVICE_FALLBACK === "1";

export class McpSetupError extends Error {
  constructor(message: string, readonly remedy: string) {
    super(message);
    this.name = "McpSetupError";
  }
}

export type DbMode = "reader" | "fallback";

let cachedToken: { jwt: string; expiresAt: number } | null = null;

async function readerJwt(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt - 30 > now) return cachedToken.jwt;

  const secret = new TextEncoder().encode(JWT_SECRET!);
  const exp = now + 300; // 5분
  const jwt = await new SignJWT({ role: "mcp_reader" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .sign(secret);

  cachedToken = { jwt, expiresAt: exp };
  return jwt;
}

export interface DbHandle {
  db: DbClient;
  mode: DbMode;
}

export async function createDb(): Promise<DbHandle> {
  if (!SUPABASE_URL) {
    throw new McpSetupError(
      "NEXT_PUBLIC_SUPABASE_URL 이 없습니다.",
      "Vercel 프로젝트 환경변수를 확인하세요.",
    );
  }

  if (JWT_SECRET && ANON_KEY) {
    const jwt = await readerJwt();
    const client: SupabaseClient = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    return { db: client as unknown as DbClient, mode: "reader" };
  }

  if (ALLOW_FALLBACK && SERVICE_KEY) {
    console.warn(
      "[mcp] service_role 폴백으로 동작합니다. 개발 전용이며 프로덕션에서는 MCP_ALLOW_SERVICE_FALLBACK 을 끄세요.",
    );
    const client: SupabaseClient = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    return { db: client as unknown as DbClient, mode: "fallback" };
  }

  throw new McpSetupError(
    "mcp_reader 접속 정보를 구성할 수 없습니다.",
    "SUPABASE_JWT_SECRET 과 NEXT_PUBLIC_SUPABASE_ANON_KEY 를 설정하거나, 개발 중이라면 MCP_ALLOW_SERVICE_FALLBACK=1 과 SUPABASE_SERVICE_ROLE_KEY 를 설정하세요.",
  );
}
