import { z } from "zod";
import { withTool } from "../policy";
import { countWords, htmlToText, mdToHtml, slugify } from "../markdown";
import type { ToolContext } from "../types";

const RO = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };

/**
 * 브랜드 규범과 콘텐츠.
 * 브랜드 토큰은 코드에 기본값을 두지 않는다 — 설정이 비면 빈 값이 아니라 오류를 낸다.
 * 생성물이 다른 브랜드의 토큰을 물려받는 사고를 구조적으로 막기 위해서다.
 */

/**
 * 개선안 초안 슬러그 접미사.
 * 발행글은 MCP 가 수정하지 못하므로, 개선안은 이 접미사를 붙인 별도 초안으로 들어온다.
 * 관리자 화면의 '원본에 반영' 버튼(app/admin/blog/rev.ts)이 같은 값을 본다.
 */
const REV_SUFFIX = "--rev";

/** 규범으로 취급하는 키. */
function isRule(key: string): boolean {
  return key.startsWith("brand.rule") || key.startsWith("brand.forbidden") || key.endsWith(".rule");
}

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

    // 행이 있는지가 아니라 "브랜드 규범(brand.*)이 있는지"를 본다.
    // site_setting 에는 스튜디오 레이아웃 설정(blog_layout 등)도 함께 들어 있어서,
    // 행 개수만 세면 규범이 하나도 없어도 통과해 버린다(2026-08-02 실측 결함).
    const branded = rows.filter((r) => r.key.startsWith("brand."));
    if (branded.length === 0) {
      throw new Error(
        "브랜드 규범이 설정돼 있지 않습니다. site_setting 에 brand.* 값(색·타이포·금지사항)을 넣으세요. " +
          "임의의 기본값을 대신 쓰지 않습니다 — 다른 브랜드의 토큰이 섞이는 것을 막기 위함입니다.",
      );
    }

    const tokens: Record<string, string> = {};
    const rules: string[] = [];
    for (const r of rows) {
      if (isRule(r.key)) rules.push(`${r.key}: ${r.value}`);
      tokens[r.key] = r.value;
    }

    return { brand: rows[0]?.brand_code ?? "", tokens, rules };
  }),
};

export const searchContent = {
  name: "commerce_search_content",
  config: {
    title: "콘텐츠 검색",
    description: "블로그 글과 FAQ 를 검색한다. 본문은 상세 조회(commerce_get_post)에서만 싣는다.",
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

/**
 * 글 한 건 상세.
 * 기존 글을 개선하려면 본문이 필요한데 commerce_search_content 는 목록만 준다(응답 축약 원칙).
 */
export const getPost = {
  name: "commerce_get_post",
  config: {
    title: "블로그 글 상세",
    description: "슬러그로 블로그 글 한 건을 본문까지 조회한다. 기존 글을 읽고 개선안을 쓸 때 먼저 호출할 것.",
    inputSchema: { slug: z.string().min(1).max(200) },
    outputSchema: { post: z.record(z.any()).nullable() },
    annotations: RO,
  },
  handler: withTool<{ slug: string }>("commerce_get_post", "content:read", async (args, ctx: ToolContext) => {
    const { data, error } = await ctx.db
      .from("mcp_v_content_post")
      .select("slug,title,excerpt,body_html,cover_image,tags,author,status,published_at,seo_title,seo_description")
      .eq("slug", args.slug)
      .maybeSingle();
    if (error) throw new Error(`글을 조회하지 못했습니다: ${error.message}`);
    return { post: (data as Record<string, unknown> | null) ?? null };
  }),
};

/**
 * 블로그 초안 저장 — 이 서버의 유일한 쓰기 툴.
 *
 * 설계상 할 수 없는 것(금지가 아니라 부재다):
 *   - 발행: status 인자가 없고, DB 함수가 'draft' 를 하드코딩한다.
 *   - 발행글 수정: DB 함수가 published 행을 거부한다.
 *   - HTML 주입: HTML 인자가 없다. 마크다운만 받아 화이트리스트 태그로 변환한다.
 *   - 삭제: 삭제 툴도 삭제 함수도 만들지 않았다.
 */
export const draftPost = {
  name: "commerce_draft_post",
  config: {
    title: "블로그 초안 저장",
    description:
      "블로그 글을 초안(draft)으로 저장한다. 본문은 마크다운으로 넘긴다 — HTML 태그를 넣으면 태그가 아니라 글자로 표시된다. " +
      "이 툴은 글을 발행하지 못하고, 이미 발행된 글도 수정하지 못한다(오류가 난다). " +
      "발행된 글을 고치려면 commerce_get_post 로 원문을 읽고 '<원본slug>--rev' 처럼 다른 슬러그로 개선안 초안을 저장할 것. " +
      "발행은 관리자 화면(/admin/blog)에서 사람이 직접 한다. " +
      "커버 이미지는 commerce_create_image 로 먼저 등록한 뒤 그 url 을 cover_image 인자에 넘긴다 — 외부 URL 은 거부된다. " +
      "쓰기 전에 commerce_get_brand_tokens 를 호출해 브랜드 규범과 금지 표현을 먼저 확인할 것.",
    inputSchema: {
      title: z.string().min(1).max(200).describe("글 제목. 15~60자 권장"),
      body_md: z
        .string()
        .min(1)
        .max(200000)
        .describe("마크다운 본문. ## 소제목 · - 목록 · 1. 목록 · > 인용 · | 표 | · **강조** · [링크](url) 지원"),
      slug: z.string().max(120).optional().describe("생략하면 제목에서 만든다. 개선안은 '<원본slug>--rev' 권장"),
      excerpt: z.string().max(300).optional().describe("생략하면 본문 앞부분에서 만든다"),
      tags: z.array(z.string().max(40)).max(10).optional(),
      seo_title: z.string().max(200).optional(),
      seo_description: z.string().max(300).optional(),
      cover_image: z
        .string()
        .max(500)
        .optional()
        .describe("commerce_create_image 가 돌려준 url. 다른 URL 은 거부된다"),
    },
    outputSchema: {
      slug: z.string(),
      status: z.string(),
      word_count: z.number(),
      char_count: z.number(),
      has_cover: z.boolean(),
      admin_url: z.string(),
      next_step: z.string(),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  handler: withTool<{
    title: string;
    body_md: string;
    slug?: string;
    excerpt?: string;
    tags?: string[];
    seo_title?: string;
    seo_description?: string;
    cover_image?: string;
  }>("commerce_draft_post", "content:write", async (args, ctx: ToolContext) => {
    const title = (args.title ?? "").trim();
    if (!title) throw new Error("제목이 필요합니다.");

    const bodyHtml = mdToHtml(args.body_md);
    const text = htmlToText(bodyHtml);
    if (!text) throw new Error("본문이 비어 있습니다. 마크다운 내용을 확인하세요.");

    // slugify 는 연속 하이픈을 하나로 줄이므로 '--rev' 접미사를 떼어놓고 정규화한다.
    let slug: string;
    if (args.slug && args.slug.trim()) {
      const raw = args.slug.trim();
      const isRev = raw.endsWith(REV_SUFFIX);
      const base = isRev ? raw.slice(0, -REV_SUFFIX.length) : raw;
      slug = slugify(base) + (isRev ? REV_SUFFIX : "");
    } else {
      slug = slugify(title);
    }
    if (!slug || slug === REV_SUFFIX) slug = `post-${Date.now().toString(36)}`;

    const excerpt = (args.excerpt ?? text).trim().slice(0, 150) || null;

    // 값 검증은 DB 함수가 정본이다(접두사·'..'·허용문자). 여기서는 빈 값만 정리한다.
    // 생략하면 null 이 가고, DB 가 coalesce 로 기존 커버를 지키므로 재저장이 커버를 지우지 않는다.
    const cover = (args.cover_image ?? "").trim() || null;

    const { data, error } = await ctx.db.rpc("mcp_draft_post", {
      p_slug: slug,
      p_title: title,
      p_body_html: bodyHtml,
      p_excerpt: excerpt,
      p_tags: args.tags ?? null,
      p_seo_title: args.seo_title ?? null,
      p_seo_description: args.seo_description ?? null,
      p_cover_image: cover,
    });
    if (error) throw new Error(`초안을 저장하지 못했습니다: ${error.message}`);

    const saved = (Array.isArray(data) ? data[0] : data) as string | null;

    return {
      slug: saved ?? slug,
      status: "draft",
      word_count: countWords(text),
      char_count: text.length,
      has_cover: Boolean(cover),
      admin_url: "/admin/blog",
      next_step: cover
        ? "초안으로 저장했습니다. 사이트에는 아직 보이지 않습니다. /admin/blog 에서 검수한 뒤 직접 발행하세요."
        : "초안으로 저장했습니다. 커버 이미지가 없어 공유 시 썸네일이 나오지 않습니다 — commerce_create_image 로 커버를 만들어 붙이거나 /admin/blog 에서 첨부한 뒤 발행하세요.",
    };
  }),
};
