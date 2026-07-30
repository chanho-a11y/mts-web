/**
 * MTSPACE COMMERCE MCP — 툴 등록 진입점.
 *
 * 이 디렉터리는 장차 사설 패키지 @mts/commerce-mcp 로 추출된다.
 * app/ · lib/ · components/ 를 import 하지 않는다(mcp/README.md 의 경계 규칙).
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { loadConfig } from "./config";
import { createDb, McpSetupError } from "./db";
import { resolveIdentity, McpAuthError } from "./auth";
import { makeAudit } from "./policy";
import type { ToolContext } from "./types";

import { getShopInfo, getSchema } from "./tools/context";
import { searchProducts, getProduct, getInventory } from "./tools/catalog";
import { resolvePrice, listPriceOverrides } from "./tools/pricing";
import { searchOrders, getOrder } from "./tools/orders";
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
  runReport,
];

export { McpSetupError, McpAuthError };

/** 요청 1건에 대한 실행 컨텍스트를 만든다. 실패는 조용히 넘기지 않는다. */
export async function createContext(req: Request): Promise<ToolContext> {
  const { db, mode } = await createDb();
  const identity = await resolveIdentity(req, db);
  const config = await loadConfig(db);
  if (mode === "fallback") {
    console.warn(`[mcp] fallback 모드 요청 — token=${identity.tokenName}`);
  }
  return { config, identity, db, audit: makeAudit(db, identity) };
}

/**
 * 툴을 서버에 등록한다.
 * getContext 는 요청마다 호출되며, 인증 실패 시 예외를 던진다.
 */
export function registerTools(server: McpServer, getContext: () => Promise<ToolContext>): void {
  for (const tool of TOOLS) {
    server.registerTool(tool.name, tool.config as never, (async (args: never) => {
      const ctx = await getContext();
      return tool.handler(args as never, ctx);
    }) as never);
  }
}

export const TOOL_NAMES = TOOLS.map((t) => t.name);
