"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth-guard";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { runSocialWorker } from "@/lib/social/run";
import { parsePhotoDesign } from "@/mcp/photo-design";

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

/* ── 일괄 등록과 일괄 승인 (D-138) ─────────────────────────────────────────
 *
 * 완성된 카드뉴스 세트(이미지는 scripts/social-upload-assets.mjs 로 스토리지에 미리 올림)를
 * manifest.json 한 장으로 초안에 등록하고, 사람이 버튼 한 번으로 권장 시각에 예약한다.
 *
 * 원칙은 D-135 그대로다. 등록은 draft 로만 들어가고, scheduled 전이는 관리자 본인이
 * 이 화면에서 누를 때만 일어난다. approved_by 는 그 순간 로그인한 관리자다.
 */

const BUCKET = "product-assets";
const ASSET_PATH = /^mcp\/social\/\d{6}\/[A-Za-z0-9._-]+\.jpg$/;
const SLUG = /^[a-z0-9][a-z0-9-]{2,118}$/;

interface ManifestMedia { file?: string; path: string; sha256: string; bytes: number; alt?: string; design?: unknown }
interface ManifestPost {
  slug: string; title?: string; scheduled_at: string; caption: string; hashtags: string[];
  source_ref?: string; media: ManifestMedia[];
}

export async function bulkImportAction(formData: FormData) {
  const user = await requireAdmin();
  if (!hasServiceRole) fail("service-role 키가 없어 등록할 수 없습니다.");
  // 저장소에 함께 배포된 세트(파일 선택 없이 등록) 또는 직접 고른 manifest.json
  let posts: ManifestPost[];
  const bundled = String(formData.get("bundled") || "");
  if (bundled) {
    // 2026q4 = 카드뉴스 35건(D-138), 2026q4-single = 단일 이미지 23건(D-139)
    if (bundled === "2026q4") posts = (await import("./import/2026q4.json")).default as ManifestPost[];
    else if (bundled === "2026q4-single") posts = (await import("./import/2026q4-single.json")).default as ManifestPost[];
    else fail("알 수 없는 세트입니다.");
  } else {
    const file = formData.get("manifest");
    if (!(file instanceof File) || file.size === 0) fail("manifest.json 파일을 선택하세요.");
    if ((file as File).size > 900_000) fail("manifest.json 이 너무 큽니다(900KB 이하).");
    try {
      posts = JSON.parse(await (file as File).text());
    } catch {
      fail("manifest.json 을 읽지 못했습니다(JSON 형식 오류).");
    }
  }
  if (!Array.isArray(posts!) || posts!.length === 0 || posts!.length > 100) fail("게시물은 1~100건이어야 합니다.");

  const admin = createAdminClient();
  const { data: base } = await admin.from("mcp_config").select("value").eq("key", "asset_base_url").maybeSingle();
  const baseUrl = String(base?.value ?? "");
  if (!baseUrl) fail("mcp_config.asset_base_url 이 없습니다.");
  const { data: sfRow } = await admin.from("mcp_asset").select("storefront_id").limit(1).maybeSingle();
  const storefrontId = sfRow?.storefront_id as string | undefined;
  if (!storefrontId) fail("storefront 를 확인하지 못했습니다(mcp_asset 이 비어 있음).");

  // 1) 형식 검사. 하나라도 틀리면 아무것도 넣지 않는다.
  const folders = new Set<string>();
  for (const p of posts!) {
    if (!SLUG.test(p.slug ?? "")) fail(`슬러그 형식 오류: ${String(p.slug).slice(0, 60)}`);
    if (!p.caption || p.caption.length > 2200) fail(`${p.slug}: 캡션이 비었거나 2,200자를 넘습니다.`);
    if (/#\S/.test(p.caption)) fail(`${p.slug}: 캡션 본문에 # 가 있습니다. 해시태그는 hashtags 배열로만 넣습니다.`);
    if (!Array.isArray(p.hashtags) || p.hashtags.length > 30 || p.hashtags.some((h) => /\s|^#/.test(h))) fail(`${p.slug}: 해시태그 형식 오류.`);
    if (Number.isNaN(new Date(p.scheduled_at).getTime())) fail(`${p.slug}: 발행 시각을 해석하지 못했습니다.`);
    if (!Array.isArray(p.media) || p.media.length < 1 || p.media.length > 10) fail(`${p.slug}: 이미지는 1~10장이어야 합니다.`);
    for (const m of p.media) {
      if (m.design !== undefined) {
        if (p.media.length !== 1) fail(`${p.slug}: 디자인 데이터는 이미지 1장 게시물에만 붙일 수 있습니다.`);
        try {
          m.design = parsePhotoDesign(m.design);
        } catch (e) {
          fail(`${p.slug}: 디자인 데이터 오류. ${e instanceof Error ? e.message : ""}`);
        }
      }
      if (!ASSET_PATH.test(m.path ?? "")) fail(`${p.slug}: 허용되지 않는 이미지 경로 ${String(m.path).slice(0, 80)}`);
      if (!/^[a-f0-9]{64}$/.test(m.sha256 ?? "") || !Number.isInteger(m.bytes) || m.bytes <= 0 || m.bytes > 8_388_608) fail(`${p.slug}: 이미지 정보 오류 ${m.path}`);
      folders.add(m.path.slice(0, m.path.lastIndexOf("/")));
    }
  }

  // 2) 스토리지에 실제로 올라가 있는지, 크기가 같은지 확인한다.
  const stored = new Map<string, number>();
  for (const folder of folders) {
    for (let offset = 0; ; offset += 1000) {
      const { data: list, error } = await admin.storage.from(BUCKET).list(folder, { limit: 1000, offset });
      if (error) fail(`스토리지 조회 실패: ${error.message}`);
      for (const o of list ?? []) stored.set(`${folder}/${o.name}`, Number((o.metadata as { size?: number } | null)?.size ?? -1));
      if (!list || list.length < 1000) break;
    }
  }
  for (const p of posts!) {
    for (const m of p.media) {
      if (!stored.has(m.path)) fail(`${p.slug}: 스토리지에 없는 이미지입니다. 업로드 스크립트를 먼저 실행하세요 (${m.path})`);
      if (stored.get(m.path) !== m.bytes) fail(`${p.slug}: 이미지 크기가 manifest 와 다릅니다 (${m.path})`);
    }
  }

  // 3) 이미 있는 슬러그는 건너뛴다(덮어쓰지 않는다).
  const { data: existing } = await admin.from("social_post").select("slug").in("slug", posts!.map((p) => p.slug));
  const have = new Set((existing ?? []).map((r: { slug: string }) => r.slug));
  const fresh = posts!.filter((p) => !have.has(p.slug));
  if (fresh.length === 0) {
    revalidatePath(BACK);
    redirect(`${BACK}?ok=${encodeURIComponent(`새로 등록할 건이 없습니다(${posts!.length}건 모두 이미 있음).`)}`);
  }

  // 4) 자산 대장 → 초안. 초안은 항상 draft.
  const assets = fresh.flatMap((p) =>
    p.media.map((m) => ({
      storefront_id: storefrontId, purpose: "instagram", path: m.path, sha256: m.sha256, bytes: m.bytes,
      mime: "image/jpeg", width: 1080, height: 1350, alt: (m.alt ?? "").slice(0, 200) || null, post_slug: p.slug, profile_id: user.id,
    })),
  );
  const { error: aErr } = await admin.from("mcp_asset").upsert(assets, { onConflict: "path", ignoreDuplicates: true });
  if (aErr) fail(`자산 등록 실패: ${aErr.message}`);

  const rows = fresh.map((p) => ({
    storefront_id: storefrontId,
    slug: p.slug,
    kind: p.media.length === 1 ? "image" : "carousel",
    caption: p.caption,
    hashtags: p.hashtags,
    // design 은 단일 이미지(사진 패널)의 디자인 데이터다. 있으면 수정 화면에서 글자와 사진을 바꿔 다시 그릴 수 있다(D-139).
    media: p.media.map((m) => (m.design ? { url: baseUrl + m.path, alt: m.alt ?? null, design: m.design } : { url: baseUrl + m.path, alt: m.alt ?? null })),
    status: "draft",
    suggested_time: new Date(p.scheduled_at).toISOString(),
    source_ref: p.source_ref ?? null,
    rule_check: { errors: [], warnings: [] },
    created_by: "admin",
    profile_id: user.id,
  }));
  const { error: pErr } = await admin.from("social_post").insert(rows);
  if (pErr) fail(`초안 등록 실패: ${pErr.message}`);

  revalidatePath(BACK);
  redirect(`${BACK}?status=draft&ok=${encodeURIComponent(`초안 ${fresh.length}건 등록(건너뜀 ${posts!.length - fresh.length}건). 내용을 확인한 뒤 전체 승인을 누르세요.`)}`);
}

/** 권장 시각이 미래인 draft 전부를 그 시각으로 예약한다. 사람이 확인란을 체크하고 눌러야 한다. */
export async function bulkApproveAction(formData: FormData) {
  const user = await requireAdmin();
  if (!hasServiceRole) fail("service-role 키가 없어 승인할 수 없습니다.");
  if (formData.get("confirm") !== "on") fail("확인란을 체크한 뒤 눌러 주세요.");

  const admin = createAdminClient();
  const nowIso = new Date().toISOString();
  const { data, error } = await admin
    .from("social_post")
    .select("id,slug,kind,media,suggested_time,rule_check")
    .eq("status", "draft")
    .gt("suggested_time", nowIso)
    .order("suggested_time", { ascending: true })
    .limit(200);
  if (error) fail(`조회 실패: ${error.message}`);

  let ok = 0;
  const skipped: string[] = [];
  for (const p of (data ?? []) as { id: string; slug: string; kind: string; media: unknown; suggested_time: string; rule_check: { errors?: string[] } | null }[]) {
    const n = Array.isArray(p.media) ? p.media.length : 0;
    const badMedia = (p.kind === "image" && n !== 1) || (p.kind === "carousel" && (n < 2 || n > 10));
    if (badMedia || (p.rule_check?.errors?.length ?? 0) > 0) { skipped.push(p.slug); continue; }
    const { error: uErr, count } = await admin
      .from("social_post")
      .update(
        { status: "scheduled", scheduled_at: p.suggested_time, approved_by: user.id, approved_at: new Date().toISOString(), rejection_reason: null, failure_reason: null },
        { count: "exact" },
      )
      .eq("id", p.id)
      .eq("status", "draft");
    if (uErr || !count) skipped.push(p.slug);
    else ok++;
  }

  revalidatePath(BACK);
  const tail = skipped.length ? ` 건너뜀 ${skipped.length}건: ${skipped.slice(0, 5).join(", ")}` : "";
  redirect(`${BACK}?status=scheduled&ok=${encodeURIComponent(`전체 승인 ${ok}건. 각자 권장 시각에 발행됩니다.${tail}`)}`);
}
