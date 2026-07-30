import { z } from "zod";
import { listAttributeKeys, pickAttributes } from "../config";
import { withTool } from "../policy";
import type { ProductRow, ToolContext, VariantRow } from "../types";

const RO = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };

export const searchProducts = {
  name: "commerce_search_products",
  config: {
    title: "상품 검색",
    description:
      "이 상점의 상품을 요약 필드로 검색한다. 본문·상세 속성은 싣지 않으므로, 한 건의 전체 정보가 필요하면 commerce_get_product 를 쓸 것.",
    inputSchema: {
      q: z.string().optional().describe("제목(한/영)·slug 부분일치"),
      status: z.enum(["draft", "active", "archived"]).optional(),
      product_type: z.string().optional(),
      is_b2b_only: z.boolean().optional(),
      limit: z.number().int().min(1).max(100).default(20),
      offset: z.number().int().min(0).default(0),
    },
    outputSchema: {
      items: z.array(z.record(z.any())),
      total: z.number(),
      has_more: z.boolean(),
      next_offset: z.number(),
    },
    annotations: RO,
  },
  handler: withTool<{
    q?: string;
    status?: string;
    product_type?: string;
    is_b2b_only?: boolean;
    limit?: number;
    offset?: number;
  }>("commerce_search_products", "catalog:read", async (args, ctx: ToolContext) => {
    const limit = args.limit ?? 20;
    const offset = args.offset ?? 0;

    let q = ctx.db
      .from("mcp_v_product")
      .select("id,slug,title,title_en,product_type,status,is_b2b_only,weight_g,key_color,published_at,attributes", {
        count: "exact",
      });

    if (args.status) q = q.eq("status", args.status);
    if (args.product_type) q = q.eq("product_type", args.product_type);
    if (typeof args.is_b2b_only === "boolean") q = q.eq("is_b2b_only", args.is_b2b_only);
    if (args.q) {
      const term = args.q.replace(/[%,]/g, "");
      q = q.or(`title.ilike.%${term}%,title_en.ilike.%${term}%,slug.ilike.%${term}%`);
    }

    const { data, error, count } = await q
      .order("published_at", { ascending: false, nullsFirst: false })
      .range(offset, offset + limit - 1);
    if (error) throw new Error(`상품을 조회하지 못했습니다: ${error.message}`);

    const keys = listAttributeKeys(ctx.config);
    const items = (data as ProductRow[]).map((p) => ({
      slug: p.slug,
      title: p.title,
      title_en: p.title_en,
      product_type: p.product_type,
      status: p.status,
      is_b2b_only: p.is_b2b_only,
      weight_g: p.weight_g,
      key_color: p.key_color,
      published_at: p.published_at,
      attributes: pickAttributes(p.attributes, keys),
    }));

    return {
      items,
      total: count ?? items.length,
      has_more: (count ?? 0) > offset + items.length,
      next_offset: offset + items.length,
    };
  }),
};

export const getProduct = {
  name: "commerce_get_product",
  config: {
    title: "상품 상세",
    description:
      "slug 또는 id로 상품 1건을 조회한다. attributes 의 키 의미는 commerce_get_schema 를 참고할 것.",
    inputSchema: {
      slug: z.string().optional(),
      id: z.string().uuid().optional(),
      locale: z.enum(["ko", "en"]).default("ko"),
      include: z
        .array(z.enum(["variants", "images", "attributes", "evidence"]))
        .default(["variants", "attributes"]),
    },
    outputSchema: { product: z.record(z.any()) },
    annotations: RO,
  },
  handler: withTool<{ slug?: string; id?: string; locale?: "ko" | "en"; include?: string[] }>(
    "commerce_get_product",
    "catalog:read",
    async (args, ctx: ToolContext) => {
      if (!args.slug && !args.id) {
        throw new Error("slug 또는 id 가 필요합니다. commerce_search_products 로 후보를 먼저 조회하세요.");
      }
      const include = args.include ?? ["variants", "attributes"];
      const en = (args.locale ?? "ko") === "en";

      let q = ctx.db.from("mcp_v_product").select("*");
      q = args.slug ? q.eq("slug", args.slug) : q.eq("id", args.id);
      const { data, error } = await q.maybeSingle();
      if (error) throw new Error(`상품을 조회하지 못했습니다: ${error.message}`);
      const p = data as ProductRow | null;
      if (!p) {
        throw new Error(
          `상품을 찾지 못했습니다 (${args.slug ?? args.id}). commerce_search_products 로 노출 중인 상품을 확인하세요.`,
        );
      }

      const product: Record<string, unknown> = {
        slug: p.slug,
        title: en ? p.title_en || p.title : p.title,
        one_liner: en ? p.one_liner_en : p.one_liner,
        product_type: p.product_type,
        status: p.status,
        is_b2b_only: p.is_b2b_only,
        weight_g: p.weight_g,
        key_color: p.key_color,
        seo: {
          title: en ? p.seo_title_en : p.seo_title,
          description: en ? p.seo_description_en : p.seo_description,
        },
        published_at: p.published_at,
      };

      if (include.includes("attributes")) {
        product.attributes = (en ? p.attributes_en : p.attributes) ?? {};
      }
      if (include.includes("evidence")) product.evidence = p.evidence;

      if (include.includes("variants")) {
        const { data: vs } = await ctx.db
          .from("mcp_v_variant")
          .select("id,sku,option_values,weight_g,grind,base_price,currency,is_active,is_b2b_only,inventory_policy,position")
          .eq("product_id", p.id)
          .order("position");
        const variants = (vs ?? []) as VariantRow[];
        product.variants = variants;

        if (variants.length) {
          const { data: tp } = await ctx.db
            .from("mcp_v_variant_price")
            .select("variant_id,price,tier_name,is_b2b")
            .in("variant_id", variants.map((v) => v.id));
          product.tier_prices = tp ?? [];
        }
      }

      if (include.includes("images")) {
        const { data: imgs } = await ctx.db
          .from("mcp_v_product_image")
          .select("storage_path,alt,position,is_primary,variant_id")
          .eq("product_id", p.id)
          .order("position");
        product.images = imgs ?? [];
      }

      return { product };
    },
  ),
};

export const getInventory = {
  name: "commerce_get_inventory",
  config: {
    title: "판매 재고 조회",
    description:
      "옵션(variant)의 판매 가능 재고와 재고 정책을 반환한다. 생산·원료 재고가 아니라 판매 재고다.",
    inputSchema: {
      sku: z.string().optional(),
      variant_id: z.string().uuid().optional(),
      product_slug: z.string().optional().describe("해당 상품의 모든 옵션"),
      only_out_of_stock: z.boolean().default(false),
    },
    outputSchema: { items: z.array(z.record(z.any())), note: z.string() },
    annotations: RO,
  },
  handler: withTool<{
    sku?: string;
    variant_id?: string;
    product_slug?: string;
    only_out_of_stock?: boolean;
  }>("commerce_get_inventory", "inventory:read", async (args, ctx: ToolContext) => {
    let q = ctx.db.from("mcp_v_inventory").select("variant_id,sku,product_id,on_hand,inventory_policy,is_active");

    if (args.variant_id) q = q.eq("variant_id", args.variant_id);
    else if (args.sku) q = q.eq("sku", args.sku);
    else if (args.product_slug) {
      const { data: p } = await ctx.db
        .from("mcp_v_product")
        .select("id")
        .eq("slug", args.product_slug)
        .maybeSingle();
      if (!p) {
        throw new Error(
          `상품을 찾지 못했습니다 (${args.product_slug}). commerce_search_products 로 slug 를 확인하세요.`,
        );
      }
      q = q.eq("product_id", (p as { id: string }).id);
    }

    if (args.only_out_of_stock) q = q.lte("on_hand", 0);

    const { data, error } = await q.limit(200);
    if (error) throw new Error(`재고를 조회하지 못했습니다: ${error.message}`);

    return {
      items: data ?? [],
      note: "on_hand 는 입출고 원장 합계다. 판매 가능 재고이며 생산·원료 재고가 아니다.",
    };
  }),
};
