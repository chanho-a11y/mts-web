import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { assetBaseUrl, listLibraryPhotos, type LibraryPhoto } from "@/lib/social/design";
import { PHOTO_SERIES_LABEL, type PhotoPanelDesign } from "@/mcp/photo-design";
import { byPublishTime, kstParts, publishTime, type PublishTimed } from "@/lib/social/order";

export const dynamic = "force-dynamic";

/**
 * 인스타그램 초안 수정 화면 (D-139).
 *
 * 캡션, 해시태그, 권장 발행 시각은 모든 초안에서 고칠 수 있다.
 * 단일 이미지(사진 패널)는 글자와 배경 사진까지 고치면 서버가 다시 그린다.
 * 카드뉴스처럼 완성본 이미지로 등록된 게시물은 이미지는 보기만 하고 캡션만 고친다.
 * 저장은 /api/social/design 이 받는다. 초안(draft)만 수정된다.
 *
 * 좌우 화살표는 초안끼리 발행일 순서로 이동한다(D-140). 수정할 수 있는 상태에서는 화살표가
 * 저장 버튼을 겸해서, 지금 내용을 저장한 뒤 옆 초안으로 넘어간다. 저장이 막히면 이 화면에 남는다.
 */

interface MediaItem {
  url: string;
  alt?: string | null;
  design?: PhotoPanelDesign;
}

function kstLocalInput(iso: string | null): string {
  if (!iso) return "";
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(new Date(iso));
  return parts.replace(" ", "T");
}

interface Neighbor extends PublishTimed {
  slug: string;
}

function when(n: Neighbor): string {
  const t = publishTime(n);
  if (!t) return "발행일 미정";
  const { date, time } = kstParts(t);
  return `${Number(date.slice(5, 7))}/${Number(date.slice(8))} ${time}`;
}

/** 이전 또는 다음 초안으로 가는 화살표. 수정 가능하면 저장 후 이동(폼 제출), 아니면 그냥 이동. */
function Arrow({ target, dir, save }: { target: Neighbor | null; dir: "prev" | "next"; save: boolean }) {
  const cls = "inline-flex items-center gap-2 rounded border border-neutral-900 bg-white px-3 py-1.5 text-sm font-medium hover:bg-neutral-100";
  const body = (
    <>
      {dir === "prev" && <span aria-hidden>←</span>}
      <span>
        {dir === "prev" ? "이전" : "다음"}
        {target && <span className="ml-1 font-normal text-neutral-500">{when(target)}</span>}
      </span>
      {dir === "next" && <span aria-hidden>→</span>}
    </>
  );
  if (!target) return <span className={`${cls} cursor-default border-neutral-200 text-neutral-300 hover:bg-white`}>{body}</span>;
  const title = `${save ? "저장하고 " : ""}${dir === "prev" ? "이전" : "다음"} 초안으로: ${target.slug}`;
  if (save) {
    return (
      <button type="submit" name="go" value={target.id} title={title} className={cls}>
        {body}
      </button>
    );
  }
  return (
    <Link href={`/admin/social/${target.id}/edit`} title={title} className={cls}>
      {body}
    </Link>
  );
}

const input = "mt-1 block w-full rounded border px-2 py-1.5 text-sm";
const label = "block text-xs font-medium text-neutral-600";

export default async function AdminSocialEditPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { e?: string; ok?: string };
}) {
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) notFound();
  const admin = createAdminClient();
  const { data: post } = await admin
    .from("social_post")
    .select("id,slug,kind,caption,hashtags,media,status,suggested_time,scheduled_at,published_at,created_at,source_ref,rule_check")
    .eq("id", params.id)
    .maybeSingle();
  if (!post) notFound();

  const media = (Array.isArray(post.media) ? post.media : []) as MediaItem[];
  const design = media.length === 1 ? media[0].design : undefined;
  const editable = post.status === "draft" && hasServiceRole;
  const warnings = ((post.rule_check as { warnings?: string[] } | null)?.warnings ?? []) as string[];

  // 이전과 다음 초안(발행일 빠른 순, 목록과 같은 기준). 지금 건이 초안이 아니면 발행일 기준으로 끼워 넣어 앞뒤를 찾는다.
  const { data: draftRaw } = await admin
    .from("social_post")
    .select("id,slug,status,suggested_time,scheduled_at,published_at,created_at")
    .eq("status", "draft")
    .limit(1000);
  const drafts = (draftRaw ?? []) as Neighbor[];
  const isDraft = post.status === "draft";
  const ordered = (isDraft && drafts.some((d) => d.id === post.id) ? drafts : [...drafts.filter((d) => d.id !== post.id), post as Neighbor]).sort(byPublishTime);
  const at = ordered.findIndex((d) => d.id === post.id);
  const prev = at > 0 ? ordered[at - 1] : null;
  const next = at >= 0 && at < ordered.length - 1 ? ordered[at + 1] : null;
  const position = isDraft ? `초안 ${at + 1} / ${ordered.length}` : `초안 ${drafts.length}건`;

  let photos: LibraryPhoto[] = [];
  let photoError = "";
  if (design) {
    try {
      photos = await listLibraryPhotos(admin, await assetBaseUrl(admin));
    } catch (e) {
      photoError = e instanceof Error ? e.message : "사진 목록을 읽지 못했습니다.";
    }
  }

  return (
    <div>
      <p className="text-xs">
        <Link href="/admin/social" className="text-neutral-500 underline">
          인스타그램 목록으로
        </Link>
      </p>
      <h1 className="mt-2 text-xl font-bold">인스타그램 초안 수정</h1>
      <p className="mt-1 font-mono text-xs text-neutral-500">
        {post.slug} {design ? `/ ${PHOTO_SERIES_LABEL[design.series]}` : post.kind === "carousel" ? `/ 캐러셀 ${media.length}장` : "/ 이미지 1장"}
      </p>

      {searchParams?.e && (
        <p className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{searchParams.e}</p>
      )}
      {searchParams?.ok && (
        <p className="mt-3 rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{searchParams.ok}</p>
      )}
      {post.status !== "draft" && (
        <p className="mt-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          현재 상태가 초안이 아니어서 보기만 됩니다. 목록에서 초안으로 되돌린 뒤 수정하세요.
        </p>
      )}
      {warnings.length > 0 && (
        <ul className="mt-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {warnings.map((w) => (
            <li key={w}>확인: {w}</li>
          ))}
        </ul>
      )}

      <form action="/api/social/design" method="post" className="mt-4 grid gap-6 md:grid-cols-[360px_1fr]">
        <input type="hidden" name="id" value={post.id} />

        <div className="flex flex-wrap items-center justify-between gap-2 rounded border bg-neutral-50 px-3 py-2 md:col-span-2">
          {/* 입력칸에서 Enter 를 누르면 폼의 첫 제출 버튼이 눌린다. 화살표보다 앞에 저장 전용 버튼을 두어 Enter 는 저장만 하게 한다. */}
          <button type="submit" disabled={!editable} tabIndex={-1} aria-hidden className="sr-only">
            저장
          </button>
          <Arrow target={prev} dir="prev" save={editable} />
          <p className="text-center text-xs text-neutral-500">
            <span className="font-medium text-neutral-800">{position}</span>
            <span className="ml-2">발행일 빠른 순</span>
            {editable && <span className="ml-2">화살표를 누르면 저장한 뒤 이동합니다</span>}
          </p>
          <Arrow target={next} dir="next" save={editable} />
        </div>

        {/* 현재 이미지 */}
        <div>
          <div className="flex snap-x overflow-x-auto rounded border bg-neutral-50">
            {media.map((m, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={m.url + i} src={m.url} alt={m.alt ?? `${post.slug} ${i + 1}`} className="w-[358px] shrink-0 snap-start" />
            ))}
          </div>
          <p className="mt-2 text-xs text-neutral-500">
            {design
              ? "지금 저장돼 있는 이미지입니다. 오른쪽에서 글자나 사진을 바꾸고 저장하면 새로 그려집니다."
              : "완성본으로 등록된 이미지입니다. 이미지 안의 글자는 이 화면에서 바꿀 수 없고 캡션만 수정됩니다."}
          </p>
        </div>

        <div className="space-y-5">
          <fieldset disabled={!editable} className="space-y-3 rounded border bg-white p-4">
            <legend className="px-1 text-sm font-semibold">캡션과 발행 시각</legend>
            <label className={label}>
              캡션 (한글 먼저, 영문 나중. 해시태그는 아래 칸에)
              <textarea name="caption" required rows={14} defaultValue={post.caption} className={`${input} font-sans leading-relaxed`} />
            </label>
            <label className={label}>
              해시태그 (띄어쓰기로 구분, # 없이)
              <input name="hashtags" defaultValue={(post.hashtags ?? []).join(" ")} className={input} />
            </label>
            <label className={label}>
              권장 발행 시각 (KST)
              <input type="datetime-local" name="suggested_time" defaultValue={kstLocalInput(post.suggested_time)} className={`${input} max-w-[260px]`} />
            </label>
          </fieldset>

          {design && (
            <fieldset disabled={!editable} className="space-y-3 rounded border bg-white p-4">
              <legend className="px-1 text-sm font-semibold">이미지 글자</legend>
              <input type="hidden" name="has_design" value="1" />
              <div className="grid gap-3 md:grid-cols-2">
                <label className={label}>
                  소개줄 (헤드라인 위 작은 글씨)
                  <input name="d_eyebrow" maxLength={40} defaultValue={design.eyebrow ?? ""} className={input} />
                </label>
                <label className={label}>
                  큰 숫자 (숫자 한 장에서만, 8자 이하)
                  <input name="d_big" maxLength={8} defaultValue={design.big ?? ""} className={input} />
                </label>
              </div>
              <label className={label}>
                헤드라인 (줄바꿈 가능, 3줄 이하)
                <textarea name="d_headline" required rows={2} maxLength={60} defaultValue={design.headline} className={input} />
              </label>
              <label className={label}>
                본문 (4줄 이하)
                <textarea name="d_body" rows={3} maxLength={150} defaultValue={design.body ?? ""} className={input} />
              </label>
              <label className={label}>
                표 (한 줄에 &quot;항목 | 값&quot;, 5줄 이하. 레시피에 씁니다)
                <textarea
                  name="d_rows"
                  rows={4}
                  defaultValue={(design.rows ?? []).map((r) => `${r.k} | ${r.v}`).join("\n")}
                  className={`${input} font-mono`}
                />
              </label>
              <div className="grid gap-3 md:grid-cols-3">
                <label className={label}>
                  우상단 라벨 (영문)
                  <input name="d_label" maxLength={24} defaultValue={design.label ?? ""} className={input} />
                </label>
                <label className={label}>
                  하단 라벨 (영문)
                  <input name="d_notes" maxLength={60} defaultValue={design.notes ?? ""} className={input} />
                </label>
                <label className={label}>
                  포인트 컬러 (#RRGGBB, 작은 점)
                  <input name="d_accent" maxLength={7} defaultValue={design.accent ?? ""} className={input} />
                </label>
              </div>
            </fieldset>
          )}

          {design && (
            <fieldset disabled={!editable} className="space-y-3 rounded border bg-white p-4">
              <legend className="px-1 text-sm font-semibold">배경 사진</legend>
              <div className="grid gap-3 md:grid-cols-3">
                <label className={label}>
                  글자 패널 위치
                  <select name="d_panel_pos" defaultValue={design.panel_pos ?? "bottom"} className={input}>
                    <option value="bottom">아래</option>
                    <option value="top">위</option>
                  </select>
                </label>
                <label className={label}>
                  사진 좌우 중심 (0 왼쪽 ~ 100 오른쪽)
                  <input type="number" name="d_focus_x" min={0} max={100} defaultValue={design.focus_x ?? 50} className={input} />
                </label>
                <label className={label}>
                  사진 상하 중심 (0 위 ~ 100 아래)
                  <input type="number" name="d_focus_y" min={0} max={100} defaultValue={design.focus_y ?? 50} className={input} />
                </label>
              </div>
              {photoError && <p className="text-xs text-red-600">{photoError}</p>}
              <p className="text-xs text-neutral-500">
                소셜 전용 사진 {photos.length}장 중에서 고릅니다. 사진을 추가하려면 photo for social 폴더에 넣은 뒤 올리기 스크립트를 실행합니다.
              </p>
              <div className="grid max-h-[460px] grid-cols-4 gap-2 overflow-y-auto rounded border bg-neutral-50 p-2 md:grid-cols-6">
                {!photos.some((p) => p.name === design.photo) && (
                  <label className="cursor-pointer text-[10px] text-neutral-500">
                    <input type="radio" name="d_photo" value={design.photo} defaultChecked className="peer sr-only" />
                    <span className="flex aspect-square items-center justify-center rounded border bg-white ring-neutral-900 peer-checked:ring-2">
                      현재 사진
                    </span>
                  </label>
                )}
                {photos.map((p) => (
                  <label key={p.name} className="cursor-pointer" title={p.name}>
                    <input type="radio" name="d_photo" value={p.name} defaultChecked={p.name === design.photo} className="peer sr-only" />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.thumbUrl}
                      alt={p.name}
                      loading="lazy"
                      className="aspect-square w-full rounded object-cover opacity-80 ring-neutral-900 ring-offset-1 peer-checked:opacity-100 peer-checked:ring-2"
                    />
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          <div className="flex items-center gap-3">
            <button type="submit" disabled={!editable} className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-30">
              {design ? "저장하고 이미지 다시 그리기" : "저장"}
            </button>
            <Link href={`/admin/social?slug=${encodeURIComponent(post.slug)}`} className="text-sm text-neutral-500 underline">
              목록에서 이 초안 보기
            </Link>
            <span className="ml-auto flex gap-2">
              <Arrow target={prev} dir="prev" save={editable} />
              <Arrow target={next} dir="next" save={editable} />
            </span>
          </div>
          <p className="text-xs text-neutral-500">
            저장해도 승인이나 예약은 되지 않습니다. 승인은 목록 화면에서 합니다. 지역명, 요일 표기, 제품 용량, 긴 줄표, 가운뎃점이 들어 있으면 저장되지 않습니다.
          </p>
        </div>
      </form>
    </div>
  );
}
