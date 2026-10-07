import { NextResponse, type NextRequest } from "next/server";
import { getAdminUser } from "@/lib/auth-guard";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { parsePhotoDesign, photoDesignTexts, type PhotoPanelDesign } from "@/mcp/photo-design";
import { assetBaseUrl, renderDesignToAsset } from "@/lib/social/design";
import { checkSocialContent, parseHashtags } from "@/lib/social/rules";

/**
 * 인스타그램 초안 수정 저장 (D-139).
 *
 * /admin/social/<id>/edit 의 폼이 여기로 POST 한다. 캡션, 해시태그, 권장 시각을 고치고,
 * 단일 이미지(사진 패널)라면 글자와 배경 사진을 바꿔 서버가 다시 그린다.
 *
 * 서버 액션이 아니라 라우트 핸들러인 이유: 렌더가 fs 로 읽는 폰트(mcp/fonts)를 함수 번들에
 * 넣으려면 next.config 의 outputFileTracingIncludes 에 경로를 적어야 하는데, 이미 검증된
 * /api/mcp 와 같은 방식으로 묶기 위해서다.
 *
 * 원칙은 D-135 그대로다. 여기서는 draft 만 고친다. 상태를 scheduled 로 옮기지 않는다.
 * service-role 을 쓰므로 관리자 확인이 유일한 방어선이다(D-092). 쿠키 인증 POST 이므로
 * Origin 도 확인한다.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function back(req: NextRequest, id: string, kind: "e" | "ok", msg: string) {
  const path = /^[0-9a-f-]{36}$/i.test(id) ? `/admin/social/${id}/edit` : "/admin/social";
  const url = new URL(path, req.url);
  url.searchParams.set(kind, msg.slice(0, 600));
  return NextResponse.redirect(url, 303);
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  let sameOrigin = false;
  try {
    sameOrigin = !!origin && !!host && new URL(origin).host === host;
  } catch {
    sameOrigin = false;
  }
  if (!sameOrigin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const form = await req.formData();
  const id = String(form.get("id") || "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return back(req, "", "e", "잘못된 초안 id 입니다.");
  if (!hasServiceRole) return back(req, id, "e", "service-role 키가 없어 저장할 수 없습니다(배포 환경에서 실행하세요).");

  const admin = createAdminClient();
  const { data: post, error } = await admin
    .from("social_post")
    .select("id,slug,status,kind,media,storefront_id,rule_check")
    .eq("id", id)
    .maybeSingle();
  if (error || !post) return back(req, id, "e", "초안을 찾지 못했습니다.");
  if (post.status !== "draft") {
    return back(req, id, "e", `초안 상태에서만 수정할 수 있습니다(현재 ${post.status}). 목록에서 초안으로 되돌린 뒤 수정하세요.`);
  }

  const caption = String(form.get("caption") || "").replace(/\r\n?/g, "\n").trim();
  const hashtags = parseHashtags(String(form.get("hashtags") || ""));

  // datetime-local 값은 시간대가 없다. 관리자 브라우저(KST)에서 고른 값이므로 +09:00 으로 해석한다.
  const rawTime = String(form.get("suggested_time") || "").trim();
  let suggested: string | null = null;
  if (rawTime) {
    const d = new Date(/[zZ]|[+-]\d{2}:\d{2}$/.test(rawTime) ? rawTime : `${rawTime}:00+09:00`);
    if (Number.isNaN(d.getTime())) return back(req, id, "e", "발행 시각을 해석하지 못했습니다.");
    suggested = d.toISOString();
  }

  const media = (Array.isArray(post.media) ? post.media : []) as { url: string; alt?: string | null; design?: PhotoPanelDesign }[];
  const oldDesign = media.length === 1 ? media[0].design : undefined;

  let design: PhotoPanelDesign | undefined;
  if (form.get("has_design") === "1") {
    if (!oldDesign) return back(req, id, "e", "이 게시물의 이미지는 화면에서 다시 그릴 수 없는 완성본입니다. 캡션만 수정할 수 있습니다.");
    const rows = String(form.get("d_rows") || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const i = line.indexOf("|");
        return i < 0 ? { k: line, v: "" } : { k: line.slice(0, i).trim(), v: line.slice(i + 1).trim() };
      });
    if (rows.some((r) => !r.k || !r.v)) return back(req, id, "e", "표는 한 줄에 '항목 | 값' 형식으로 적어 주세요.");
    try {
      design = parsePhotoDesign({
        series: oldDesign.series, // 시리즈는 바꾸지 않는다
        photo: form.get("d_photo"),
        focus_x: form.get("d_focus_x"),
        focus_y: form.get("d_focus_y"),
        panel_pos: form.get("d_panel_pos"),
        label: form.get("d_label"),
        eyebrow: form.get("d_eyebrow"),
        big: form.get("d_big"),
        headline: form.get("d_headline"),
        body: form.get("d_body"),
        rows,
        notes: form.get("d_notes"),
        accent: form.get("d_accent"),
      });
    } catch (e) {
      return back(req, id, "e", e instanceof Error ? e.message : "이미지 입력값이 올바르지 않습니다.");
    }
  }

  const check = checkSocialContent(caption, hashtags, design ? photoDesignTexts(design) : []);
  if (check.errors.length) return back(req, id, "e", check.errors.join(" / "));

  let nextMedia = media;
  let redrawn = false;
  if (design && JSON.stringify(design) !== JSON.stringify(oldDesign)) {
    try {
      const baseUrl = await assetBaseUrl(admin);
      const alt = [design.eyebrow, design.big, design.headline.replace(/\n/g, " ")].filter(Boolean).join(" ").slice(0, 200);
      const asset = await renderDesignToAsset(admin, {
        design, slug: post.slug, storefrontId: post.storefront_id, userId: user.id, alt, baseUrl,
      });
      nextMedia = [{ url: asset.url, alt, design }];
      redrawn = true;
    } catch (e) {
      console.error(`[social] design render failed slug=${post.slug}: ${e instanceof Error ? e.message : String(e)}`);
      return back(req, id, "e", e instanceof Error ? e.message : "이미지를 다시 그리지 못했습니다.");
    }
  }

  const { error: upErr, count } = await admin
    .from("social_post")
    .update(
      { caption, hashtags, suggested_time: suggested, media: nextMedia, rule_check: { errors: [], warnings: check.warnings } },
      { count: "exact" },
    )
    .eq("id", id)
    .eq("status", "draft"); // 그 사이 승인됐으면 0행
  if (upErr) return back(req, id, "e", `저장 실패: ${upErr.message}`);
  if (!count) return back(req, id, "e", "저장하는 사이 상태가 바뀌었습니다. 목록에서 다시 확인하세요.");

  return back(req, id, "ok", redrawn ? "저장했습니다. 이미지를 새로 그렸습니다." : "저장했습니다.");
}
