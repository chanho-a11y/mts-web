import { z } from "zod";
import { withTool } from "../policy";
import type { OrderRow, ToolContext } from "../types";

const RO = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };

export const ORDER_STATUS = [
  "created",
  "paid",
  "preparing",
  "shipped",
  "in_transit",
  "delivered",
  "cancelled",
  "refunded",
  "partial_refunded",
  "expired",
] as const;

/** 매출로 집계하는 상태 */
export const REVENUE_STATUS: string[] = [
  "paid",
  "preparing",
  "shipped",
  "in_transit",
  "delivered",
  "partial_refunded",
];

export const searchOrders = {
  name: "commerce_search_orders",
  config: {
    title: "주문 검색",
    description:
      "기간·상태·고객유형으로 주문을 검색한다. 요약 필드만 반환하며 개인정보는 마스킹된다.",
    inputSchema: {
      from: z.string().optional().describe("ISO 날짜. 주문일 기준 시작"),
      to: z.string().optional(),
      status: z.enum(ORDER_STATUS).optional(),
      customer_type: z.string().optional(),
      order_no: z.string().optional(),
      limit: z.number().int().min(1).max(100).default(20),
      offset: z.number().int().min(0).default(0),
    },
    outputSchema: {
      items: z.array(z.record(z.any())),
      total: z.number(),
      has_more: z.boolean(),
      next_offset: z.number(),
      pii_note: z.string(),
    },
    annotations: RO,
  },
  handler: withTool<{
    from?: string;
    to?: string;
    status?: string;
    customer_type?: string;
    order_no?: string;
    limit?: number;
    offset?: number;
  }>("commerce_search_orders", "orders:read", async (args, ctx: ToolContext) => {
    const limit = args.limit ?? 20;
    const offset = args.offset ?? 0;

    let q = ctx.db
      .from("mcp_v_order")
      .select(
        "order_no,status,customer_type,email_masked,region,grand_total,currency,channel,coupon_code,placed_at,paid_at",
        { count: "exact" },
      );

    if (args.from) q = q.gte("placed_at", args.from);
    if (args.to) q = q.lte("placed_at", args.to);
    if (args.status) q = q.eq("status", args.status);
    if (args.customer_type) q = q.eq("customer_type", args.customer_type);
    if (args.order_no) q = q.eq("order_no", args.order_no);

    const { data, error, count } = await q
      .order("placed_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw new Error(`주문을 조회하지 못했습니다: ${error.message}`);

    const items = (data ?? []) as OrderRow[];
    return {
      items,
      total: count ?? items.length,
      has_more: (count ?? 0) > offset + items.length,
      next_offset: offset + items.length,
      pii_note: "이메일은 마스킹되어 있다. 원문은 customers:pii 권한이 필요하다.",
    };
  }),
};

export const getOrder = {
  name: "commerce_get_order",
  config: {
    title: "주문 상세",
    description:
      "주문번호로 주문 1건과 품목·결제 요약을 조회한다. 품목마다 적용 단가와 그 근거(price_source)가 함께 나온다. 결제 원문과 배송 상세주소는 반환하지 않는다.",
    inputSchema: { order_no: z.string().optional(), id: z.string().uuid().optional() },
    outputSchema: {
      order: z.record(z.any()),
      items: z.array(z.record(z.any())),
      payments: z.array(z.record(z.any())),
      shipments: z.array(z.record(z.any())),
    },
    annotations: RO,
  },
  handler: withTool<{ order_no?: string; id?: string }>(
    "commerce_get_order",
    "orders:read",
    async (args, ctx: ToolContext) => {
      if (!args.order_no && !args.id) {
        throw new Error("order_no 또는 id 가 필요합니다. commerce_search_orders 로 후보를 조회하세요.");
      }
      let q = ctx.db.from("mcp_v_order").select("*");
      q = args.order_no ? q.eq("order_no", args.order_no) : q.eq("id", args.id);
      const { data, error } = await q.maybeSingle();
      if (error) throw new Error(`주문을 조회하지 못했습니다: ${error.message}`);
      const o = data as OrderRow | null;
      if (!o) throw new Error(`주문을 찾지 못했습니다 (${args.order_no ?? args.id}).`);

      const { data: items } = await ctx.db
        .from("mcp_v_order_item")
        .select("sku,title_snapshot,option_snapshot,unit_price,price_source,qty,cancelled_qty,line_total")
        .eq("order_id", o.id);
      const { data: pays } = await ctx.db
        .from("mcp_v_payment")
        .select("provider,method,status,amount,currency,approved_at")
        .eq("order_id", o.id);
      const { data: ships } = await ctx.db
        .from("mcp_v_shipment")
        .select("carrier,status,shipped_at")
        .eq("order_id", o.id);

      return { order: o, items: items ?? [], payments: pays ?? [], shipments: ships ?? [] };
    },
  ),
};
