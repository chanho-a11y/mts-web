/**
 * OAuth 2.1 액세스 토큰 검증 (인가서버 = Supabase OAuth Server).
 *
 * ★ 설계 요점 — 여기가 이 파일의 존재 이유다.
 *
 * Supabase 가 발급하는 액세스 토큰은 **일반 세션 토큰과 동일한 전체 사용자 권한**을 갖는다.
 * OAuth 스코프(openid·email·profile·phone)는 DB 접근을 전혀 제어하지 않는다 — 공식 문서 명시.
 * 그래서 이 토큰을 PostgREST 에 그대로 넘기면 MCP 의 읽기 전용 경계가 통째로 무너진다.
 *
 * 따라서 이 파일은 액세스 토큰을 **신원 확인에만** 쓴다:
 *   1) JWKS 로 서명·만료·발급자를 검증한다
 *   2) sub(=auth.users.id) 하나만 꺼낸다
 *   3) 인가는 profiles.role 이 결정한다 (mcp_verify_subject)
 *   4) DB 질의는 여전히 mcp_reader 토큰으로 나간다
 *
 * 결과적으로 사용자 토큰은 데이터베이스에 단 한 번도 닿지 않는다.
 * Supabase 에 revocation 엔드포인트가 없다는 한계도 우리에겐 문제가 되지 않는다 —
 * 요청마다 profiles 를 조회하므로 archived = true 한 줄로 즉시 차단된다.
 */
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;

/** 인가서버 issuer. Supabase 는 루트가 아니라 /auth/v1 이 issuer 다. */
export function issuer(): string {
  if (!SUPABASE_URL) throw new Error("NEXT_PUBLIC_SUPABASE_URL 이 없습니다.");
  return `${SUPABASE_URL.replace(/\/+$/, "")}/auth/v1`;
}

/** JWKS 는 모듈 수준에서 한 번만 만든다. jose 가 내부적으로 캐시·재시도를 처리한다. */
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
function keySet() {
  if (!jwks) jwks = createRemoteJWKSet(new URL(`${issuer()}/.well-known/jwks.json`));
  return jwks;
}

export interface OAuthSubject {
  sub: string;
  clientId: string | null;
  scope: string | null;
  expiresAt: number | null;
}

/** JWT 형태인지 헐겁게 판별한다. 정적 토큰(mcp_로 시작)과 구분하기 위한 것일 뿐 검증이 아니다. */
export function looksLikeJwt(token: string): boolean {
  const parts = token.split(".");
  return parts.length === 3 && parts.every((p) => p.length > 0) && /^[A-Za-z0-9_-]+$/.test(parts[0]);
}

/**
 * 액세스 토큰을 검증하고 sub 를 돌려준다.
 *
 * aud 는 검사하지 않는다 — Supabase 는 OAuth 액세스 토큰에도 aud="authenticated" 를 넣기 때문에
 * 이 값으로는 "이 토큰이 우리 MCP 서버용인가"를 구분할 수 없다. 대신 issuer 를 고정하고,
 * 실질적인 권한 판정을 profiles.role 로 넘긴다. (Custom Access Token Hook 으로 aud 를
 * 바꾸는 방법이 있으나, 그 훅은 앱의 일반 세션 발급에도 걸리므로 쓰지 않는다.)
 */
export async function verifyAccessToken(token: string): Promise<OAuthSubject> {
  const { payload } = await jwtVerify(token, keySet(), {
    issuer: issuer(),
    clockTolerance: 5,
  });
  const p = payload as JWTPayload & { client_id?: string; scope?: string };

  if (typeof p.sub !== "string" || p.sub.length === 0) {
    throw new Error("토큰에 sub 클레임이 없습니다.");
  }

  return {
    sub: p.sub,
    clientId: typeof p.client_id === "string" ? p.client_id : null,
    scope: typeof p.scope === "string" ? p.scope : null,
    expiresAt: typeof p.exp === "number" ? p.exp : null,
  };
}
