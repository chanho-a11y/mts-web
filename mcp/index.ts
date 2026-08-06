/**
 * COMMERCE MCP — 툴 등록 진입점.
 *
 * 이 디렉터리는 장차 사설 패키지 @<scope>/commerce-mcp 로 추출된다.
 * app/ · lib/ · components/ 를 import 하지 않는다(mcp/README.md 의 경계 규칙).
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { loadConfig } from "./config";
import { createDb, McpSetupError } from "./db";
import { resolveIdentity, McpAuthError } from "./auth";
import { makeAudit } from "./policy";
import type { ToolContext } from "./types";

import { getShopInfo, getSchema } from "./tools/context";
import {
  searchProducts,
  getProduct,
  getInventory,
  proposeProductUpdate,
  listProductChanges,
} from "./tools/catalog";
import { resolvePrice, listPriceOverrides } from "./tools/pricing";
import { searchOrders, getOrder } from "./tools/orders";
import { searchCustomers, getCustomer } from "./tools/customers";
import { getBrandTokens, searchContent, getPost, draftPost } from "./tools/content";
import { createImage } from "./tools/assets";
import { runReport } from "./tools/reports";

const TOOLS = [
  getShopInfo,
  getSchema,
  searchProducts,
  getProduct,
  getInventory,
  resolvePrice,
  listPriceOverrides,
  searchOrders,
  getOrder,
  searchCustomers,
  getCustomer,
  runReport,
  getBrandTokens,
  searchContent,
  getPost,
  listProductChanges,
  // ── 쓰기 툴 2종. 둘 다 라이브를 직접 바꾸지 못한다 ──
  // 블로그: 초안(draft)만 저장. 발행·발행글 수정·삭제 불가(tools/content.ts 머리말)
  draftPost,
  // 상품: 제안만 등록. 반영은 관리자가 /admin/products/changes 에서 한다(tools/catalog.ts 머리말)
  proposeProductUpdate,
  // 자산: mcp/ 프리픽스 안에 커버 이미지만 만든다. 덮어쓰기·삭제 불가(tools/assets.ts 머리말)
  createImage,
];

export { McpSetupError, McpAuthError };
export type { ToolContext };

/** AsyncLocalStorage 에 담는 요청 단위 컨테이너 */
export interface ToolContextRef {
  ctx: ToolContext;
}

/**
 * 요청 1건에 대한 실행 컨텍스트를 만든다.
 *
 * 라우트가 요청 진입 시점에 한 번 호출한다(툴 호출 시점이 아니다).
 * 그래야 인증 실패가 툴 에러가 아니라 HTTP 401 로 나가고,
 * 토큰 없는 tools/list 로 툴 표면이 열람되지 않는다.
 */
export async function createContext(req: Request): Promise<ToolContext> {
  const { db, storage, mode } = await createDb();
  const identity = await resolveIdentity(req, db);
  const config = await loadConfig(db);
  if (mode === "fallback") {
    console.warn(`[mcp] fallback 모드 요청 — token=${identity.tokenName}`);
  }
  return { config, identity, db, storage, audit: makeAudit(db, identity) };
}

/**
 * 툴을 서버에 등록한다.
 * getContext 는 이미 인증을 통과한 컨텍스트를 반환해야 한다.
 */
export function registerTools(server: McpServer, getContext: () => ToolContext): void {
  for (const tool of TOOLS) {
    server.registerTool(tool.name, tool.config as never, (async (args: never) =>
      tool.handler(args as never, getContext())) as never);
  }
}

export const TOOL_NAMES = TOOLS.map((t) => t.name);
