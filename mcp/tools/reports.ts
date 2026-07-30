import { z } from "zod";
import { withTool } from "../policy";
import { REVENUE_STATUS } from "./orders";
import type { OrderRow, ToolContext } from "../types";

const RO = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };

type Bucket = "day" | "week" | "month";

function bucketOf(iso: string | null, g: Bucket): string {
  if (!iso) return "unknown";
  const d = new Date(iso);
  if (g === "day") return d.toISOString().slice(0, 10);
  if (g === "month") return d.toISOString().slice(0, 7);
  const t = new Date(d);
  t.setUTCDate(t.getUTCDate() - ((t.getUTCDay() + 6) % 7));
  return t.toISOString().slice(0, 10);
}

const MAX_ORDERS = 5000;

export const runReport = {
  name: "commerce_run_report",
  config: {
    title: "사전 정의 리포트",
    description:
      "안전한 사전 정의 리포트를 실행한다. sales_by_period(기간별 매출) / top_products(상위 상품) / b2b_vs_b2c(고객유형별) / aov_repeat(객단가·재구매) / channel_mix(채널별) / discount_impact(할인 영향).",
    inputSchema: {
      report: z.enum([
        "sales_by_period",
        "top_products",
        "b2b_vs_b2c",
        "aov_repeat",
        "channel_mix",
        "discount_impact",
      ]),
      from: z.string().optional(),
      to: z.string().optional(),
      granularity: z.enum(["day", "week", "month"]).default("month"),
      limit: z.number().int().min(1).max(50).default(10),
    },
    outputSchema: { report: z.string(), rows: z.array(z.record(z.any())) },
    annotations: RO,
  },
  handler: withTool<{
    report: string;
    from?: string;
    to?: string;
    granularity?: Bucket;
    limit?: number;
  }>("commerce_run_report", "analytics:read", async (args, ctx: ToolContext) => {
    const g: Bucket = args.granularity ?? "month";
    const limit = args.limit ?? 10;

    let q = ctx.db
      .from("mcp_v_order")
      .select("id,order_no,placed_at,status,customer_type,profile_id,channel,grand_total,discount_total,items_subtotal")
      .in("status", REVENUE_STATUS);
    if (args.from) q = q.gte("placed_at", args.from);
    if (args.to) q = q.lte("placed_at", args.to);

    const { data, error } = await q.limit(MAX_ORDERS);
    if (error) throw new Error(`리포트를 계산하지 못했습니다: ${error.message}`);
    const orders = (data ?? []) as OrderRow[];

    const truncated =
      orders.length >= MAX_ORDERS
        ? `주문 ${MAX_ORDERS}건에서 잘렸습니다. from/to 로 기간을 좁히세요.`
        : undefined;

    const sum = (f: (o: OrderRow) => number) => orders.reduce((s, o) => s + (f(o) || 0), 0);

    if (args.report === "sales_by_period") {
      const m = new Map<string, { period: string; orders: number; revenue: number; discount: number }>();
      for (const o of orders) {
        const k = bucketOf(o.placed_at, g);
        const cur = m.get(k) ?? { period: k, orders: 0, revenue: 0, discount: 0 };
        cur.orders += 1;
        cur.revenue += o.grand_total ?? 0;
        cur.discount += o.discount_total ?? 0;
        m.set(k, cur);
      }
      const rows = [...m.values()].sort((a, b) => a.period.localeCompare(b.period));
      return { report: args.report, granularity: g, rows, currency: "KRW", truncated };
    }

    if (args.report === "b2b_vs_b2c" || args.report === "channel_mix") {
      const key = args.report === "b2b_vs_b2c" ? "customer_type" : "channel";
      const m = new Map<string, { group: string; orders: number; revenue: number }>();
      for (const o of orders) {
        const k = String((o as unknown as Record<string, unknown>)[key] ?? "unknown");
        const cur = m.get(k) ?? { group: k, orders: 0, revenue: 0 };
        cur.orders += 1;
        cur.revenue += o.grand_total ?? 0;
        m.set(k, cur);
      }
      const rows = [...m.values()].map((r) => ({
        ...r,
        aov: r.orders ? Math.round(r.revenue / r.orders) : 0,
      }));
      return { report: args.report, group_by: key, rows, currency: "KRW", truncated };
    }

    if (args.report === "aov_repeat") {
      const byCustomer = new Map<string, number>();
      for (const o of orders) {
        const k = o.profile_id ?? `guest:${o.order_no}`;
        byCustomer.set(k, (byCustomer.get(k) ?? 0) + 1);
      }
      const revenue = sum((o) => o.grand_total ?? 0);
      const repeat = [...byCustomer.values()].filter((n) => n > 1).length;
      return {
        report: args.report,
        rows: [
          {
            orders: orders.length,
            revenue,
            aov: orders.length ? Math.round(revenue / orders.length) : 0,
            customers: byCustomer.size,
            repeat_customers: repeat,
            repeat_rate: byCustomer.size ? Number((repeat / byCustomer.size).toFixed(3)) : 0,
          },
        ],
        currency: "KRW",
        truncated,
      };
    }

    if (args.report === "discount_impact") {
      const discounted = orders.filter((o) => (o.discount_total ?? 0) > 0);
      const revenue = sum((o) => o.grand_total ?? 0);
      const discount = sum((o) => o.discount_total ?? 0);
      return {
        report: args.report,
        rows: [
          {
            orders: orders.length,
            discounted_orders: discounted.length,
            discount_total: discount,
            revenue,
            discount_ratio: revenue ? Number((discount / (revenue + discount)).toFixed(4)) : 0,
          },
        ],
        currency: "KRW",
        truncated,
      };
    }

    // top_products
    const ids = orders.map((o) => o.id);
    if (!ids.length) return { report: args.report, rows: [], currency: "KRW", truncated };

    const { data: items, error: iErr } = await ctx.db
      .from("mcp_v_order_item")
      .select("order_id,sku,title_snapshot,qty,cancelled_qty,line_total")
      .in("order_id", ids);
    if (iErr) throw new Error(`품목을 집계하지 못했습니다: ${iErr.message}`);

    const m = new Map<string, { sku: string | null; title: string | null; qty: number; revenue: number }>();
    for (const it of (items ?? []) as {
      sku: string | null;
      title_snapshot: string | null;
      qty: number | null;
      cancelled_qty: number | null;
      line_total: number | null;
    }[]) {
      const k = it.sku ?? it.title_snapshot ?? "unknown";
      const cur = m.get(k) ?? { sku: it.sku, title: it.title_snapshot, qty: 0, revenue: 0 };
      cur.qty += (it.qty ?? 0) - (it.cancelled_qty ?? 0);
      cur.revenue += it.line_total ?? 0;
      m.set(k, cur);
    }
    const rows = [...m.values()].sort((a, b) => b.revenue - a.revenue).slice(0, limit);
    return { report: args.report, rows, currency: "KRW", truncated };
  }),
};
