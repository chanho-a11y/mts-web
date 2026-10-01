import { z } from "zod";
import { withTool } from "../policy";
import type { ToolContext } from "../types";
import { ga4Configured, ga4WebTrafficReport, ga4ContentPerformanceReport } from "@/lib/ga4";

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
  "b2b_lead_funnel",
  "web_traffic",
  "content_performance",
] as const;

// GA4 Data API 로 계산하는 리포트(D-129). DB 집계 리포트와 달리 세션 기준이며 RPC 를 거치지 않는다.
const GA4_REPORTS = new Set<string>(["web_traffic", "content_performance"]);

/** ISO8601 → 상점 시간대(KST) 기준 YYYY-MM-DD. 비어 있으면 최근 7일. */
function kstDate(iso: string | undefined, fallbackDaysAgo: number): string {
  const d = iso ? new Date(iso) : new Date(Date.now() - fallbackDaysAgo * 86400000);
  if (Number.isNaN(d.getTime())) throw new Error(`날짜 형식을 읽지 못했습니다: ${iso}`);
  return new Date(d.getTime() + 9 * 3600000).toISOString().slice(0, 10);
}

type ReportName = (typeof REPORTS)[number];
type DbReportName = Exclude<ReportName, "web_traffic" | "content_performance">;

interface Args extends Record<string, unknown> {
  report: ReportName;
  from?: string;
  to?: string;
  granularity?: "day" | "week" | "month";
  limit?: number;
}

const RPC: Record<DbReportName, { fn: string; args: (a: Args) => Record<string, unknown> }> = {
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
  b2b_lead_funnel: {
    fn: "mcp_report_b2b_lead_funnel",
    args: (a) => ({ p_from: a.from ?? null, p_to: a.to ?? null }),
  },
};

export const runReport = {
  name: "commerce_run_report",
  config: {
    title: "사전 정의 리포트",
    description:
      "매출·상품·고객 리포트를 실행한다. 전량 DB 집계라 절단이 없고, 기간 버킷은 상점 시간대를 따르며, 총액·환불·순액을 분리해 반환한다. " +
      "sales_by_period(기간별) / top_products(상위 상품) / b2b_vs_b2c(고객유형별) / channel_mix(채널별) / aov_repeat(객단가·재구매) / discount_impact(할인 영향) / " +
      "b2b_lead_funnel(가입·사업자 신청·납품문의·신규 거래 개시, 기본 최근 7일) / " +
      "web_traffic(GA4 채널·소스·국가·신규재방문·회원유형, 세션 기준) / content_performance(GA4 교육·블로그 조회, 랜딩, 납품문의·사업자가입 버튼 클릭). " +
      "GA4 리포트는 세션 기준이라 DB 주문 수치와 합산하지 않는다.",
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
    if (GA4_REPORTS.has(args.report)) {
      if (!ga4Configured()) throw new Error("GA4 가 설정되지 않았습니다(GA4_PROPERTY_ID·GA4_SA_EMAIL·GA4_SA_PRIVATE_KEY).");
      const from = kstDate(args.from, 7);
      const to = kstDate(args.to, 0);
      const sections =
        args.report === "web_traffic" ? await ga4WebTrafficReport(from, to) : await ga4ContentPerformanceReport(from, to);
      return {
        report: args.report,
        rows: sections as unknown as Record<string, unknown>[],
        currency: ctx.config.currency,
        basis: {
          source: "GA4 Data API (property GA4_PROPERTY_ID)",
          timezone: "Asia/Seoul",
          from,
          to,
          note:
            "세션 기준. available=false 인 섹션은 GA4 가 해당 측정기준을 아직 모르는 경우(맞춤 측정기준 등록 직후, 이벤트 수집 전)다. " +
            "engagedSessions 가 0 인 세션은 봇 의심으로 읽는다. 내부 접속은 GA4 Internal Traffic 필터가 활성일 때만 제외된다.",
          truncated: false,
        },
      };
    }

    const spec = RPC[args.report as DbReportName];
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
