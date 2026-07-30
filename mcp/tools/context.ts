import { z } from "zod";
import { withTool } from "../policy";
import type { ToolContext } from "../types";

export const getShopInfo = {
  name: "commerce_get_shop_info",
  config: {
    title: "상점 정보",
    description:
      "이 MCP가 제어하는 상점·브랜드·통화·활성 모듈·스키마 버전과 데이터 규모를 반환한다. 세션에서 가장 먼저 호출할 것.",
    inputSchema: {},
    outputSchema: {
      shop: z.record(z.any()),
      currency: z.string(),
      schema_version: z.string(),
      enabled_modules: z.array(z.string()),
      counts: z.record(z.number()),
      next_step: z.string(),
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  handler: withTool("commerce_get_shop_info", null, async (_args, ctx: ToolContext) => {
    const { data: shop, error } = await ctx.db.from("mcp_v_shop").select("*").maybeSingle();
    if (error) throw new Error(`상점 정보를 읽지 못했습니다: ${error.message}`);

    const { count: products } = await ctx.db
      .from("mcp_v_product")
      .select("id", { count: "exact", head: true });
    const { count: orders } = await ctx.db
      .from("mcp_v_order")
      .select("id", { count: "exact", head: true });

    return {
      shop: shop ?? {},
      currency: "KRW",
      schema_version: ctx.config.schemaVersion,
      enabled_modules: ctx.config.enabledModules,
      counts: { products: products ?? 0, orders: orders ?? 0 },
      next_step: "제품 속성 어휘는 commerce_get_schema 로 확인하세요.",
    };
  }),
};

export const getSchema = {
  name: "commerce_get_schema",
  config: {
    title: "데이터 모델·제품 속성",
    description:
      "이 상점의 제품이 어떤 속성을 갖는지(업종별로 다름)와 조회 가능한 데이터 모델을 반환한다. 제품 관련 질문 전에 호출하면 정확한 속성명을 쓸 수 있다.",
    inputSchema: {},
    outputSchema: {
      product_attributes: z.array(z.record(z.any())),
      attribute_note: z.string(),
      entities: z.array(z.record(z.any())),
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  handler: withTool("commerce_get_schema", null, async (_args, ctx: ToolContext) => {
    return {
      product_attributes: ctx.config.attributes,
      attribute_note:
        "attributes 는 업종별 속성이다. 키 목록은 이 상점 고유이며, 다른 상점에서는 다르다.",
      entities: [
        { name: "product", tool: "commerce_search_products / commerce_get_product", key: "slug" },
        { name: "variant", tool: "commerce_get_product(include=variants)", key: "sku" },
        { name: "inventory", tool: "commerce_get_inventory", note: "판매 가능 재고. 생산·원료 재고가 아님" },
        { name: "price", tool: "commerce_resolve_price", note: "근거는 individual / tier / base" },
        { name: "order", tool: "commerce_search_orders / commerce_get_order", key: "order_no" },
        { name: "report", tool: "commerce_run_report" },
      ],
    };
  }),
};
