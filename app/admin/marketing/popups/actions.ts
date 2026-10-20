"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth-guard";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { fromKstInput, safeCtaUrl, safeImageUrl, type PopupAudience, type PopupKind } from "@/lib/site-popup-shared";

// 공지 팝업 관리자 액션(D-148). site_popup 은 RLS 정책 0 + anon/authenticated 권한 회수 상태라
// service-role 로만 쓴다. 그러므로 모든 액션 첫 줄의 requireAdmin() 이 유일한 방어선이다(D-092).

const BACK = "/admin/marketing/popups";

function fail(msg: string, editId?: string): never {
  const q = new URLSearchParams({ e: msg });
  if (editId) q.set("edit", editId);
  redirect(`${BACK}?${q.toString()}`);
}

function done(msg: string, extra = ""): never {
  revalidatePath(BACK);
  revalidatePath("/");
  redirect(`${BACK}?saved=1&msg=${encodeURIComponent(msg)}${extra}`);
}

function db() {
  if (!hasServiceRole) fail("service-role 키가 필요합니다(배포 환경에서만 동작)");
  return createAdminClient();
}

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const optStr = (f: FormData, k: string) => str(f, k) || null;

export async function savePopupAction(formData: FormData) {
  const user = await requireAdmin();
  const id = str(formData, "id") || undefined;

  const kind = str(formData, "kind") as PopupKind;
  if (kind !== "regular" && kind !== "special") fail("유형을 선택하세요", id);
  const audience = str(formData, "audience") as PopupAudience;
  if (!["all", "business", "consumer"].includes(audience)) fail("노출 대상을 선택하세요", id);
  const brandId = str(formData, "brand_id");
  if (!/^[0-9a-f-]{36}$/i.test(brandId)) fail("브랜드를 선택하세요", id);

  const title = str(formData, "title");
  if (!title || title.length > 60) fail("제목은 1~60자로 입력하세요", id);
  const body = str(formData, "body");
  if (body.length > 1000) fail("내용은 1000자 이하로 입력하세요", id);

  const titleEn = optStr(formData, "title_en");
  const bodyEn = optStr(formData, "body_en");
  if (titleEn && titleEn.length > 80) fail("영문 제목은 80자 이하로 입력하세요", id);
  if (bodyEn && bodyEn.length > 1500) fail("영문 내용은 1500자 이하로 입력하세요", id);
  if (bodyEn && !titleEn) fail("영문 내용을 넣으려면 영문 제목도 입력하세요", id);

  const rawImage = str(formData, "image_url");
  const imageUrl = safeImageUrl(rawImage);
  if (rawImage && !imageUrl) fail("이미지 주소가 올바르지 않습니다", id);

  const rawCta = str(formData, "cta_url");
  const ctaUrl = safeCtaUrl(rawCta);
  if (rawCta && !ctaUrl) fail("버튼 링크는 /로 시작하는 사이트 내부 경로 또는 https:// 주소만 가능합니다", id);
  const ctaLabel = optStr(formData, "cta_label");
  const ctaLabelEn = optStr(formData, "cta_label_en");
  if (ctaLabel && ctaLabel.length > 20) fail("버튼 문구는 20자 이하로 입력하세요", id);
  if (ctaLabelEn && ctaLabelEn.length > 30) fail("영문 버튼 문구는 30자 이하로 입력하세요", id);

  const startsAt = fromKstInput(str(formData, "starts_at"));
  if (!startsAt) fail("시작 일시를 입력하세요", id);
  const rawEnd = str(formData, "ends_at");
  const endsAt = rawEnd ? fromKstInput(rawEnd) : null;
  if (rawEnd && !endsAt) fail("종료 일시 형식이 올바르지 않습니다", id);
  if (endsAt && new Date(endsAt) <= new Date(startsAt!)) fail("종료 일시는 시작 일시보다 뒤여야 합니다", id);

  const priority = Math.max(-999, Math.min(999, parseInt(str(formData, "priority") || "0", 10) || 0));
  const isActive = formData.get("is_active") === "on";

  const row = {
    brand_id: brandId,
    kind,
    audience,
    title,
    body,
    title_en: titleEn,
    body_en: bodyEn,
    image_url: imageUrl,
    cta_url: ctaUrl,
    cta_label: ctaUrl ? ctaLabel : null,
    cta_label_en: ctaUrl ? ctaLabelEn : null,
    starts_at: startsAt,
    ends_at: endsAt,
    priority,
    is_active: isActive,
    updated_at: new Date().toISOString(),
    updated_by: user.id,
  };

  const admin = db();
  if (id) {
    const { error } = await admin.from("site_popup").update(row).eq("id", id).is("archived_at", null);
    if (error) fail(`저장 실패: ${error.message}`, id);
    done("공지 팝업을 수정했습니다");
  }
  const { error } = await admin.from("site_popup").insert(row);
  if (error) fail(`저장 실패: ${error.message}`);
  done("공지 팝업을 등록했습니다");
}

async function patch(formData: FormData, values: Record<string, unknown>, onlyArchived: boolean | null, msg: string) {
  const user = await requireAdmin();
  const id = str(formData, "id");
  if (!id) fail("대상이 없습니다");
  let q = db().from("site_popup").update({ ...values, updated_at: new Date().toISOString(), updated_by: user.id }).eq("id", id);
  if (onlyArchived === true) q = q.not("archived_at", "is", null);
  if (onlyArchived === false) q = q.is("archived_at", null);
  const { error } = await q;
  if (error) fail(`처리 실패: ${error.message}`);
  done(msg, onlyArchived === true ? "&view=archived" : "");
}

export async function togglePopupAction(formData: FormData) {
  const next = formData.get("active") !== "true";
  await patch(formData, { is_active: next }, false, next ? "켰습니다" : "껐습니다");
}

/** 삭제 1단계: 보관(복구 가능). 홈에서 즉시 내려간다. */
export async function archivePopupAction(formData: FormData) {
  await patch(formData, { archived_at: new Date().toISOString() }, false, "보관함으로 옮겼습니다");
}

/** 복구는 꺼진 상태로 돌린다(복구 즉시 홈에 다시 뜨는 일을 막기 위함). */
export async function restorePopupAction(formData: FormData) {
  await patch(formData, { archived_at: null, is_active: false }, true, "복구했습니다(꺼진 상태)");
}

/** 삭제 2단계: 보관된 공지만 완전 삭제. 업로드한 이미지 파일은 지우지 않는다. */
export async function deletePopupAction(formData: FormData) {
  await requireAdmin();
  const id = str(formData, "id");
  if (!id) fail("대상이 없습니다");
  if (formData.get("confirm") !== "yes") fail("완전 삭제 확인이 필요합니다");
  const { error, count } = await db()
    .from("site_popup")
    .delete({ count: "exact" })
    .eq("id", id)
    .not("archived_at", "is", null);
  if (error) fail(`삭제 실패: ${error.message}`);
  if (!count) fail("보관된 공지만 완전 삭제할 수 있습니다");
  done("완전히 삭제했습니다", "&view=archived");
}
