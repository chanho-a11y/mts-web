import { z } from "zod";
import { withTool } from "../policy";
import type { PriceResult, ToolContext } from "../types";

const RO = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };

const SOURCE_LABEL: Record<string, string> = {
  individual: "회원 개별가",
  tier: "등급가",
  base: "기본 소비자가",
};

export const resolvePrice = {
  name: "commerce_resolve_price",
  config: {
    title: "적용 단가 확정",
    description:
      "특정 고객이 특정 옵션을 살 때의 최종 단가와 그 근거를 반환한다. 근거는 individual(회원 개별가) / tier(등급가) / base(기본가) 중 하나이며, 체크아웃과 동일한 규칙으로 계산된다.",
    inputSchema: {
      variant_id: z.string().uuid().optional(),
      sku: z.string().optional(),
      profile_id: z.string().uuid().optional(),
      at: z.string().optional().describe("ISO8601. 미지정 시 현재 시각"),
    },
    outputSchema: {
      variant_id: z.string(),
      profile_id: z.string().nullable(),
      price: z.number().nullable(),
      currency: z.string(),
      price_source: z.string().nullable(),
      source_label: z.string().nullable(),
      evaluated_at: z.string(),
    },
    annotations: RO,
  },
  handler: withTool<{ variant_id?: string; sku?: string; profile_id?: string; at?: string }>(
    "commerce_resolve_price",
    "pricing:read",
    async (args, ctx: ToolContext) => {
      let vid = args.variant_id;
      if (!vid && args.sku) {
        const { data: v } = await ctx.db
          .from("mcp_v_variant")
          .select("id")
          .eq("sku", args.sku)
          .maybeSingle();
        if (!v) {
          throw new Error(
            `SKU 를 찾지 못했습니다 (${args.sku}). commerce_get_product 로 옵션 목록을 확인하세요.`,
          );
        }
        vid = (v as { id: string }).id;
      }
      if (!vid) throw new Error("variant_id 또는 sku 가 필요합니다.");

      const at = args.at ?? new Date().toISOString();
      const { data, error } = await ctx.db.rpc("mcp_resolve_price", {
        p_variant_id: vid,
        p_profile_id: args.profile_id ?? null,
        p_at: at,
      });
      if (error) throw new Error(`단가를 확정하지 못했습니다: ${error.message}`);

      const row = (Array.isArray(data) ? data[0] : data) as PriceResult | null;
      return {
        variant_id: vid,
        profile_id: args.profile_id ?? null,
        price: row?.price ?? null,
        currency: "KRW",
        price_source: row?.source ?? null,
        source_label: row?.source ? SOURCE_LABEL[row.source] ?? null : null,
        evaluated_at: at,
      };
    },
  ),
};

export const listPriceOverrides = {
  name: "commerce_list_price_overrides",
  config: {
    title: "고객별 개별가 목록",
    description: "고객 또는 옵션 기준으로 회원 개별가(유효기간 포함)를 조회한다.",
    inputSchema: {
      profile_id: z.string().uuid().optional(),
      variant_id: z.string().uuid().optional(),
      limit: z.number().int().min(1).max(200).default(50),
    },
    outputSchema: { items: z.array(z.record(z.any())), total: z.number() },
    annotations: RO,
  },
  handler: withTool<{ profile_id?: string; variant_id?: string; limit?: number }>(
    "commerce_list_price_overrides",
    "pricing:read",
    async (args, ctx: ToolContext) => {
      let q = ctx.db
        .from("mcp_v_customer_price")
        .select("profile_id,variant_id,price,starts_at,ends_at,note", { count: "exact" });
      if (args.profile_id) q = q.eq("profile_id", args.profile_id);
      if (args.variant_id) q = q.eq("variant_id", args.variant_id);

      const { data, error, count } = await q.limit(args.limit ?? 50);
      if (error) throw new Error(`개별가를 조회하지 못했습니다: ${error.message}`);
      return { items: data ?? [], total: count ?? (data ?? []).length };
    },
  ),
};
