/**
 * OAuth 2.0 Protected Resource Metadata (RFC 9728).
 *
 * MCP 클라이언트(Claude)는 401 을 받으면 이 문서를 찾아 "어느 인가서버로 가야 하는가"를 알아낸다.
 * 인가서버(Supabase)가 아니라 **보호 리소스인 우리가** 제공해야 하는 문서다.
 *
 * 주의: Supabase 의 issuer 는 루트가 아니라 `<project>/auth/v1` 이다.
 * 루트를 적으면 클라이언트가 디스커버리에 실패한다.
 */
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function base(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
  return url.replace(/\/+$/, "");
}

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/+$/, "");
}

export async function GET() {
  const supabase = base();
  if (!supabase) {
    return NextResponse.json(
      { error: "setup_required", message: "NEXT_PUBLIC_SUPABASE_URL 이 설정되지 않았습니다." },
      { status: 503 },
    );
  }

  return NextResponse.json(
    {
      resource: `${siteUrl()}/api/mcp`,
      authorization_servers: [`${supabase}/auth/v1`],
      bearer_methods_supported: ["header"],
      scopes_supported: ["openid", "email", "profile"],
      resource_documentation: `${siteUrl()}/api/mcp`,
    },
    {
      headers: {
        // 디스커버리 문서는 인증 없이 읽혀야 한다.
        "Cache-Control": "public, max-age=300",
        "Access-Control-Allow-Origin": "*",
      },
    },
  );
}
