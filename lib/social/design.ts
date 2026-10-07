/**
 * 단일 이미지 디자인 → 발행용 JPEG 자산 (D-139).
 *
 * 관리자 수정 화면이 글자나 배경 사진을 바꾸면 여기서 다시 그려 스토리지에 올리고
 * 자산 대장에 등록한다. 기존 이미지는 덮어쓰지 않는다(경로가 내용 해시라 새 파일이 된다).
 * 쓰지 않게 된 이전 이미지는 /admin/assets 에서 사람이 정리한다.
 *
 * service-role 로 동작하므로 호출부가 반드시 관리자 인가를 먼저 확인해야 한다(D-092).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { inspectImage } from "@/mcp/image";
import { pngToJpeg } from "@/mcp/jpeg";
import { PHOTO_H, PHOTO_W, type PhotoPanelDesign } from "@/mcp/photo-design";
import { renderPhotoPanel } from "@/mcp/render-photo";

export const SOCIAL_BUCKET = "product-assets";
/** 소셜 전용 사진 라이브러리. 대표가 고른 사진(photo for social)만 올라간다. */
export const PHOTO_FULL_PREFIX = "social/photos/full";
export const PHOTO_THUMB_PREFIX = "social/photos/thumb";

export interface LibraryPhoto {
  name: string;
  thumbUrl: string;
}

export async function assetBaseUrl(admin: SupabaseClient): Promise<string> {
  const { data } = await admin.from("mcp_config").select("value").eq("key", "asset_base_url").maybeSingle();
  const base = String(data?.value ?? "");
  if (!base) throw new Error("mcp_config.asset_base_url 이 없습니다.");
  return base;
}

/** 사진 라이브러리 목록(썸네일 기준). 이름순. */
export async function listLibraryPhotos(admin: SupabaseClient, baseUrl: string): Promise<LibraryPhoto[]> {
  const out: LibraryPhoto[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await admin.storage
      .from(SOCIAL_BUCKET)
      .list(PHOTO_THUMB_PREFIX, { limit: 1000, offset, sortBy: { column: "name", order: "asc" } });
    if (error) throw new Error(`사진 목록을 읽지 못했습니다: ${error.message}`);
    for (const o of data ?? []) {
      if (!o.name.endsWith(".jpg")) continue;
      out.push({ name: o.name.slice(0, -4), thumbUrl: `${baseUrl}${PHOTO_THUMB_PREFIX}/${o.name}` });
    }
    if (!data || data.length < 1000) break;
  }
  return out;
}

/** 스토어프론트의 브랜드 토큰(site_setting)을 읽는다. 렌더가 색과 워드마크를 여기서 가져간다. */
export async function loadBrandTokens(admin: SupabaseClient, storefrontId: string): Promise<Record<string, string>> {
  const { data: sf, error: sfErr } = await admin.from("storefront").select("brand_id").eq("id", storefrontId).maybeSingle();
  if (sfErr || !sf?.brand_id) throw new Error("스토어프론트의 브랜드를 확인하지 못했습니다.");
  const { data, error } = await admin.from("site_setting").select("key,value").eq("brand_id", sf.brand_id);
  if (error) throw new Error(`브랜드 설정을 읽지 못했습니다: ${error.message}`);
  const tokens: Record<string, string> = {};
  for (const r of (data ?? []) as { key: string; value: string }[]) tokens[r.key] = r.value;
  return tokens;
}

export interface RenderedAsset {
  url: string;
  path: string;
  bytes: number;
  sha256: string;
}

export async function renderDesignToAsset(
  admin: SupabaseClient,
  opts: { design: PhotoPanelDesign; slug: string; storefrontId: string; userId: string; alt: string; baseUrl: string },
): Promise<RenderedAsset> {
  const { design, slug, storefrontId, userId, alt, baseUrl } = opts;

  const { data: blob, error: dlErr } = await admin.storage.from(SOCIAL_BUCKET).download(`${PHOTO_FULL_PREFIX}/${design.photo}.jpg`);
  if (dlErr || !blob) throw new Error(`배경 사진을 읽지 못했습니다(${design.photo}). 사진 라이브러리에 있는지 확인하세요.`);
  const photoBytes = Buffer.from(await blob.arrayBuffer());
  const info = inspectImage(photoBytes);
  if (info.mime !== "image/jpeg" && info.mime !== "image/png") throw new Error("배경 사진은 JPEG 또는 PNG 여야 합니다.");

  const tokens = await loadBrandTokens(admin, storefrontId);
  const png = await renderPhotoPanel(design, tokens, { bytes: photoBytes, mime: info.mime, width: info.width, height: info.height });
  const jpg = pngToJpeg(png, 90);
  const out = inspectImage(jpg);

  const now = new Date();
  const yyyymm = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const path = `mcp/social/${yyyymm}/${slug}-${out.sha256.slice(0, 12)}.jpg`;

  const { error: upErr } = await admin.storage
    .from(SOCIAL_BUCKET)
    .upload(path, jpg, { contentType: "image/jpeg", upsert: false, cacheControl: "31536000" });
  // 같은 내용이면 같은 경로다. 이미 있으면 그대로 쓴다.
  if (upErr && !/exists|duplicate/i.test(upErr.message)) throw new Error(`이미지 저장 실패: ${upErr.message}`);

  const { error: aErr } = await admin.from("mcp_asset").upsert(
    [{
      storefront_id: storefrontId, purpose: "instagram", path, sha256: out.sha256, bytes: jpg.length,
      mime: "image/jpeg", width: PHOTO_W, height: PHOTO_H, alt: alt.slice(0, 200) || null, post_slug: slug, profile_id: userId,
    }],
    { onConflict: "path", ignoreDuplicates: true },
  );
  if (aErr) throw new Error(`자산 등록 실패: ${aErr.message}`);

  return { url: baseUrl + path, path, bytes: jpg.length, sha256: out.sha256 };
}
