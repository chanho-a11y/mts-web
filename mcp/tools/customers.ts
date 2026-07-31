import { z } from "zod";
import { withTool } from "../policy";
import type { ToolContext } from "../types";

const RO = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };

/**
 * 고객 툴.
 * 성명·상호·이메일·전화는 DB 뷰에서 이미 마스킹된 상태로만 온다.
 * 마스킹 해제 경로는 제공하지 않는다 — 원문이 필요하면 관리자 화면을 쓴다.
 */

export const searchCustomers = {
  name: "commerce_search_customers",
  config: {
    title: "고객 검색",
    description:
      "역할·가격등급·사업자 승인상태로 고객을 검색한다. 개인정보는 전부 마스킹된 상태로 반환된다(해제 경로 없음).",
    inputSchema: {
      role: z.enum(["guest", "individual", "business", "influencer", "admin"]).optional(),
      business_status: z.enum(["pending", "approved", "rejected"]).optional(),
      price_tier: z.string().optional().describe("등급명. 예: 도매-기본"),
      is_b2b: z.boolean().optional(),
      include_archived: z.boolean().default(false),
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
    role?: string;
    business_status?: string;
    price_tier?: string;
    is_b2b?: boolean;
    include_archived?: boolean;
    limit?: number;
    offset?: number;
  }>("commerce_search_customers", "customers:read", async (args, ctx: ToolContext) => {
    const limit = args.limit ?? 20;
    const offset = args.offset ?? 0;

    let q = ctx.db
      .from("mcp_v_customer")
      .select(
        "id,name_masked,email_masked,phone_masked,role,price_tier,is_b2b,company_name_masked,business_status,approved_at,created_at",
        { count: "exact" },
      );

    if (args.role) q = q.eq("role", args.role);
    if (args.business_status) q = q.eq("business_status", args.business_status);
    if (args.price_tier) q = q.eq("price_tier", args.price_tier);
    if (typeof args.is_b2b === "boolean") q = q.eq("is_b2b", args.is_b2b);
    if (!args.include_archived) q = q.eq("archived", false);

    const { data, error, count } = await q
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw new Error(`고객을 조회하지 못했습니다: ${error.message}`);

    const items = (data ?? []) as Record<string, unknown>[];
    return {
      items,
      total: count ?? items.length,
      has_more: (count ?? 0) > offset + items.length,
      next_offset: offset + items.length,
      pii_note: "성명·상호·이메일·전화는 마스킹돼 있으며 해제 경로는 제공되지 않는다.",
    };
  }),
};

export const getCustomer = {
  name: "commerce_get_customer",
  config: {
    title: "고객 상세",
    description:
      "고객 1건과 주문 요약·적용 중인 개별가를 조회한다. 개인정보는 마스킹된 상태로 반환된다.",
    inputSchema: { profile_id: z.string().uuid() },
    outputSchema: {
      customer: z.record(z.any()),
      order_summary: z.record(z.any()),
      price_overrides: z.array(z.record(z.any())),
      pii_note: z.string(),
    },
    annotations: RO,
  },
  handler: withTool<{ profile_id: string }>(
    "commerce_get_customer",
    "customers:read",
    async (args, ctx: ToolContext) => {
      if (!args.profile_id) {
        throw new Error("profile_id 가 필요합니다. commerce_search_customers 로 후보를 먼저 조회하세요.");
      }

      const { data: c, error } = await ctx.db
        .from("mcp_v_customer")
        .select("*")
        .eq("id", args.profile_id)
        .maybeSingle();
      if (error) throw new Error(`고객을 조회하지 못했습니다: ${error.message}`);
      if (!c) throw new Error(`고객을 찾지 못했습니다 (${args.profile_id}).`);

      const { data: orders } = await ctx.db
        .from("mcp_v_order")
        .select("order_no,status,grand_total,placed_at")
        .eq("profile_id", args.profile_id)
        .order("placed_at", { ascending: false })
        .limit(200);

      const list = (orders ?? []) as { status: string; grand_total: number | null; placed_at: string | null }[];
      const paid = list.filter((o) =>
        ["paid", "preparing", "shipped", "in_transit", "delivered", "partial_refunded"].includes(o.status),
      );
      const total = paid.reduce((s, o) => s + (o.grand_total ?? 0), 0);

      const { data: overrides } = await ctx.db
        .from("mcp_v_customer_price")
        .select("variant_id,price,starts_at,ends_at,note")
        .eq("profile_id", args.profile_id);

      return {
        customer: c as Record<string, unknown>,
        order_summary: {
          orders_total: list.length,
          orders_paid: paid.length,
          revenue: total,
          currency: ctx.config.currency,
          last_order_at: list[0]?.placed_at ?? null,
          recent: list.slice(0, 5),
        },
        price_overrides: (overrides ?? []) as Record<string, unknown>[],
        pii_note: "성명·상호·이메일·전화는 마스킹돼 있다.",
      };
    },
  ),
};
