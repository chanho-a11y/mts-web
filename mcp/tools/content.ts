import { z } from "zod";
import { withTool } from "../policy";
import type { ToolContext } from "../types";

const RO = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };

/**
 * 브랜드 규범과 콘텐츠.
 * 브랜드 토큰은 코드에 기본값을 두지 않는다 — 설정이 비면 빈 값이 아니라 오류를 낸다.
 * 생성물이 다른 브랜드의 토큰을 물려받는 사고를 구조적으로 막기 위해서다.
 */

export const getBrandTokens = {
  name: "commerce_get_brand_tokens",
  config: {
    title: "브랜드 토큰",
    description:
      "이 상점의 색·타이포·워드마크 규칙과 금지 사항을 반환한다. 카피·이미지·페이지를 만들기 전에 호출해 규범을 확인할 것. 설정이 비어 있으면 오류를 낸다(임의 기본값을 쓰지 않기 위함).",
    inputSchema: {},
    outputSchema: { brand: z.string(), tokens: z.record(z.any()), rules: z.array(z.string()) },
    annotations: RO,
  },
  handler: withTool("commerce_get_brand_tokens", "brand:read", async (_args, ctx: ToolContext) => {
    const { data, error } = await ctx.db.from("mcp_v_site_setting").select("key,value,brand_code");
    if (error) throw new Error(`브랜드 설정을 읽지 못했습니다: ${error.message}`);

    const rows = (data ?? []) as { key: string; value: string; brand_code: string }[];
    if (rows.length === 0) {
      throw new Error(
        "브랜드 토큰이 설정돼 있지 않습니다. site_setting 에 brand.* 값을 넣으세요. " +
          "임의의 기본값을 대신 쓰지 않습니다 — 다른 브랜드의 토큰이 섞이는 것을 막기 위함입니다.",
      );
    }

    const tokens: Record<string, string> = {};
    const rules: string[] = [];
    for (const r of rows) {
      if (r.key.startsWith("brand.forbidden") || r.key.endsWith(".rule")) rules.push(`${r.key}: ${r.value}`);
      tokens[r.key] = r.value;
    }

    return { brand: rows[0]?.brand_code ?? "", tokens, rules };
  }),
};

export const searchContent = {
  name: "commerce_search_content",
  config: {
    title: "콘텐츠 검색",
    description: "블로그 글과 FAQ 를 검색한다. 본문은 상세 조회에서만 싣는다.",
    inputSchema: {
      kind: z.enum(["post", "faq", "all"]).default("all"),
      q: z.string().optional().describe("제목·질문 부분일치"),
      status: z.string().optional(),
      limit: z.number().int().min(1).max(100).default(20),
    },
    outputSchema: { posts: z.array(z.record(z.any())), faqs: z.array(z.record(z.any())) },
    annotations: RO,
  },
  handler: withTool<{ kind?: string; q?: string; status?: string; limit?: number }>(
    "commerce_search_content",
    "content:read",
    async (args, ctx: ToolContext) => {
      const kind = args.kind ?? "all";
      const limit = args.limit ?? 20;
      const term = args.q ? args.q.replace(/[%,()]/g, "") : null;

      let posts: Record<string, unknown>[] = [];
      let faqs: Record<string, unknown>[] = [];

      if (kind === "post" || kind === "all") {
        let q = ctx.db
          .from("mcp_v_content_post")
          .select("slug,title,excerpt,tags,author,status,published_at");
        if (args.status) q = q.eq("status", args.status);
        if (term) q = q.ilike("title", `%${term}%`);
        const { data, error } = await q.order("published_at", { ascending: false, nullsFirst: false }).limit(limit);
        if (error) throw new Error(`콘텐츠를 조회하지 못했습니다: ${error.message}`);
        posts = (data ?? []) as Record<string, unknown>[];
      }

      if (kind === "faq" || kind === "all") {
        let q = ctx.db.from("mcp_v_faq").select("question,category,is_b2b_only,status,position");
        if (args.status) q = q.eq("status", args.status);
        if (term) q = q.ilike("question", `%${term}%`);
        const { data, error } = await q.order("position").limit(limit);
        if (error) throw new Error(`FAQ 를 조회하지 못했습니다: ${error.message}`);
        faqs = (data ?? []) as Record<string, unknown>[];
      }

      return { posts, faqs };
    },
  ),
};
