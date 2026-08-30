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
        // 제품 설명 정본. one_liner 는 16~25자 한 줄 요약이라 다른 필드다(D-104).
        story: en ? p.story_en : p.story,
        product_type: p.product_type,
        categories: p.categories ?? [],
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
          .select("id,sku,option_values,weight_g,base_price,currency,is_active,is_b2b_only,inventory_policy,position")
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

/**
 * 상품 수정 제안 — 이 서버가 상품에 대해 가진 유일한 쓰기 경로.
 *
 * 설계상 할 수 없는 것(금지가 아니라 부재다):
 *   - 즉시 반영 : product 를 건드리지 않는다. mcp_product_change 에 제안만 쌓는다.
 *   - 삭제      : 삭제 툴도 삭제 함수도 없다. 빈 값 전달도 DB 함수가 거부한다.
 *   - 신규 등록  : product INSERT 경로가 없다.
 *   - 위험 필드  : 가격·재고·SKU 는 다른 테이블이고, 상태·표시사항·디자인 토큰은
 *                 화이트리스트 밖이라 DB 함수가 예외를 던진다.
 */

/** DB 의 mcp_product_editable_fields() 와 같은 목록이어야 한다. */
const EDITABLE = {
  title_ko: "제품명(한국어)",
  one_liner: "한 줄 요약",
  story: "제품 설명·스토리",
  seo_title: "SEO 제목",
  seo_description: "SEO 설명",
  roast_level: "로스팅 정도",
  producer: "생산자",
  variety: "품종",
  altitude: "고도",
  process: "가공방식",
  product_type: "제품 유형",
  title_en: "제품명(영문)",
  one_liner_en: "한 줄 요약(영문)",
  story_en: "제품 설명(영문)",
  seo_title_en: "SEO 제목(영문)",
  seo_description_en: "SEO 설명(영문)",
  roast_level_en: "로스팅 정도(영문)",
  producer_en: "생산자(영문)",
  variety_en: "품종(영문)",
  altitude_en: "고도(영문)",
  process_en: "가공방식(영문)",
} as const;

const STR = (label: string) => z.string().min(1).max(4000).optional().describe(label);

/**
 * 신규 상품 draft 생성/갱신 (D-121).
 *
 * 블로그 mcp_draft_post 와 동일한 패턴 — 스토어프론트는 active 만 노출하므로
 * draft 는 고객에게 보이지 않고, 발행 버튼이 곧 승인 게이트다.
 *   - 발행 불가: DB 함수가 status='draft' 를 하드코딩한다
 *   - 발행·보관 상품은 거부 → commerce_propose_product_update 로 안내
 *   - 가격·SKU·재고·표시사항·weight_g 은 화이트리스트 밖(대표 영역)
 */
export const draftProduct = {
  name: "commerce_draft_product",
  config: {
    title: "신규 상품 초안",
    description:
      "신규 상품을 초안(draft)으로 생성한다. draft 는 스토어프론트에 노출되지 않으며, " +
      "발행은 관리자가 /admin/products/<slug> 에서 가격·SKU·표시사항을 채운 뒤 직접 한다. " +
      "같은 슬러그가 draft 상태면 보낸 필드만 덮어쓴다(초안 다듬기). " +
      "발행(active)·보관(archived)된 상품은 이 툴로 수정할 수 없다 — commerce_propose_product_update 로 제안할 것. " +
      "가격·재고·SKU·중량·판매상태·표시사항(원재료·소비기한·품목보고번호 등)은 쓸 수 없다. " +
      "빈 값을 보내면 오류. 외부사 소개 문단을 그대로 복사하지 말고 사실 정보만 추출해 스토리는 재작성할 것.",
    inputSchema: {
      slug: z
        .string()
        .min(1)
        .max(200)
        .describe("새 상품 슬러그. 영문 소문자·숫자·하이픈. 예: peru-buenos-aires"),
      brand: z.enum(["mtspace", "normcore"]).optional().describe("생략하면 mtspace"),
      category: z
        .string()
        .min(1)
        .max(60)
        .optional()
        .describe("카테고리 슬러그 1개. 생략하면 single-origins. 선택지는 commerce_get_schema 의 categories"),

      title_ko: STR("제품명(한국어). 신규 생성 시 필수"),
      one_liner: STR("한 줄 요약. 16~25자"),
      story: STR("제품 설명·스토리. 상세 페이지 정본"),
      seo_title: STR("SEO 제목"),
      seo_description: STR("SEO 설명"),
      roast_level: STR("로스팅 정도"),
      producer: STR("생산자"),
      variety: STR("품종"),
      altitude: STR("고도"),
      process: STR("가공방식"),
      product_type: STR("제품 유형. 생략하면 카테고리에서 파생"),
      flavor_notes: z.array(z.string().min(1).max(60)).min(1).max(12).optional().describe("풍미 노트. 카드뉴스·라벨의 정본"),
      hashtags: z.array(z.string().min(1).max(40)).min(1).max(20).optional(),
      origin: z.record(z.any()).optional().describe("{country, country_en, region?, farm?} 형태"),
      recipe: z.record(z.any()).optional().describe("{espresso:{dose_g,yield_g,time}, filter:{...}, milk:{...}} 형태"),
      evidence: z.record(z.any()).optional().describe("자사 1차 데이터. roast_profile·cupping·competition·b2b_case·chanotonado 키만 쓴다"),

      title_en: STR("제품명(영문)"),
      one_liner_en: STR("한 줄 요약(영문)"),
      story_en: STR("제품 설명(영문)"),
      seo_title_en: STR("SEO 제목(영문)"),
      seo_description_en: STR("SEO 설명(영문)"),
      roast_level_en: STR("로스팅 정도(영문)"),
      producer_en: STR("생산자(영문)"),
      variety_en: STR("품종(영문)"),
      altitude_en: STR("고도(영문)"),
      process_en: STR("가공방식(영문)"),
      flavor_notes_en: z.array(z.string().min(1).max(60)).min(1).max(12).optional(),
      recipe_en: z.record(z.any()).optional(),
    },
    outputSchema: {
      slug: z.string(),
      created: z.boolean(),
      status: z.string(),
      fields: z.array(z.string()),
      admin_url: z.string(),
      next_step: z.string(),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  handler: withTool<Record<string, unknown>>(
    "commerce_draft_product",
    "catalog:write",
    async (args, ctx: ToolContext) => {
      const slug = String(args.slug ?? "").trim();
      if (!slug) throw new Error("슬러그가 필요합니다.");

      // slug 를 뺀 나머지를 patch 로 만든다(brand·category 포함). undefined 는 담지 않는다.
      const patch: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(args)) {
        if (k === "slug") continue;
        if (v === undefined) continue;
        patch[k] = v;
      }
      if (Object.keys(patch).length === 0) {
        throw new Error("내용을 하나 이상 지정하세요. 신규 생성에는 title_ko 가 필수입니다.");
      }

      const { data, error } = await ctx.db.rpc("mcp_draft_product", {
        p_slug: slug,
        p_patch: patch,
      });
      if (error) throw new Error(`초안을 저장하지 못했습니다: ${error.message}`);

      const row = (Array.isArray(data) ? data[0] : data) as {
        slug: string;
        created: boolean;
        status: string;
        fields: string[];
      } | null;
      if (!row) throw new Error("초안 저장 결과를 받지 못했습니다.");

      return {
        slug: row.slug,
        created: row.created,
        status: row.status ?? "draft",
        fields: row.fields ?? [],
        admin_url: `/admin/products/${row.slug}`,
        next_step: row.created
          ? "초안을 만들었습니다. 고객에게 보이지 않습니다. 관리자에서 가격·SKU·표시사항을 채운 뒤 발행하세요."
          : "초안을 갱신했습니다. 발행은 관리자에서 합니다.",
      };
    },
  ),
};

export const proposeProductUpdate = {
  name: "commerce_propose_product_update",
  config: {
    title: "상품 수정 제안",
    description:
      "상품 정보 수정을 '제안'한다. 상품 자체는 바뀌지 않는다 — 관리자가 /admin/products/changes 에서 " +
      "before→after 를 확인하고 반영해야 적용된다. " +
      "초안(draft)·발행(active)·보관(archived) 어떤 상태의 상품이든 제안할 수 있다. " +
      "가격·재고·SKU·판매상태·표시사항(원재료·소비기한·품목보고번호 등)·디자인 토큰은 수정할 수 없다. " +
      "값을 비우는 것도 불가능하다(빈 문자열·빈 배열을 보내면 오류). " +
      "먼저 commerce_get_product 로 현재 값을 읽고, 실제로 바꿀 필드만 담아 보낼 것. " +
      "note 에는 왜 바꾸는지 근거를 남긴다 — 관리자가 그것을 보고 판단한다.",
    inputSchema: {
      slug: z.string().min(1).max(200).describe("commerce_search_products 로 확인한 상품 슬러그"),
      note: z.string().max(1000).optional().describe("변경 근거. 관리자가 판단할 때 읽는다"),

      title_ko: STR("제품명(한국어)"),
      one_liner: STR("한 줄 요약. 16~25자"),
      story: STR("제품 설명·스토리. 상세 페이지 정본"),
      seo_title: STR("SEO 제목"),
      seo_description: STR("SEO 설명"),
      roast_level: STR("로스팅 정도"),
      producer: STR("생산자"),
      variety: STR("품종"),
      altitude: STR("고도"),
      process: STR("가공방식"),
      product_type: STR("제품 유형. 예: 싱글 오리진 / 블렌드"),
      categories: z
        .array(z.string().min(1).max(60))
        .min(1)
        .max(6)
        .optional()
        .describe("카테고리 슬러그 배열. 보낸 목록으로 통째로 교체된다. 선택지는 commerce_get_schema 의 categories"),
      flavor_notes: z.array(z.string().min(1).max(60)).min(1).max(12).optional().describe("풍미 노트. 카드뉴스·라벨의 정본"),
      hashtags: z.array(z.string().min(1).max(40)).min(1).max(20).optional(),
      origin: z.record(z.any()).optional().describe("{country, country_en, region?, farm?} 형태"),
      recipe: z.record(z.any()).optional().describe("{espresso:{dose_g,yield_g,time}, filter:{...}, milk:{...}} 형태"),
      evidence: z.record(z.any()).optional().describe("자사 1차 데이터. roast_profile·cupping·competition·b2b_case·chanotonado 키만 쓴다"),

      title_en: STR("제품명(영문)"),
      one_liner_en: STR("한 줄 요약(영문)"),
      story_en: STR("제품 설명(영문)"),
      seo_title_en: STR("SEO 제목(영문)"),
      seo_description_en: STR("SEO 설명(영문)"),
      roast_level_en: STR("로스팅 정도(영문)"),
      producer_en: STR("생산자(영문)"),
      variety_en: STR("품종(영문)"),
      altitude_en: STR("고도(영문)"),
      process_en: STR("가공방식(영문)"),
      flavor_notes_en: z.array(z.string().min(1).max(60)).min(1).max(12).optional(),
      recipe_en: z.record(z.any()).optional(),
    },
    outputSchema: {
      change_id: z.string(),
      slug: z.string(),
      fields: z.array(z.string()),
      status: z.string(),
      admin_url: z.string(),
      next_step: z.string(),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  handler: withTool<Record<string, unknown>>(
    "commerce_propose_product_update",
    "catalog:write",
    async (args, ctx: ToolContext) => {
      const slug = String(args.slug ?? "").trim();
      if (!slug) throw new Error("슬러그가 필요합니다.");

      const note = typeof args.note === "string" ? args.note : null;

      // slug·note 를 뺀 나머지를 patch 로 만든다. undefined 는 담지 않는다.
      const patch: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(args)) {
        if (k === "slug" || k === "note") continue;
        if (v === undefined) continue;
        patch[k] = v;
      }
      if (Object.keys(patch).length === 0) {
        throw new Error(
          `바꿀 필드를 하나 이상 지정하세요. 수정 가능: ${Object.keys(EDITABLE).join(", ")}, flavor_notes, flavor_notes_en, hashtags, origin, recipe, recipe_en, evidence`,
        );
      }

      const { data, error } = await ctx.db.rpc("mcp_propose_product_change", {
        p_slug: slug,
        p_patch: patch,
        p_note: note,
      });
      if (error) throw new Error(`제안을 등록하지 못했습니다: ${error.message}`);

      const row = (Array.isArray(data) ? data[0] : data) as {
        change_id: string;
        slug: string;
        fields: string[];
        status: string;
      } | null;
      if (!row) throw new Error("제안 등록 결과를 받지 못했습니다.");

      return {
        change_id: row.change_id,
        slug: row.slug,
        fields: row.fields ?? [],
        status: row.status,
        admin_url: "/admin/products/changes",
        next_step:
          "제안만 등록했습니다. 상품은 아직 바뀌지 않았습니다. /admin/products/changes 에서 확인 후 반영하세요.",
      };
    },
  ),
};

export const listProductChanges = {
  name: "commerce_list_product_changes",
  config: {
    title: "상품 수정 제안 목록",
    description:
      "MCP 가 올린 상품 수정 제안과 그 처리 상태(pending·applied·rejected)를 조회한다. " +
      "같은 내용을 다시 제안하기 전에 먼저 확인할 것.",
    inputSchema: {
      slug: z.string().max(200).optional(),
      status: z.enum(["pending", "applied", "rejected"]).optional(),
      limit: z.number().int().min(1).max(100).default(20),
    },
    outputSchema: { items: z.array(z.record(z.any())) },
    annotations: RO,
  },
  handler: withTool<{ slug?: string; status?: string; limit?: number }>(
    "commerce_list_product_changes",
    "catalog:read",
    async (args, ctx: ToolContext) => {
      let q = ctx.db
        .from("mcp_v_product_change")
        .select("id,slug,title,patch,before,note,status,created_at,reviewed_at");
      if (args.slug) q = q.eq("slug", args.slug);
      if (args.status) q = q.eq("status", args.status);
      const { data, error } = await q
        .order("created_at", { ascending: false })
        .limit(args.limit ?? 20);
      if (error) throw new Error(`제안 목록을 조회하지 못했습니다: ${error.message}`);
      return { items: data ?? [] };
    },
  ),
};
