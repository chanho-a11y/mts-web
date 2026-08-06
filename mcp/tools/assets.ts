import { z } from "zod";
import { withTool } from "../policy";
import {
  asciiSlug,
  buildAssetPath,
  decodeBase64,
  inspectImage,
  isAlreadyExists,
} from "../image";
import type { AssetPolicy, ToolContext } from "../types";

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
      "블로그 커버(썸네일) 이미지를 등록하고 공개 URL 을 돌려준다. 이미지는 base64 로 넘긴다. " +
      "돌려받은 url 을 commerce_draft_post 의 cover_image 인자에 그대로 넣으면 초안에 커버가 붙는다. " +
      "PNG·JPEG·WebP 만 받으며 형식은 선언값이 아니라 파일 내용으로 판별한다. " +
      "가로 1200px·세로 630px 이상이어야 한다(공유 썸네일이 깨지지 않는 최소 규격). " +
      "1MB 를 넘으면 거부하므로 그보다 크면 다시 인코딩하거나 관리자 화면에서 직접 올릴 것. " +
      "본문 안에 넣을 이미지는 이 툴로 올리지 않는다 — 관리자 화면에서 첨부한다. " +
      "만들기 전에 commerce_get_brand_tokens 로 색·타이포·금지 사항을 먼저 확인할 것.",
    inputSchema: {
      purpose: z
        .enum(PURPOSES)
        .default("blog-cover")
        .describe("현재는 블로그 커버만 지원한다"),
      data_base64: z
        .string()
        .min(1)
        .max(1_400_000)
        .describe("이미지 바이트의 base64. 데이터 URI 접두사가 있어도 된다"),
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
    data_base64: string;
    alt: string;
    post_slug?: string;
    name_hint?: string;
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

      // ── 1. 디코드 전에 길이부터 본다(메모리 방어) ──
      const raw = args.data_base64 ?? "";
      if (raw.length > policy.max_b64_len) {
        throw new Error(
          `이미지가 너무 큽니다(base64 ${raw.length.toLocaleString()}자, 상한 ${policy.max_b64_len.toLocaleString()}자). ` +
            "가로 1200px · JPEG 품질 85 로 다시 인코딩하거나 /admin/blog 에서 직접 올리세요.",
        );
      }

      const buf = decodeBase64(raw);
      if (buf.length > policy.max_bytes) {
        throw new Error(
          `이미지가 ${Math.round(buf.length / 1024)}KB 로 상한(${Math.round(policy.max_bytes / 1024)}KB)을 넘습니다. ` +
            "가로 1200px · JPEG 품질 85 로 다시 인코딩하거나 /admin/blog 에서 직접 올리세요.",
        );
      }

      // ── 2. 형식·크기 검증 ──
      const info = inspectImage(buf);

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
        asciiSlug(args.name_hint) || asciiSlug(args.post_slug) || asciiSlug(purpose) || "cover";
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
          ? "같은 이미지가 이미 등록돼 있어 그 URL 을 돌려줍니다. commerce_draft_post 의 cover_image 인자에 넣으세요."
          : "등록했습니다. commerce_draft_post 의 cover_image 인자에 이 url 을 넣으면 초안에 커버가 붙습니다.",
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
        path: (data?.path as string) ?? null,
        sha256: (data?.sha256 as string) ?? null,
        bytes: (data?.bytes as number) ?? null,
        duplicate: (data?.duplicate as boolean) ?? null,
      }),
    },
  ),
};
