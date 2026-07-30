/**
 * MCP 엔드포인트 (Streamable HTTP, stateless).
 *
 * 이 파일은 어댑터일 뿐이다. 실제 로직은 mcp/ 안에 있고, 그쪽이 장차 사설 패키지로 추출된다.
 * 고객사 인스턴스에서는 이 파일만 복사해 붙이면 된다.
 *
 * mcp-handler 는 툴 콜백에 원본 Request 를 넘겨주지 않는다.
 * 모듈 전역 변수로 보관하면 Fluid Compute 처럼 한 인스턴스가 요청을 동시 처리할 때 섞인다.
 * → AsyncLocalStorage 로 요청 단위 격리를 보장한다.
 */
import { AsyncLocalStorage } from "node:async_hooks";
import { createMcpHandler } from "mcp-handler";
import { createContext, registerTools, McpAuthError, McpSetupError } from "@/mcp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const requestStore = new AsyncLocalStorage<Request>();

const handler = createMcpHandler(
  (server) => {
    registerTools(server, async () => {
      const req = requestStore.getStore();
      if (!req) throw new McpAuthError("요청 컨텍스트를 찾지 못했습니다.");
      return createContext(req);
    });
  },
  {},
  { basePath: "/api" },
);

function errorResponse(err: unknown): Response {
  if (err instanceof McpAuthError) {
    return Response.json(
      { error: "unauthorized", message: err.message, hint: err.hint },
      { status: 401, headers: { "WWW-Authenticate": 'Bearer realm="mcp"' } },
    );
  }
  if (err instanceof McpSetupError) {
    return Response.json(
      { error: "setup_required", message: err.message, remedy: err.remedy },
      { status: 503 },
    );
  }
  console.error("[mcp] 처리 실패", err);
  return Response.json({ error: "internal_error" }, { status: 500 });
}

function run(req: Request): Promise<Response> {
  return requestStore.run(req, async () => {
    try {
      return await handler(req);
    } catch (e) {
      return errorResponse(e);
    }
  });
}

export const GET = run;
export const POST = run;
export const DELETE = run;
