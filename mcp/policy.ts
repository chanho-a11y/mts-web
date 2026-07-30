/**
 * 스코프 게이트 + 감사로그 래퍼 + 응답 포맷.
 *
 * 모든 툴은 withTool() 을 거친다. 그래야 "호출 수 = 감사로그 행 수" 가 성립한다.
 */
import type { AuditEntry, DbClient, Identity, Scope, ToolContext } from "./types";

export interface ToolResult {
  content: { type: "text"; text: string }[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

export function ok(data: Record<string, unknown>): ToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    structuredContent: data,
  };
}

export function fail(message: string, nextStep?: string, code = "error"): ToolResult {
  const body = { error: message, next_step: nextStep ?? null, code };
  return {
    content: [{ type: "text", text: JSON.stringify(body, null, 2) }],
    structuredContent: body as unknown as Record<string, unknown>,
    isError: true,
  };
}

export class ScopeError extends Error {
  constructor(readonly required: Scope) {
    super(`이 작업에는 ${required} 권한이 필요합니다.`);
    this.name = "ScopeError";
  }
}

export function requireScope(identity: Identity, scope: Scope): void {
  if (!identity.scopes.includes(scope)) throw new ScopeError(scope);
}

/** 인자에서 민감값을 지운 사본 */
export function redact(args: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(args ?? {})) {
    if (/email|phone|token|password/i.test(k)) out[k] = "[redacted]";
    else if (typeof v === "string" && v.length > 200) out[k] = `${v.slice(0, 200)}…`;
    else out[k] = v;
  }
  return out;
}

export function makeAudit(db: DbClient, identity: Identity) {
  return async (entry: AuditEntry): Promise<void> => {
    try {
      await db.rpc("mcp_audit", {
        p_token_id: identity.tokenId,
        p_profile_id: identity.profileId,
        p_tool: entry.tool,
        p_args: redact(entry.args),
        p_scopes: identity.scopes,
        p_rows: entry.rowCount,
        p_ms: entry.durationMs,
        p_status: entry.status,
        p_error: entry.errorCode ?? null,
        p_pii: entry.piiUnmasked ?? false,
        p_sql: entry.rawSql ?? false,
      });
    } catch {
      // 감사로그 실패가 요청을 죽이지는 않는다. 단 서버 로그에는 남긴다.
      console.error(`[mcp] 감사로그 기록 실패: ${entry.tool}`);
    }
  };
}

/** 개수 추정 — 응답 축약 원칙에 따라 목록 길이를 감사로그에 남긴다 */
function countRows(data: Record<string, unknown>): number {
  const items = (data as { items?: unknown[] }).items;
  if (Array.isArray(items)) return items.length;
  const rows = (data as { rows?: unknown[] }).rows;
  if (Array.isArray(rows)) return rows.length;
  return 1;
}

export function withTool<A extends Record<string, unknown>>(
  name: string,
  scope: Scope | null,
  handler: (args: A, ctx: ToolContext) => Promise<Record<string, unknown>>,
) {
  return async (args: A, ctx: ToolContext): Promise<ToolResult> => {
    const started = Date.now();
    try {
      if (scope) requireScope(ctx.identity, scope);
      const data = await handler(args ?? ({} as A), ctx);
      await ctx.audit({
        tool: name,
        args,
        rowCount: countRows(data),
        durationMs: Date.now() - started,
        status: "ok",
      });
      return ok(data);
    } catch (e) {
      const err = e as Error;
      const denied = err.name === "ScopeError";
      await ctx.audit({
        tool: name,
        args,
        rowCount: 0,
        durationMs: Date.now() - started,
        status: denied ? "denied" : "error",
        errorCode: err.name,
      });
      return fail(
        err.message,
        denied ? "다른 권한의 토큰이 필요합니다. 관리자에게 문의하세요." : undefined,
        err.name,
      );
    }
  };
}
