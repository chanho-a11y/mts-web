import { z } from "zod";
import { withTool } from "../policy";
import type { ToolContext } from "../types";

const RO = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };

/**
 * 리포트는 전부 DB 집계 함수로 계산한다.
 *
 * 이유: 애플리케이션에서 행을 가져와 합산하면 (a) 행 수 제한에 걸려 비결정적으로 잘리고
 *      (b) 시간대 버킷이 UTC 로 어긋나며 (c) 환불을 차감하지 못한다.
 *      틀린 숫자를 확신 있게 반환하는 것이 조회 실패보다 나쁘다.
 *
 * 총액(gross)·환불(refund)·순액(net)을 분리해 반환한다. 조용히 보정하지 않는다.
 */

const REPORTS = [
  "sales_by_period",
  "top_products",
  "b2b_vs_b2c",
  "channel_mix",
  "aov_repeat",
  "discount_impact",
] as const;

type ReportName = (typeof REPORTS)[number];

interface Args extends Record<string, unknown> {
  report: ReportName;
  from?: string;
  to?: string;
  granularity?: "day" | "week" | "month";
  limit?: number;
}

const RPC: Record<ReportName, { fn: string; args: (a: Args) => Record<string, unknown> }> = {
  sales_by_period: {
    fn: "mcp_report_sales_by_period",
    args: (a) => ({ p_from: a.from ?? null, p_to: a.to ?? null, p_granularity: a.granularity ?? "month" }),
  },
  top_products: {
    fn: "mcp_report_top_products",
    args: (a) => ({ p_from: a.from ?? null, p_to: a.to ?? null, p_limit: a.limit ?? 10 }),
  },
  b2b_vs_b2c: {
    fn: "mcp_report_group",
    args: (a) => ({ p_from: a.from ?? null, p_to: a.to ?? null, p_key: "customer_type" }),
  },
  channel_mix: {
    fn: "mcp_report_group",
    args: (a) => ({ p_from: a.from ?? null, p_to: a.to ?? null, p_key: "channel" }),
  },
  aov_repeat: {
    fn: "mcp_report_aov_repeat",
    args: (a) => ({ p_from: a.from ?? null, p_to: a.to ?? null }),
  },
  discount_impact: {
    fn: "mcp_report_discount_impact",
    args: (a) => ({ p_from: a.from ?? null, p_to: a.to ?? null }),
  },
};

export const runReport = {
  name: "commerce_run_report",
  config: {
    title: "사전 정의 리포트",
    description:
      "매출·상품·고객 리포트를 실행한다. 전량 DB 집계라 절단이 없고, 기간 버킷은 상점 시간대를 따르며, 총액·환불·순액을 분리해 반환한다. " +
      "sales_by_period(기간별) / top_products(상위 상품) / b2b_vs_b2c(고객유형별) / channel_mix(채널별) / aov_repeat(객단가·재구매) / discount_impact(할인 영향).",
    inputSchema: {
      report: z.enum(REPORTS),
      from: z.string().optional().describe("ISO8601. 주문일 기준 시작"),
      to: z.string().optional().describe("ISO8601. 주문일 기준 종료"),
      granularity: z.enum(["day", "week", "month"]).default("month").describe("sales_by_period 전용"),
      limit: z.number().int().min(1).max(50).default(10).describe("top_products 전용"),
    },
    outputSchema: {
      report: z.string(),
      rows: z.array(z.record(z.any())),
      currency: z.string(),
      basis: z.record(z.any()),
    },
    annotations: RO,
  },
  handler: withTool<Args>("commerce_run_report", "analytics:read", async (args, ctx: ToolContext) => {
    const spec = RPC[args.report];
    if (!spec) throw new Error(`알 수 없는 리포트입니다: ${args.report}`);

    const { data, error } = await ctx.db.rpc(spec.fn, spec.args(args));
    if (error) throw new Error(`리포트를 계산하지 못했습니다: ${error.message}`);

    const rows = (Array.isArray(data) ? data : data ? [data] : []) as Record<string, unknown>[];

    return {
      report: args.report,
      rows,
      currency: ctx.config.currency,
      basis: {
        timezone: ctx.config.timezone,
        from: args.from ?? null,
        to: args.to ?? null,
        revenue_statuses: "paid·preparing·shipped·in_transit·delivered·partial_refunded",
        note: "gross_revenue 는 주문 총액, net_revenue 는 환불 차감 후. 두 값이 다르면 환불이 있었다는 뜻이다.",
        truncated: false,
      },
    };
  }),
};
