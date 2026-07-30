/**
 * MCP 엔드포인트 (Streamable HTTP, stateless).
 *
 * 이 파일은 어댑터일 뿐이다. 실제 로직은 mcp/ 안에 있고, 그쪽이 장차 사설 패키지로 추출된다.
 * 고객사 인스턴스에서는 이 파일만 복사해 붙이면 된다.
 *
 * 설계 요점 두 가지
 *  ① 인증은 요청 진입 시점에 한 번 한다. 툴 호출 시점이 아니다.
 *     → 토큰 없는 tools/list 로 툴 표면이 열람되지 않고,
 *       미인증 요청에 401 + WWW-Authenticate 가 나가 OAuth 디스커버리(P1)와 맞물린다.
 *  ② mcp-handler 는 툴 콜백에 원본 Request 를 넘겨주지 않는다.
 *     모듈 전역 변수로 보관하면 한 인스턴스가 요청을 동시 처리할 때 섞이므로
 *     AsyncLocalStorage 로 요청 단위 격리를 보장한다.
 */
import { AsyncLocalStorage } from "node:async_hooks";
import { createMcpHandler } from "mcp-handler";
import {
  createContext,
  registerTools,
  McpAuthError,
  McpSetupError,
  type ToolContextRef,
} from "@/mcp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const store = new AsyncLocalStorage<ToolContextRef>();

const handler = createMcpHandler(
  (server) => {
    registerTools(server, () => {
      const ctx = store.getStore()?.ctx;
      if (!ctx) throw new McpAuthError("요청 컨텍스트를 찾지 못했습니다.");
      return ctx;
    });
  },
  {},
  { basePath: "/api" },
);

function unauthorized(message: string, hint?: string): Response {
  return Response.json(
    { error: "unauthorized", message, hint },
    {
      status: 401,
      headers: {
        // MCP 인가 스펙: 클라이언트가 보호리소스 메타데이터를 찾을 수 있게 한다(P1 OAuth 대비).
        "WWW-Authenticate": 'Bearer realm="mcp", error="invalid_token"',
      },
    },
  );
}

// Next.js 라우트 파일은 허용된 export 만 가질 수 있다 → 이 함수는 내보내지 않는다.
async function handle(req: Request): Promise<Response> {
  let ctx;
  try {
    ctx = await createContext(req);
  } catch (e) {
    if (e instanceof McpAuthError) return unauthorized(e.message, e.hint);
    if (e instanceof McpSetupError) {
      return Response.json(
        { error: "setup_required", message: e.message, remedy: e.remedy },
        { status: 503 },
      );
    }
    console.error("[mcp] 컨텍스트 생성 실패", e);
    return Response.json({ error: "internal_error" }, { status: 500 });
  }

  return store.run({ ctx }, async () => {
    try {
      return await handler(req);
    } catch (e) {
      console.error("[mcp] 처리 실패", e);
      return Response.json({ error: "internal_error" }, { status: 500 });
    }
  });
}

export const GET = handle;
export const POST = handle;
export const DELETE = handle;
