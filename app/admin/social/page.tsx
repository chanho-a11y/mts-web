import Link from "next/link";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { approveAction, rejectAction, revertToDraftAction, deleteSocialPostAction, runWorkerNowAction, bulkImportAction, bulkApproveAction } from "./actions";

export const dynamic = "force-dynamic";

/**
 * 인스타그램 초안 승인 화면 (D-135).
 *
 * MCP(commerce_social_draft_post)가 만든 초안을 사람이 보고 승인·예약·반려한다.
 * 승인(scheduled)으로 옮기는 버튼은 이 화면에만 있다. 발행은 예약 시각에 발행 워커(별건)가 한다.
 */

type Status = "draft" | "scheduled" | "published" | "rejected" | "failed";

interface MediaItem {
  url: string;
  alt?: string | null;
}

interface Row {
  id: string;
  slug: string;
  kind: "image" | "carousel";
  caption: string;
  hashtags: string[];
  media: MediaItem[];
  status: Status;
  suggested_time: string | null;
  scheduled_at: string | null;
  source_ref: string | null;
  rule_check: { errors?: string[]; warnings?: string[] } | null;
  rejection_reason: string | null;
  failure_reason: string | null;
  ig_permalink: string | null;
  published_at: string | null;
  insights: Record<string, number> | null;
  created_by: string;
  created_at: string;
}

const STATUS_LABEL: Record<Status, string> = {
  draft: "초안",
  scheduled: "발행 예약",
  published: "발행됨",
  rejected: "반려",
  failed: "실패",
};

const STATUS_CLASS: Record<Status, string> = {
  draft: "bg-neutral-100 text-neutral-700",
  scheduled: "bg-blue-50 text-blue-700",
  published: "bg-green-50 text-green-700",
  rejected: "bg-amber-50 text-amber-700",
  failed: "bg-red-50 text-red-700",
};

function kst(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "short", timeStyle: "short" });
}

/** datetime-local 의 value 형식(YYYY-MM-DDTHH:mm)으로, KST 기준 */
function kstLocalInput(iso: string | null): string {
  const d = iso ? new Date(iso) : new Date(Date.now() + 60 * 60 * 1000);
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(d);
  return parts.replace(" ", "T");
}

export default async function AdminSocialPage({
  searchParams,
}: {
  searchParams?: { status?: string; slug?: string; e?: string; ok?: string };
}) {
  const admin = createAdminClient();
  const filter = (searchParams?.status ?? "") as Status | "";
  const focus = searchParams?.slug ?? "";

  let q = admin
    .from("social_post")
    .select(
      "id,slug,kind,caption,hashtags,media,status,suggested_time,scheduled_at,source_ref,rule_check,rejection_reason,failure_reason,ig_permalink,published_at,insights,created_by,created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);
  if (filter) q = q.eq("status", filter);
  if (focus) q = q.eq("slug", focus);
  const { data } = await q;
  const rows = (data ?? []) as Row[];

  const { data: countsRaw } = await admin.from("social_post").select("status");
  const counts: Record<string, number> = {};
  for (const r of (countsRaw ?? []) as { status: string }[]) counts[r.status] = (counts[r.status] ?? 0) + 1;

  // 일괄 승인 대상: 권장 시각이 미래인 draft
  const { data: bulkRaw } = await admin
    .from("social_post")
    .select("suggested_time")
    .eq("status", "draft")
    .gt("suggested_time", new Date().toISOString())
    .order("suggested_time", { ascending: true })
    .limit(200);
  const bulk = (bulkRaw ?? []) as { suggested_time: string }[];

  return (
    <div>
      <h1 className="text-xl font-bold">인스타그램</h1>
      <p className="mt-1 text-sm text-neutral-500">
        MCP(commerce_social_draft_post)가 만든 초안입니다. 승인하면 예약 시각에 서버가 발행합니다. MCP 는 발행하지 못하고
        승인·발행된 초안을 수정하지 못합니다 — 수정은 반려한 뒤 다시 받습니다.
      </p>

      {searchParams?.e && (
        <p className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{searchParams.e}</p>
      )}
      {searchParams?.ok && (
        <p className="mt-3 rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{searchParams.ok}</p>
      )}
      {!hasServiceRole && (
        <p className="mt-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          service-role 키가 없는 환경이라 조회만 가능합니다.
        </p>
      )}

      <details className="mt-4 rounded border bg-neutral-50 p-3 text-sm" open={bulk.length > 0}>
        <summary className="cursor-pointer font-medium">일괄 등록과 전체 승인</summary>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <form action={bulkImportAction} className="rounded border bg-white p-3">
            <p className="font-medium">1. 일괄 등록</p>
            <p className="mt-1 text-xs text-neutral-500">
              이미지를 업로드 스크립트로 올린 뒤 그 폴더의 manifest.json 을 선택합니다. 전부 초안으로만 들어가고, 이미 있는 슬러그는 건너뜁니다.
            </p>
            <input type="file" name="manifest" accept="application/json,.json" required className="mt-2 block w-full text-xs" />
            <button type="submit" disabled={!hasServiceRole} className="mt-2 rounded border border-neutral-900 px-3 py-1 text-xs font-medium disabled:opacity-30">
              초안으로 등록
            </button>
          </form>
          <form action={bulkApproveAction} className="rounded border bg-white p-3">
            <p className="font-medium">2. 전체 승인</p>
            {bulk.length > 0 ? (
              <>
                <p className="mt-1 text-xs text-neutral-500">
                  권장 시각이 정해진 초안 {bulk.length}건을 각자 그 시각으로 예약합니다. 첫 발행 {kst(bulk[0].suggested_time)}, 마지막 발행{" "}
                  {kst(bulk[bulk.length - 1].suggested_time)}. 예약한 뒤에도 건별로 예약 취소를 할 수 있습니다.
                </p>
                <label className="mt-2 flex items-center gap-2 text-xs">
                  <input type="checkbox" name="confirm" required /> 초안 {bulk.length}건의 내용과 발행 시각을 확인했습니다
                </label>
                <button type="submit" disabled={!hasServiceRole} className="mt-2 rounded bg-neutral-900 px-3 py-1 text-xs font-medium text-white disabled:opacity-30">
                  {bulk.length}건 전체 승인
                </button>
              </>
            ) : (
              <p className="mt-1 text-xs text-neutral-500">권장 시각이 정해진 초안이 없습니다.</p>
            )}
          </form>
        </div>
      </details>

      <div className="mt-4 flex flex-wrap gap-1 text-xs">
        <Link href="/admin/social" className={`rounded-full border px-3 py-1 ${!filter ? "bg-neutral-900 text-white" : "hover:bg-neutral-100"}`}>
          전체 {Object.values(counts).reduce((a, b) => a + b, 0)}
        </Link>
        {(Object.keys(STATUS_LABEL) as Status[]).map((s) => (
          <Link
            key={s}
            href={`/admin/social?status=${s}`}
            className={`rounded-full border px-3 py-1 ${filter === s ? "bg-neutral-900 text-white" : "hover:bg-neutral-100"}`}
          >
            {STATUS_LABEL[s]} {counts[s] ?? 0}
          </Link>
        ))}
        {focus && (
          <Link href="/admin/social" className="rounded-full border px-3 py-1 text-neutral-500 hover:bg-neutral-100">
            slug: {focus} ✕
          </Link>
        )}
        <form action={runWorkerNowAction} className="ml-auto">
          <button
            type="submit"
            disabled={!hasServiceRole}
            title="예약 시각이 지난 scheduled 건을 지금 발행합니다 (크론은 5분 간격)"
            className="rounded-full border border-neutral-900 px-3 py-1 font-medium disabled:opacity-30"
          >
            워커 지금 실행
          </button>
        </form>
      </div>

      {rows.length === 0 && <p className="mt-10 text-center text-sm text-neutral-400">초안이 없습니다.</p>}

      <div className="mt-5 space-y-6">
        {rows.map((r) => {
          const warnings = r.rule_check?.warnings ?? [];
          const media = Array.isArray(r.media) ? r.media : [];
          const canAct = hasServiceRole;
          return (
            <section key={r.id} className="rounded-lg border bg-white p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className={`rounded px-2 py-0.5 font-medium ${STATUS_CLASS[r.status]}`}>{STATUS_LABEL[r.status]}</span>
                <span className="font-mono text-neutral-600">{r.slug}</span>
                <span className="text-neutral-400">· {r.kind === "carousel" ? `캐러셀 ${media.length}장` : "이미지 1장"}</span>
                <span className="text-neutral-400">· {r.created_by === "mcp" ? "MCP" : "관리자"} · {kst(r.created_at)}</span>
                {r.source_ref && <span className="rounded bg-neutral-50 px-1.5 py-0.5 font-mono text-neutral-500">근거 {r.source_ref}</span>}
              </div>

              <div className="mt-3 grid gap-4 md:grid-cols-[320px_1fr]">
                {/* 인스타 모양 미리보기 */}
                <div className="rounded border">
                  <div className="flex items-center gap-2 border-b px-3 py-2 text-xs font-semibold">
                    <span className="inline-block h-6 w-6 rounded-full bg-neutral-200" />
                    mtspace.coffee
                  </div>
                  <div className="flex snap-x gap-0 overflow-x-auto bg-neutral-50">
                    {media.map((m, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={m.url + i}
                        src={m.url}
                        alt={m.alt ?? `${r.slug} ${i + 1}`}
                        className="w-[318px] shrink-0 snap-start object-cover"
                      />
                    ))}
                  </div>
                  <div className="px-3 py-2 text-[13px] leading-snug">
                    <span className="font-semibold">mtspace.coffee</span>{" "}
                    <span className="whitespace-pre-wrap">{r.caption}</span>
                    {r.hashtags?.length > 0 && (
                      <p className="mt-1 text-blue-800">{r.hashtags.map((h) => `#${h}`).join(" ")}</p>
                    )}
                  </div>
                </div>

                {/* 정보 + 액션 */}
                <div className="space-y-3 text-sm">
                  <dl className="grid grid-cols-[88px_1fr] gap-y-1 text-xs">
                    <dt className="text-neutral-400">권장 시각</dt>
                    <dd>{kst(r.suggested_time)}</dd>
                    <dt className="text-neutral-400">예약 시각</dt>
                    <dd className={r.status === "scheduled" ? "font-medium text-blue-700" : ""}>{kst(r.scheduled_at)}</dd>
                    <dt className="text-neutral-400">캡션</dt>
                    <dd>
                      {r.caption.length}자 · 해시태그 {r.hashtags?.length ?? 0}개
                    </dd>
                    {r.published_at && (
                      <>
                        <dt className="text-neutral-400">발행</dt>
                        <dd>
                          {kst(r.published_at)}{" "}
                          {r.ig_permalink && (
                            <a href={r.ig_permalink} target="_blank" rel="noreferrer" className="text-clayDeep underline">
                              게시물 열기
                            </a>
                          )}
                        </dd>
                      </>
                    )}
                    {r.insights && (
                      <>
                        <dt className="text-neutral-400">지표</dt>
                        <dd className="font-mono">
                          {Object.entries(r.insights).map(([k, v]) => `${k} ${v}`).join(" · ")}
                        </dd>
                      </>
                    )}
                  </dl>

                  {warnings.length > 0 && (
                    <ul className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      {warnings.map((w) => (
                        <li key={w}>⚠ {w}</li>
                      ))}
                    </ul>
                  )}
                  {r.rejection_reason && (
                    <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      반려 사유: {r.rejection_reason}
                    </p>
                  )}
                  {r.failure_reason && (
                    <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                      실패: {r.failure_reason}
                    </p>
                  )}

                  {r.status === "draft" && (
                    <form action={approveAction} className="flex flex-wrap items-end gap-2 rounded border bg-neutral-50 p-3">
                      <input type="hidden" name="id" value={r.id} />
                      <label className="text-xs text-neutral-500">
                        발행 시각 (KST)
                        <input
                          type="datetime-local"
                          name="scheduled_at"
                          defaultValue={kstLocalInput(r.suggested_time)}
                          className="mt-1 block rounded border px-2 py-1 text-sm"
                        />
                      </label>
                      <button
                        type="submit"
                        disabled={!canAct}
                        className="rounded bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-30"
                      >
                        승인 · 예약
                      </button>
                    </form>
                  )}

                  {(r.status === "draft" || r.status === "scheduled") && (
                    <form action={rejectAction} className="flex flex-wrap items-end gap-2">
                      <input type="hidden" name="id" value={r.id} />
                      <input
                        name="reason"
                        required
                        placeholder="반려 사유 — MCP 가 읽고 다시 씁니다"
                        className="min-w-[260px] flex-1 rounded border px-2 py-1 text-sm"
                      />
                      <button type="submit" disabled={!canAct} className="rounded border px-3 py-1.5 text-sm text-amber-700 disabled:opacity-30">
                        반려
                      </button>
                    </form>
                  )}

                  <div className="flex gap-2">
                    {(r.status === "scheduled" || r.status === "rejected" || r.status === "failed") && (
                      <form action={revertToDraftAction}>
                        <input type="hidden" name="id" value={r.id} />
                        <button type="submit" disabled={!canAct} className="rounded border px-3 py-1 text-xs disabled:opacity-30">
                          {r.status === "scheduled" ? "예약 취소 → 초안" : "초안으로 되돌리기"}
                        </button>
                      </form>
                    )}
                    {r.status !== "published" && (
                      <form action={deleteSocialPostAction}>
                        <input type="hidden" name="id" value={r.id} />
                        <button type="submit" disabled={!canAct} className="rounded border px-3 py-1 text-xs text-red-600 disabled:opacity-30">
                          삭제
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
