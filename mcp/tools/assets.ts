import { z } from "zod";
import { withTool } from "../policy";
import {
  asciiSlug,
  buildAssetPath,
  decodeBase64,
  inspectImage,
  isAlreadyExists,
} from "../image";
import type { AssetPolicy, CoverFields, ToolContext } from "../types";

/**
 * 자산 등록 — 이 서버가 바이너리를 받는 유일한 지점.
 *
 * 설계상 할 수 없는 것(금지가 아니라 부재다):
 *   - 덮어쓰기 : storage.objects 에 UPDATE 정책이 없다. upsert 도 쓰지 않는다.
 *   - 삭제     : DELETE 정책도 삭제 툴도 없다.
 *   - 본문 이미지: purpose 에 blog-cover 하나뿐이다. 본문 이미지는 관리자 화면에서 붙인다.
 *   - 프리픽스 밖 쓰기: RLS 가 mcp/ 로 묶고, DB 함수가 경로를 한 번 더 검사한다.
 *
 * 순서가 중요하다 — 쿼터 → 중복조회 → 업로드 → 대장.
 * 어느 단계에서 죽어도 다음 호출이 같은 경로로 수렴해 스스로 복구한다.
 * 경로가 내용의 해시라서 성립하는 성질이다.
 */

const PURPOSES = ["blog-cover"] as const;

function policyFor(ctx: ToolContext, purpose: string): AssetPolicy {
  const p = ctx.config.assetPolicy?.[purpose];
  if (!p) {
    throw new Error(
      `자산 정책(asset_policy.${purpose})이 설정돼 있지 않습니다. ` +
        "docs/mcp-asset-20260806.sql 적용 여부를 확인하세요. 임의의 기본값을 대신 쓰지 않습니다.",
    );
  }
  return p;
}

export const createImage = {
  name: "commerce_create_image",
  config: {
    title: "커버 이미지 등록",
    description:
      "블로그 커버(썸네일) 이미지를 등록하고 공개 URL 을 돌려준다. 입력은 둘 중 하나다 — " +
      "① template + fields: 서버가 브랜드 토큰으로 커버를 직접 그린다(권장 — 토큰 비용 0, 전송 변형 없음). " +
      "② data_base64: 직접 만든 이미지를 올린다. " +
      "돌려받은 url 을 commerce_draft_post 의 cover_image 인자에 그대로 넣으면 초안에 커버가 붙는다. " +
      "PNG·JPEG·WebP 만 받으며 형식은 선언값이 아니라 파일 내용으로 판별한다. " +
      "가로 1200px·세로 630px 이상이어야 한다(공유 썸네일이 깨지지 않는 최소 규격). " +
      "1MB 를 넘으면 거부하므로 그보다 크면 다시 인코딩하거나 관리자 화면에서 직접 올릴 것. " +
      "본문 안에 넣을 이미지는 이 툴로 올리지 않는다 — 관리자 화면에서 첨부한다. " +
      "보내는 쪽에서 원본의 sha256 을 알면 sha256 인자에 함께 넘길 것 — 전송 중 변형되면 저장 전에 거부한다. " +
      "만들기 전에 commerce_get_brand_tokens 로 색·타이포·금지 사항을 먼저 확인할 것.",
    inputSchema: {
      purpose: z
        .enum(PURPOSES)
        .default("blog-cover")
        .describe("현재는 블로그 커버만 지원한다"),
      data_base64: z
        .string()
        .max(1_400_000)
        .optional()
        .describe("이미지 바이트의 base64. template 와 동시에 줄 수 없다"),
      template: z
        .enum(["signature-cover"])
        .optional()
        .describe("서버측 렌더 템플릿. data_base64 와 동시에 줄 수 없다"),
      fields: z
        .object({
          headline: z.string().min(4).max(60).describe("헤드라인. \\n 으로 줄바꿈"),
          eyebrow: z.string().max(40).optional().describe("헤드라인 위 작은 소개줄"),
          notes: z.string().max(80).optional().describe("하단 모노 라벨(예: 플레이버 노트). 대문자로 표시된다"),
          variant: z.enum(["light", "dark"]).default("light"),
        })
        .optional()
        .describe("template 렌더에 쓸 텍스트"),
      alt: z
        .string()
        .min(5)
        .max(120)
        .describe("대체 텍스트. 접근성과 이미지 SEO 에 쓰인다"),
      post_slug: z
        .string()
        .max(200)
        .optional()
        .describe("이 커버를 쓸 글의 슬러그. 미참조 자산 정리에 쓰인다"),
      name_hint: z.string().max(60).optional().describe("파일명 힌트. 생략하면 post_slug 를 쓴다"),
      sha256: z
        .string()
        .regex(/^[a-fA-F0-9]{64}$/)
        .optional()
        .describe("원본 바이트의 sha256(16진 64자). 넘기면 서버가 대조해 전송 변형을 거부한다"),
    },
    outputSchema: {
      url: z.string(),
      path: z.string(),
      sha256: z.string(),
      bytes: z.number(),
      width: z.number(),
      height: z.number(),
      mime: z.string(),
      duplicate: z.boolean(),
      next_step: z.string(),
    },
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      // 경로가 내용의 해시이므로 같은 바이트를 몇 번 보내도 결과가 같다.
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  handler: withTool<{
    purpose?: string;
    data_base64?: string;
    template?: "signature-cover";
    fields?: CoverFields;
    alt: string;
    post_slug?: string;
    name_hint?: string;
    sha256?: string;
  }>(
    "commerce_create_image",
    "content:write",
    async (args, ctx: ToolContext) => {
      const purpose = args.purpose ?? "blog-cover";
      const policy = policyFor(ctx, purpose);

      const alt = (args.alt ?? "").trim();
      if (alt.length < 5) {
        throw new Error("대체 텍스트(alt)를 5자 이상 적어주세요. 접근성과 이미지 SEO 에 쓰입니다.");
      }

      // ── 1. 입력 경로 확정 — base64 업로드 XOR 템플릿 렌더 ──
      const hasData = Boolean(args.data_base64 && args.data_base64.trim());
      const hasTemplate = Boolean(args.template);
      if (hasData === hasTemplate) {
        throw new Error(
          "data_base64 와 template 중 정확히 하나만 주세요. " +
            "서버가 그리게 하려면 template + fields, 직접 만든 이미지를 올리려면 data_base64 입니다.",
        );
      }

      let buf: Buffer;
      if (hasTemplate) {
        if (!ctx.render) {
          throw new Error("이 배포에는 커버 렌더러가 없습니다. data_base64 로 직접 올리거나 관리자에게 문의하세요.");
        }
        const fields = args.fields;
        if (!fields?.headline?.trim()) {
          throw new Error("template 렌더에는 fields.headline 이 필요합니다.");
        }
        // 브랜드 토큰 — 렌더러가 색·워드마크를 여기서 읽는다. 코드에 기본값을 두지 않는다.
        const { data: tokRows, error: tokErr } = await ctx.db
          .from("mcp_v_site_setting")
          .select("key,value");
        if (tokErr) throw new Error(`브랜드 설정을 읽지 못했습니다: ${tokErr.message}`);
        const tokens: Record<string, string> = {};
        for (const r of (tokRows ?? []) as { key: string; value: string }[]) tokens[r.key] = r.value;
        if (!Object.keys(tokens).some((k) => k.startsWith("brand."))) {
          throw new Error("브랜드 규범(brand.*)이 설정돼 있지 않습니다. 렌더 대신 data_base64 를 쓰거나 site_setting 을 채우세요.");
        }
        buf = await ctx.render({ template: args.template!, fields, tokens });
      } else {
        // ── 디코드 전에 길이부터 본다(메모리 방어) ──
        const raw = (args.data_base64 ?? "").trim();
        if (raw.length > policy.max_b64_len) {
          throw new Error(
            `이미지가 너무 큽니다(base64 ${raw.length.toLocaleString()}자, 상한 ${policy.max_b64_len.toLocaleString()}자). ` +
              "가로 1200px · JPEG 품질 85 로 다시 인코딩하거나 /admin/blog 에서 직접 올리세요.",
          );
        }
        buf = decodeBase64(raw);
      }

      if (buf.length > policy.max_bytes) {
        throw new Error(
          `이미지가 ${Math.round(buf.length / 1024)}KB 로 상한(${Math.round(policy.max_bytes / 1024)}KB)을 넘습니다. ` +
            "가로 1200px · JPEG 품질 85 로 다시 인코딩하거나 /admin/blog 에서 직접 올리세요.",
        );
      }

      // ── 2. 형식·크기 검증 ──
      const info = inspectImage(buf);

      // 종단 무결성. PNG·WebP 는 구조로 잡히지만 JPEG 에는 체크섬이 없어
      // 중간이 변형돼도 구조 검사만으로는 통과한다. 보내는 쪽이 해시를 알면 여기서 막는다.
      const expected = hasData ? (args.sha256 ?? "").toLowerCase() : "";
      if (expected && expected !== info.sha256) {
        throw new Error(
          `전송된 바이트가 원본과 다릅니다(기대 ${expected.slice(0, 12)}… / 실제 ${info.sha256.slice(0, 12)}…, ${buf.length}바이트). ` +
            "base64 가 전송 중 변형됐습니다. 다시 보내거나 /admin/blog 에서 직접 올리세요.",
        );
      }

      if (!policy.mime.includes(info.mime)) {
        throw new Error(
          `${info.mime} 은 등록할 수 없습니다. 허용: ${policy.mime.join(" · ")}`,
        );
      }
      if (info.width < policy.min_width || info.height < policy.min_height) {
        throw new Error(
          `커버는 ${policy.min_width}×${policy.min_height} 이상이어야 합니다(현재 ${info.width}×${info.height}). ` +
            "이보다 작으면 카카오톡·SNS 공유 썸네일이 깨집니다.",
        );
      }
      const aspect = info.width / info.height;
      if (aspect < policy.aspect_min || aspect > policy.aspect_max) {
        throw new Error(
          `커버 가로세로비가 ${aspect.toFixed(2)} 입니다. ${policy.aspect_min}–${policy.aspect_max} 범위여야 합니다(권장 3:2).`,
        );
      }

      // ── 3. 신원 — 쿼터의 기준이다 ──
      // OAuth 경로는 tokenId 가 null 이므로(mcp/auth.ts) profileId 로 센다.
      const profileId = ctx.identity.profileId;
      if (!profileId) {
        throw new Error("계정을 확인하지 못했습니다. 커넥터를 다시 연결하세요.");
      }

      const name =
        asciiSlug(args.name_hint) || asciiSlug(args.post_slug) || asciiSlug(args.template) || asciiSlug(purpose) || "cover";
      const path = buildAssetPath(policy.prefix, name, info.sha256, info.ext);

      // ── 4. 사전 점검 — 바이트를 쓰기 전에 쿼터와 중복을 본다 ──
      const pre = await ctx.db.rpc("mcp_asset_precheck", {
        p_purpose: purpose,
        p_profile_id: profileId,
        p_path: path,
      });
      if (pre.error) throw new Error(pre.error.message);
      const existing = (Array.isArray(pre.data) ? pre.data[0] : pre.data) as string | null;

      let duplicate = Boolean(existing);

      // ── 5. 업로드 → 대장 ──
      if (!existing) {
        const up = await ctx.storage.upload(policy.bucket, path, info.bytes, {
          contentType: info.mime,
          // 경로에 내용 해시가 있어 같은 URL 의 내용이 바뀔 수 없다 → 사실상 immutable.
          cacheControl: "31536000",
        });
        if (up.error) {
          if (isAlreadyExists(up.error)) {
            // 대장에는 없는데 파일은 있다 = 직전 시도가 대장 등록 전에 끊긴 것이다.
            // 오류가 아니라 이미 있는 것으로 보고 대장만 채운다(자가 치유).
            duplicate = true;
          } else {
            throw new Error(`이미지를 저장하지 못했습니다: ${up.error.message}`);
          }
        }

        const reg = await ctx.db.rpc("mcp_register_asset", {
          p_purpose: purpose,
          p_path: path,
          p_sha256: info.sha256,
          p_bytes: info.size,
          p_mime: info.mime,
          p_width: info.width,
          p_height: info.height,
          p_alt: alt,
          p_post_slug: args.post_slug ?? null,
          p_token_id: ctx.identity.tokenId,
          p_profile_id: profileId,
        });
        if (reg.error) throw new Error(`자산 대장에 기록하지 못했습니다: ${reg.error.message}`);

        const wasDup = (Array.isArray(reg.data) ? reg.data[0] : reg.data) === true;
        duplicate = duplicate || wasDup;
      }

      return {
        url: ctx.storage.publicUrl(policy.bucket, path),
        path,
        sha256: info.sha256,
        bytes: info.size,
        width: info.width,
        height: info.height,
        mime: info.mime,
        duplicate,
        next_step: duplicate
          ? "같은 이미지가 이미 등록돼 있어 그 URL 을 돌려줍니다. 새 글이면 commerce_draft_post 의 cover_image, 기존 초안이면 commerce_attach_cover 에 넣으세요."
          : "등록했습니다. 새 글이면 commerce_draft_post 의 cover_image 인자에, 이미 저장된 초안이면 commerce_attach_cover 에 이 url 을 넣으세요.",
      };
    },
    {
      // base64 원문을 감사로그에 남기지 않는다.
      // redact() 가 200자로 자르기는 하지만, 잘린 앞토막은 무엇이 올라갔는지 알려주지 못한다.
      auditArgs: (args, data) => ({
        purpose: args.purpose ?? "blog-cover",
        alt: args.alt ?? null,
        post_slug: args.post_slug ?? null,
        b64_len: String(args.data_base64 ?? "").length,
        template: args.template ?? null,
        sha256_expected: args.sha256 ?? null,
        path: (data?.path as string) ?? null,
        sha256: (data?.sha256 as string) ?? null,
        bytes: (data?.bytes as number) ?? null,
        duplicate: (data?.duplicate as boolean) ?? null,
      }),
    },
  ),
};
