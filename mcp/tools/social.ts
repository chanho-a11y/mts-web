import { z } from "zod";
import { withTool } from "../policy";
import { slugify } from "../markdown";
import type { ToolContext } from "../types";

/**
 * 인스타그램 초안 (D-135).
 *
 * 블로그 초안(tools/content.ts)과 같은 철학 — 설계상 할 수 없는 것(금지가 아니라 부재다):
 *   - 발행       : status 인자가 없고, DB 함수가 'draft' 를 하드코딩한다.
 *                 scheduled 전이는 /admin/social 에서 사람이, published 는 발행 워커(별건)가 쓴다.
 *   - 승인글 수정 : DB 함수가 scheduled·published 행을 거부한다. 개선안은 '<원본slug>--rev'.
 *   - 외부 이미지 : media[].url 은 commerce_create_image(purpose=instagram) 가 돌려준 자체 URL 만.
 *                 DB 함수가 접두사·대장 등록 여부를 검사한다.
 *   - 삭제       : 삭제 툴도 삭제 함수도 없다.
 *
 * 브랜드 룰 검사는 서버(여기)가 한다. Claude 가 지키는 게 아니라 서버가 거부하므로
 * 프롬프트가 달라져도 룰은 유지된다. 결과(rule_check)는 초안에 같이 저장돼 승인자가 본다.
 */

const RO = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
const REV_SUFFIX = "--rev";

const STATUSES = ["draft", "scheduled", "published", "rejected", "failed"] as const;
const KINDS = ["image", "carousel"] as const;

export interface RuleCheck {
  errors: string[];
  warnings: string[];
}

/* ── 브랜드 룰 ───────────────────────────────────────────────────── */

/** "절대화 표현 금지: 최고의 / 유일한 / 완벽한" 같은 토큰 값에서 금지어 목록을 뽑는다. */
function forbiddenTermsFrom(value: string | undefined): string[] {
  if (!value) return [];
  const afterColon = value.includes(":") ? value.slice(value.indexOf(":") + 1) : value;
  return afterColon
    .split(/[\/·,]/)
    .map((s) => s.trim())
    // 괄호 주석("(D-022)")과 문장형 설명은 금지어가 아니다
    .map((s) => s.replace(/\(.*?\)/g, "").trim())
    .filter((s) => s.length >= 2 && s.length <= 20 && !/[.。]/.test(s));
}

/** 따옴표로 감싼 표기("화·수·목 로스팅")를 뽑는다 — legacy_notation 토큰 형식 */
function quotedTermsFrom(value: string | undefined): string[] {
  if (!value) return [];
  return [...value.matchAll(/"([^"]{2,40})"/g)].map((m) => m[1].trim());
}

/**
 * 캡션·해시태그를 브랜드 토큰으로 검사한다.
 * errors → 저장 거부. warnings → 저장하되 초안에 남겨 승인자가 본다.
 */
export function checkSocialRules(
  tokens: Record<string, string>,
  caption: string,
  hashtags: string[],
  sourceRef: string | null,
): RuleCheck {
  const errors: string[] = [];
  const warnings: string[] = [];
  const text = caption;

  // 1. 절대화 표현 — 토큰이 정본. 토큰이 없으면 검사하지 않는다(코드에 기본값을 두지 않는다).
  for (const term of forbiddenTermsFrom(tokens["brand.forbidden.absolutes"])) {
    if (text.includes(term)) errors.push(`절대화 표현 금지: "${term}"`);
  }

  // 2. 폐기 표기(구 주소·구 로스팅 요일)
  for (const term of quotedTermsFrom(tokens["brand.forbidden.legacy_notation"])) {
    if (text.includes(term)) errors.push(`폐기된 표기: "${term}" — brand.rule.address / brand.rule.freshness 를 따르세요`);
  }

  // 3. 교차 브랜드 — 다른 브랜드 이름이 캡션에 들어오면 경고(고객 사례 등 의도적 언급이 있을 수 있어 거부는 않는다)
  for (const other of ["NORMCORE", "Normcore", "놈코어", "RoasteryFlow", "로스터리플로우", "logrid", "Logrid"]) {
    if (text.includes(other) || hashtags.some((h) => h.toLowerCase().includes(other.toLowerCase()))) {
      warnings.push(`다른 브랜드 언급: "${other}" — brand.forbidden.cross_brand / other_products 확인`);
      break;
    }
  }

  // 4. 출처 없는 수치 — 숫자+단위가 있는데 source_ref 가 없으면 경고
  if (!sourceRef && /\d+(\.\d+)?\s*(%|퍼센트|배|kg|g|℃|도|점|위|명|잔)/.test(text)) {
    warnings.push("수치가 들어 있는데 source_ref 가 없습니다 — brand.forbidden.unsourced_stats: 자사 실측·KB·링크 중 하나를 근거로 붙이세요");
  }

  // 5. 길이
  if (caption.length > 2200) errors.push(`캡션 ${caption.length}자 — 인스타그램 상한 2,200자`);
  if (caption.length < 80) warnings.push(`캡션 ${caption.length}자 — 너무 짧습니다(권장 300~600자)`);
  if (caption.length > 900) warnings.push(`캡션 ${caption.length}자 — 깁니다(권장 300~600자). 접힘 이후는 잘 읽히지 않습니다`);

  // 6. 해시태그
  if (hashtags.length > 30) errors.push(`해시태그 ${hashtags.length}개 — 상한 30개`);
  if (hashtags.length === 0) warnings.push("해시태그가 없습니다");
  for (const h of hashtags) {
    if (/\s/.test(h)) errors.push(`해시태그에 공백: "${h}"`);
    if (h.startsWith("#")) errors.push(`해시태그는 # 없이 보냅니다: "${h}"`);
  }
  const dup = hashtags.filter((h, i) => hashtags.indexOf(h) !== i);
  if (dup.length) warnings.push(`중복 해시태그: ${[...new Set(dup)].join(", ")}`);

  // 7. 캡션 안의 # 는 해시태그 배열과 이중이 된다
  if (/#\S/.test(text)) warnings.push("캡션 본문에 # 가 있습니다 — 해시태그는 hashtags 배열로만 보내면 본문 끝에 서버가 붙입니다");

  return { errors, warnings };
}

async function loadTokens(ctx: ToolContext): Promise<Record<string, string>> {
  const { data, error } = await ctx.db.from("mcp_v_site_setting").select("key,value");
  if (error) throw new Error(`브랜드 설정을 읽지 못했습니다: ${error.message}`);
  const tokens: Record<string, string> = {};
  for (const r of (data ?? []) as { key: string; value: string }[]) tokens[r.key] = r.value;
  if (!Object.keys(tokens).some((k) => k.startsWith("brand."))) {
    throw new Error("브랜드 규범(brand.*)이 설정돼 있지 않습니다. site_setting 을 채우세요. 임의의 기본값을 쓰지 않습니다.");
  }
  return tokens;
}

/* ── 툴 ───────────────────────────────────────────────────────────── */

const mediaItem = z.object({
  url: z.string().min(1).max(500).describe("commerce_create_image(purpose=instagram) 가 돌려준 url. 외부 URL 은 거부된다"),
  alt: z.string().max(200).optional().describe("대체 텍스트(접근성). 생략하면 이미지 등록 시 alt 를 쓴다"),
});

export const socialDraftPost = {
  name: "commerce_social_draft_post",
  config: {
    title: "인스타그램 초안 저장",
    description:
      "인스타그램 게시물을 초안(draft)으로 저장한다. 이 툴은 발행하지 못하고, 승인(scheduled)·발행된 초안도 수정하지 못한다(오류가 난다). " +
      "승인과 예약은 관리자 화면(/admin/social)에서 사람이 하고, 발행은 예약 시각에 서버가 한다. " +
      "이미지는 commerce_create_image(purpose=instagram) 로 먼저 등록한 뒤 그 url 을 media 에 순서대로 넣는다 — 외부 URL 은 거부된다. " +
      "kind=image 는 media 1장, kind=carousel 은 2~10장. " +
      "해시태그는 # 없이 hashtags 배열로만 보낸다(캡션 본문에 넣지 않는다). " +
      "저장 전에 commerce_get_brand_tokens 를 호출해 금지 표현·톤·해시태그 세트를 확인할 것. 서버가 같은 룰로 다시 검사해 위반은 거부하고 경고는 초안에 남긴다. " +
      "반려된 초안을 고치려면 commerce_social_get_post 로 반려 사유를 읽고 같은 slug 로 다시 저장한다(draft·rejected·failed 는 재저장 가능). " +
      "승인·발행된 글의 개선안은 '<원본slug>--rev' 슬러그로 따로 저장한다.",
    inputSchema: {
      slug: z.string().max(120).optional().describe("생략하면 캡션 첫 줄에서 만든다. 재저장·개선안은 slug 를 명시"),
      kind: z.enum(KINDS).default("image"),
      caption: z.string().min(1).max(2200).describe("캡션 본문. 해시태그는 넣지 않는다. 줄바꿈은 \\n"),
      hashtags: z.array(z.string().min(1).max(60)).max(30).default([]).describe("# 없이. 브랜드 고정 세트 + 포스트별 3~5개"),
      media: z.array(mediaItem).min(1).max(10).describe("순서대로. image 는 1장, carousel 은 2~10장"),
      suggested_time: z
        .string()
        .optional()
        .describe("권장 발행 시각(ISO 8601, 예: 2026-10-07T09:00:00+09:00). 승인자가 바꿀 수 있다"),
      source_ref: z
        .string()
        .max(200)
        .optional()
        .describe("근거 참조(예: product/<slug>, post/<slug>, kb/<id>). 수치가 들어가면 필수에 가깝다"),
    },
    outputSchema: {
      slug: z.string(),
      status: z.string(),
      kind: z.string(),
      media_count: z.number(),
      caption_chars: z.number(),
      hashtag_count: z.number(),
      warnings: z.array(z.string()),
      admin_url: z.string(),
      next_step: z.string(),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  handler: withTool<{
    slug?: string;
    kind?: "image" | "carousel";
    caption: string;
    hashtags?: string[];
    media: { url: string; alt?: string }[];
    suggested_time?: string;
    source_ref?: string;
  }>("commerce_social_draft_post", "content:write", async (args, ctx: ToolContext) => {
    const caption = (args.caption ?? "").trim();
    if (!caption) throw new Error("캡션이 필요합니다.");
    const kind = args.kind ?? "image";
    const hashtags = (args.hashtags ?? []).map((h) => h.trim()).filter(Boolean);
    const media = (args.media ?? []).map((m) => ({ url: (m.url ?? "").trim(), alt: (m.alt ?? "").trim() || null }));
    if (media.length === 0) throw new Error("이미지가 필요합니다. commerce_create_image(purpose=instagram) 로 먼저 등록하세요.");
    if (kind === "image" && media.length !== 1) throw new Error("kind=image 는 이미지 1장입니다. 여러 장이면 kind=carousel 로 보내세요.");
    if (kind === "carousel" && (media.length < 2 || media.length > 10)) throw new Error("캐러셀은 2~10장입니다.");

    // slug — 블로그와 같은 규칙. '--rev' 접미사는 떼어놓고 정규화한 뒤 다시 붙인다.
    let slug: string;
    if (args.slug && args.slug.trim()) {
      const raw = args.slug.trim();
      const isRev = raw.endsWith(REV_SUFFIX);
      const base = isRev ? raw.slice(0, -REV_SUFFIX.length) : raw;
      slug = slugify(base) + (isRev ? REV_SUFFIX : "");
    } else {
      slug = slugify(caption.split("\n")[0].slice(0, 60));
    }
    if (!slug || slug === REV_SUFFIX) slug = `ig-${Date.now().toString(36)}`;

    const sourceRef = (args.source_ref ?? "").trim() || null;

    // suggested_time — 파싱만 확인한다. 과거 시각도 받는다(승인자가 고친다).
    let suggested: string | null = null;
    if (args.suggested_time && args.suggested_time.trim()) {
      const t = new Date(args.suggested_time.trim());
      if (Number.isNaN(t.getTime())) throw new Error(`suggested_time 을 해석하지 못했습니다: ${args.suggested_time}`);
      suggested = t.toISOString();
    }

    // ── 브랜드 룰 검사 — 토큰이 정본 ──
    const tokens = await loadTokens(ctx);
    const check = checkSocialRules(tokens, caption, hashtags, sourceRef);
    if (check.errors.length) {
      throw new Error(`브랜드 룰 위반으로 저장하지 않았습니다:\n- ${check.errors.join("\n- ")}`);
    }

    const { data, error } = await ctx.db.rpc("mcp_social_draft", {
      p_slug: slug,
      p_kind: kind,
      p_caption: caption,
      p_hashtags: hashtags,
      p_media: media,
      p_suggested_time: suggested,
      p_source_ref: sourceRef,
      p_rule_check: check,
      p_token_id: ctx.identity.tokenId,
      p_profile_id: ctx.identity.profileId,
    });
    if (error) throw new Error(`초안을 저장하지 못했습니다: ${error.message}`);
    const saved = (Array.isArray(data) ? data[0] : data) as string | null;

    return {
      slug: saved ?? slug,
      status: "draft",
      kind,
      media_count: media.length,
      caption_chars: caption.length,
      hashtag_count: hashtags.length,
      warnings: check.warnings,
      admin_url: `/admin/social?slug=${encodeURIComponent(saved ?? slug)}`,
      next_step:
        "초안으로 저장했습니다. 인스타그램에는 아직 올라가지 않습니다. " +
        "/admin/social 에서 미리보기를 확인하고 승인·예약하면 그 시각에 서버가 발행합니다." +
        (check.warnings.length ? ` 경고 ${check.warnings.length}건이 초안에 남아 있습니다 — 승인 전에 확인하세요.` : ""),
    };
  }),
};

export const socialGetPost = {
  name: "commerce_social_get_post",
  config: {
    title: "인스타그램 초안 상세",
    description:
      "슬러그로 인스타그램 초안 한 건을 조회한다. 반려 사유(rejection_reason)·실패 사유(failure_reason)·발행 결과(ig_permalink)·지표(insights)를 포함한다. " +
      "반려된 초안을 고칠 때 먼저 호출할 것.",
    inputSchema: { slug: z.string().min(1).max(200) },
    outputSchema: { post: z.record(z.any()).nullable() },
    annotations: RO,
  },
  handler: withTool<{ slug: string }>("commerce_social_get_post", "content:read", async (args, ctx: ToolContext) => {
    const { data, error } = await ctx.db
      .from("mcp_v_social_post")
      .select(
        "slug,channel,kind,caption,hashtags,media,status,suggested_time,scheduled_at,source_ref,rule_check,rejection_reason,failure_reason,ig_media_id,ig_permalink,published_at,insights,created_by,created_at,updated_at",
      )
      .eq("slug", args.slug)
      .maybeSingle();
    if (error) throw new Error(`초안을 조회하지 못했습니다: ${error.message}`);
    return { post: (data as Record<string, unknown> | null) ?? null };
  }),
};

export const socialListPosts = {
  name: "commerce_social_list_posts",
  config: {
    title: "인스타그램 초안 목록",
    description:
      "인스타그램 초안·예약·발행 목록. 상태로 거른다 — rejected 로 반려분을, published 로 성과(insights)를 본다. 캡션은 앞부분만 싣는다.",
    inputSchema: {
      status: z.enum(STATUSES).optional(),
      since: z.string().optional().describe("이 시각 이후 생성분(ISO 8601)"),
      limit: z.number().int().min(1).max(100).default(20),
    },
    outputSchema: { items: z.array(z.record(z.any())), total: z.number() },
    annotations: RO,
  },
  handler: withTool<{ status?: string; since?: string; limit?: number }>(
    "commerce_social_list_posts",
    "content:read",
    async (args, ctx: ToolContext) => {
      let q = ctx.db
        .from("mcp_v_social_post")
        .select("slug,kind,caption,hashtags,status,suggested_time,scheduled_at,source_ref,rule_check,rejection_reason,failure_reason,ig_permalink,published_at,insights,created_at", {
          count: "exact",
        });
      if (args.status) q = q.eq("status", args.status);
      if (args.since) q = q.gte("created_at", args.since);
      const { data, error, count } = await q.order("created_at", { ascending: false }).limit(args.limit ?? 20);
      if (error) throw new Error(`목록을 조회하지 못했습니다: ${error.message}`);
      const items = ((data ?? []) as Record<string, unknown>[]).map((r) => ({
        ...r,
        caption: String(r.caption ?? "").slice(0, 120),
      }));
      return { items, total: count ?? items.length };
    },
  ),
};
