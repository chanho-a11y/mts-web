"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth-guard";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { runSocialWorker } from "@/lib/social/run";

/**
 * 인스타그램 초안 승인 게이트 (D-135).
 *
 * MCP 는 draft 만 만든다(부재로 강제). 상태를 scheduled 로 옮기는 지점은 이 파일의
 * approveAction 하나뿐이고, 사람이 버튼을 눌러야만 실행된다. 발행 워커(별건)는
 * scheduled 이고 scheduled_at 이 지난 행만 집는다 — 그래서 여기서 scheduled_at 을 반드시 채운다.
 *
 * service-role 은 이 액션 안에서만 쓰이고 requireAdmin() 이 선행한다(D-092 원칙).
 */

const BACK = "/admin/social";

function fail(msg: string): never {
  redirect(`${BACK}?e=${encodeURIComponent(msg)}`);
}

async function loadPost(id: string) {
  if (!hasServiceRole) fail("service-role 키가 없어 변경할 수 없습니다(배포 환경에서 실행하세요).");
  if (!/^[0-9a-f-]{36}$/i.test(id)) fail("잘못된 초안 id 입니다.");
  const admin = createAdminClient();
  const { data, error } = await admin.from("social_post").select("id,slug,status,suggested_time,media,kind").eq("id", id).maybeSingle();
  if (error || !data) fail("초안을 찾지 못했습니다.");
  return { admin, post: data! };
}

/** draft → scheduled. 예약 시각이 없으면 지금. */
export async function approveAction(formData: FormData) {
  const user = await requireAdmin();
  const id = String(formData.get("id") || "");
  const { admin, post } = await loadPost(id);

  if (post.status !== "draft") fail(`draft 상태만 승인할 수 있습니다(현재 ${post.status}).`);

  // datetime-local 값은 시간대가 없다. 관리자 브라우저(KST)에서 고른 값이므로 +09:00 으로 고정 해석한다.
  const raw = String(formData.get("scheduled_at") || "").trim();
  let when: Date;
  if (raw) {
    when = new Date(/[zZ]|[+-]\d{2}:\d{2}$/.test(raw) ? raw : `${raw}:00+09:00`);
    if (Number.isNaN(when.getTime())) fail("예약 시각을 해석하지 못했습니다.");
  } else {
    when = new Date();
  }

  // 미디어가 비었거나 캐러셀 장수가 맞지 않으면 워커에서 죽는다 — 승인 단계에서 거른다.
  const media = Array.isArray(post.media) ? post.media : [];
  if (post.kind === "image" && media.length !== 1) fail("이미지 게시물은 미디어가 정확히 1장이어야 합니다.");
  if (post.kind === "carousel" && (media.length < 2 || media.length > 10)) fail("캐러셀은 2~10장이어야 합니다.");

  const { error } = await admin
    .from("social_post")
    .update({
      status: "scheduled",
      scheduled_at: when.toISOString(),
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      rejection_reason: null,
      failure_reason: null,
    })
    .eq("id", id)
    .eq("status", "draft"); // 경쟁 상태 방어: 그 사이 바뀌었으면 0행
  if (error) fail(`승인 실패: ${error.message}`);

  revalidatePath(BACK);
  redirect(`${BACK}?ok=${encodeURIComponent(`${post.slug} 승인 — ${when.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })} 발행 예약`)}`);
}

/** draft | scheduled → rejected (사유 필수). scheduled 를 반려하면 발행이 취소된다. */
export async function rejectAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  const reason = String(formData.get("reason") || "").trim();
  if (!reason) fail("반려 사유를 적어주세요 — MCP 가 이 사유를 읽고 다시 씁니다.");
  const { admin, post } = await loadPost(id);
  if (!["draft", "scheduled"].includes(post.status)) fail(`draft·scheduled 만 반려할 수 있습니다(현재 ${post.status}).`);

  const { error } = await admin
    .from("social_post")
    .update({ status: "rejected", rejection_reason: reason, scheduled_at: null })
    .eq("id", id)
    .in("status", ["draft", "scheduled"]);
  if (error) fail(`반려 실패: ${error.message}`);

  revalidatePath(BACK);
  redirect(`${BACK}?ok=${encodeURIComponent(`${post.slug} 반려`)}`);
}

/** scheduled | rejected | failed → draft. 예약 취소 또는 재검토. */
export async function revertToDraftAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  const { admin, post } = await loadPost(id);
  if (!["scheduled", "rejected", "failed"].includes(post.status)) fail(`scheduled·rejected·failed 만 되돌릴 수 있습니다(현재 ${post.status}).`);

  const { error } = await admin
    .from("social_post")
    .update({ status: "draft", scheduled_at: null, approved_by: null, approved_at: null })
    .eq("id", id)
    .in("status", ["scheduled", "rejected", "failed"]);
  if (error) fail(`되돌리기 실패: ${error.message}`);

  revalidatePath(BACK);
  redirect(`${BACK}?ok=${encodeURIComponent(`${post.slug} → draft`)}`);
}

/** 삭제 — 사람만. 발행된 건은 기록이므로 지우지 않는다. */
export async function deleteSocialPostAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  const { admin, post } = await loadPost(id);
  if (post.status === "published") fail("발행된 게시물의 기록은 지우지 않습니다.");

  const { error } = await admin.from("social_post").delete().eq("id", id).neq("status", "published");
  if (error) fail(`삭제 실패: ${error.message}`);

  revalidatePath(BACK);
  redirect(`${BACK}?ok=${encodeURIComponent(`${post.slug} 삭제`)}`);
}

/** 발행 워커 즉시 실행 (D-137). 크론을 기다리지 않고 due 건을 지금 처리한다. */
export async function runWorkerNowAction() {
  await requireAdmin();
  if (!hasServiceRole) fail("service-role 키가 없어 실행할 수 없습니다.");
  const r = await runSocialWorker({ maxPosts: 3, budgetMs: 50_000 });
  revalidatePath(BACK);
  if (!r.ok) fail(`워커 오류: ${r.error ?? "unknown"}`);
  const summary = r.processed.length
    ? r.processed.map((p) => `${p.slug}: ${p.result}${p.detail ? ` (${p.detail})` : ""}`).join(" · ")
    : "처리할 예약 건이 없습니다.";
  redirect(`${BACK}?ok=${encodeURIComponent(`워커 실행 — ${summary}`)}`);
}
