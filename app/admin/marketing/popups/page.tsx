import Link from "next/link";
import { isAdminUser } from "@/lib/auth-guard";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { getStorefrontContext } from "@/lib/storefront";
import ImageUpload from "@/components/image-upload";
import {
  AUDIENCE_LABEL, KIND_LABEL, fmtKst, isLive, pickLive, toKstInput,
  type PopupRow, type PopupViewer,
} from "@/lib/site-popup-shared";
import { archivePopupAction, restorePopupAction, savePopupAction, togglePopupAction } from "./actions";
import ConfirmDelete from "./confirm-delete";

export const dynamic = "force-dynamic";

type Search = { edit?: string; view?: string; e?: string };

const VIEWERS: { key: PopupViewer; label: string }[] = [
  { key: "consumer", label: "일반 고객 화면(비로그인, 개인, 승인 대기 사업자)" },
  { key: "business", label: "사업자 회원 화면(승인 사업자, 관리자)" },
];

export default async function AdminPopupsPage({ searchParams }: { searchParams: Search }) {
  if (!(await isAdminUser())) return null; // layout 가드와 별개로 데이터 조회 전에 재확인
  if (!hasServiceRole) {
    return <main className="text-sm text-red-600">service-role 키가 없는 환경입니다. 배포 환경에서 확인하세요.</main>;
  }

  const admin = createAdminClient();
  const { brand: hostBrand } = await getStorefrontContext();
  const [{ data: brands }, { data: rowsRaw, error }] = await Promise.all([
    admin.from("brand").select("id,code,name").order("code"),
    admin.from("site_popup").select("*").order("created_at", { ascending: false }).limit(300),
  ]);
  const rows = (rowsRaw ?? []) as PopupRow[];
  const brandList = (brands ?? []) as { id: string; code: string; name: string }[];
  const brandName = (id: string) => brandList.find((b) => b.id === id)?.name ?? "";
  const defaultBrandId = brandList.find((b) => b.code === hostBrand.code)?.id ?? brandList[0]?.id ?? "";

  const archivedView = searchParams.view === "archived";
  const editing = searchParams.edit ? rows.find((r) => r.id === searchParams.edit && !r.archived_at) : undefined;
  const now = new Date();

  // 현재 실제 노출(브랜드 × 방문자 구분별 유형 1위)
  const winners = new Map<string, PopupRow[]>();
  for (const b of brandList) for (const v of VIEWERS) {
    winners.set(`${b.id}:${v.key}`, pickLive(rows.filter((r) => r.brand_id === b.id), v.key, now));
  }
  const winningIds = new Set(Array.from(winners.values()).flat().map((r) => r.id));

  const status = (r: PopupRow): { label: string; cls: string } => {
    if (r.archived_at) return { label: "보관", cls: "bg-neutral-100 text-neutral-500" };
    if (!r.is_active) return { label: "꺼짐", cls: "bg-neutral-100 text-neutral-500" };
    if (new Date(r.starts_at) > now) return { label: "예약", cls: "bg-blue-50 text-blue-700" };
    if (r.ends_at && new Date(r.ends_at) <= now) return { label: "종료", cls: "bg-neutral-100 text-neutral-500" };
    if (isLive(r, now) && winningIds.has(r.id)) return { label: "노출 중", cls: "bg-green-100 text-green-700" };
    return { label: "대기(우선순위 밀림)", cls: "bg-amber-100 text-amber-700" };
  };

  const list = rows.filter((r) => (archivedView ? !!r.archived_at : !r.archived_at));
  const input = "mt-1 w-full rounded border px-3 py-2 text-sm";
  const f = editing;

  return (
    <main className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">공지 팝업</h1>
        <p className="mt-1 text-sm text-neutral-500">
          홈(메인)에만 뜹니다. 상시 공지 1개와 특별 공지 1개까지, 특별 공지를 먼저 보여주고 닫으면 상시 공지가 뜹니다.
          같은 유형이 동시에 여러 개 노출 조건이면 우선순위가 높은 1개만 뜹니다(같으면 시작일이 늦은 것).
        </p>
      </div>

      {(searchParams.e || error) && (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {searchParams.e || `불러오기 실패: ${error?.message}`}
        </p>
      )}

      {/* 현재 실제 노출 현황 */}
      <section className="space-y-3">
        <h2 className="font-bold">지금 홈에 뜨는 팝업</h2>
        {brandList.map((b) => (
          <div key={b.id} className="grid gap-3 md:grid-cols-2">
            {VIEWERS.map((v) => {
              const w = winners.get(`${b.id}:${v.key}`) ?? [];
              return (
                <div key={v.key} className="rounded-xl border p-4 text-sm">
                  <p className="text-xs text-neutral-500">{brandList.length > 1 ? `${b.name} / ` : ""}{v.label}</p>
                  {(["special", "regular"] as const).map((k) => {
                    const r = w.find((x) => x.kind === k);
                    return (
                      <p key={k} className="mt-1">
                        <span className="inline-block w-20 text-neutral-500">{KIND_LABEL[k]}</span>
                        {r ? <b>{r.title}</b> : <span className="text-neutral-400">없음</span>}
                        {r && !r.title_en && <span className="ml-1 text-[11px] text-neutral-400">(영문 화면 미노출)</span>}
                      </p>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ))}
      </section>

      {/* 등록 / 수정 */}
      <section className="rounded-xl border p-5" id="form">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold">{f ? "공지 팝업 수정" : "공지 팝업 등록"}</h2>
          {f && <Link href="/admin/marketing/popups" className="text-xs underline">수정 취소(새로 등록)</Link>}
        </div>
        <form key={f?.id ?? "new"} action={savePopupAction} className="space-y-4">
          {f && <input type="hidden" name="id" value={f.id} />}
          <div className="grid gap-3 md:grid-cols-3">
            <label className="text-sm">유형
              <select name="kind" defaultValue={f?.kind ?? "regular"} className={input}>
                <option value="regular">상시 공지</option>
                <option value="special">특별 공지</option>
              </select>
            </label>
            <label className="text-sm">노출 대상
              <select name="audience" defaultValue={f?.audience ?? "all"} className={input}>
                {(Object.keys(AUDIENCE_LABEL) as (keyof typeof AUDIENCE_LABEL)[]).map((k) => (
                  <option key={k} value={k}>{AUDIENCE_LABEL[k]}</option>
                ))}
              </select>
            </label>
            <label className="text-sm">브랜드(스토어)
              <select name="brand_id" defaultValue={f?.brand_id ?? defaultBrandId} className={input}>
                {brandList.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </label>
          </div>

          <label className="block text-sm">제목 <span className="text-neutral-400">(60자)</span>
            <input name="title" required maxLength={60} defaultValue={f?.title ?? ""} className={input} />
          </label>
          <label className="block text-sm">내용 <span className="text-neutral-400">(1000자, 줄바꿈 그대로 표시)</span>
            <textarea name="body" rows={5} maxLength={1000} defaultValue={f?.body ?? ""} className={input} />
          </label>

          <ImageUpload name="image_url" folder="popups" label="이미지(선택, 팝업 상단에 표시)" defaultValue={f?.image_url ?? ""} />

          <div className="grid gap-3 md:grid-cols-[1fr_2fr]">
            <label className="text-sm">버튼 문구 <span className="text-neutral-400">(비우면 &quot;자세히 보기&quot;)</span>
              <input name="cta_label" maxLength={20} defaultValue={f?.cta_label ?? ""} className={input} />
            </label>
            <label className="text-sm">버튼 링크 <span className="text-neutral-400">(비우면 버튼 없음. 예: /collections/blends 또는 https://...)</span>
              <input name="cta_url" defaultValue={f?.cta_url ?? ""} className={input} placeholder="/collections/all" />
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <label className="text-sm">시작 일시(KST)
              <input type="datetime-local" name="starts_at" required defaultValue={toKstInput(f?.starts_at ?? now.toISOString())} className={input} />
            </label>
            <label className="text-sm">종료 일시(KST) <span className="text-neutral-400">(비우면 종료 없음)</span>
              <input type="datetime-local" name="ends_at" defaultValue={toKstInput(f?.ends_at)} className={input} />
            </label>
            <label className="text-sm">우선순위 <span className="text-neutral-400">(높을수록 먼저)</span>
              <input type="number" name="priority" min={-999} max={999} defaultValue={f?.priority ?? 0} className={input} />
            </label>
          </div>

          <details className="rounded border p-3" open={!!(f?.title_en || f?.body_en)}>
            <summary className="cursor-pointer text-sm font-medium">영문(선택): 영문 제목을 넣어야 영문 화면에 노출됩니다</summary>
            <div className="mt-3 space-y-3">
              <label className="block text-sm">영문 제목 <span className="text-neutral-400">(80자)</span>
                <input name="title_en" maxLength={80} defaultValue={f?.title_en ?? ""} className={input} />
              </label>
              <label className="block text-sm">영문 내용
                <textarea name="body_en" rows={4} maxLength={1500} defaultValue={f?.body_en ?? ""} className={input} />
              </label>
              <label className="block text-sm">영문 버튼 문구 <span className="text-neutral-400">(비우면 &quot;Learn more&quot;)</span>
                <input name="cta_label_en" maxLength={30} defaultValue={f?.cta_label_en ?? ""} className={input} />
              </label>
            </div>
          </details>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="is_active" defaultChecked={f ? f.is_active : true} /> 활성(체크 해제 시 기간 안이어도 뜨지 않음)
          </label>
          <button className="rounded-full bg-black px-5 py-2 text-sm text-white">{f ? "수정 저장" : "등록"}</button>
        </form>
      </section>

      {/* 목록 */}
      <section>
        <div className="mb-3 flex items-center gap-3">
          <h2 className="font-bold">{archivedView ? "보관함" : "공지 목록"}</h2>
          <Link href={archivedView ? "/admin/marketing/popups" : "/admin/marketing/popups?view=archived"} className="text-xs underline">
            {archivedView ? "목록으로" : `보관함(${rows.filter((r) => r.archived_at).length})`}
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b text-left text-neutral-500">
                <th className="py-2">상태</th><th>유형</th><th>대상</th><th>제목</th><th>기간(KST)</th><th>우선</th><th></th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => {
                const s = status(r);
                return (
                  <tr key={r.id} className="border-b align-top">
                    <td className="py-2"><span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] ${s.cls}`}>{s.label}</span></td>
                    <td className="whitespace-nowrap">{KIND_LABEL[r.kind]}</td>
                    <td className="text-xs">{AUDIENCE_LABEL[r.audience]}</td>
                    <td>
                      <div className="flex items-start gap-2">
                        {r.image_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={r.image_url} alt="" className="h-10 w-10 shrink-0 rounded border object-cover" />
                        )}
                        <div>
                          <p className="font-medium">{r.title}</p>
                          <p className="text-[11px] text-neutral-400">
                            {brandList.length > 1 ? `${brandName(r.brand_id)} / ` : ""}{r.title_en ? "영문 있음" : "한국어만"} / 수정 {fmtKst(r.updated_at)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap text-xs">{fmtKst(r.starts_at)}<br />~ {r.ends_at ? fmtKst(r.ends_at) : "종료 없음"}</td>
                    <td>{r.priority}</td>
                    <td className="space-y-1 text-right">
                      {archivedView ? (
                        <>
                          <form action={restorePopupAction}><input type="hidden" name="id" value={r.id} /><button className="text-xs underline">복구</button></form>
                          <ConfirmDelete id={r.id} title={r.title} />
                        </>
                      ) : (
                        <>
                          <Link href={`/admin/marketing/popups?edit=${r.id}#form`} className="block text-xs underline">수정</Link>
                          <form action={togglePopupAction}>
                            <input type="hidden" name="id" value={r.id} /><input type="hidden" name="active" value={String(r.is_active)} />
                            <button className="text-xs underline">{r.is_active ? "끄기" : "켜기"}</button>
                          </form>
                          <form action={archivePopupAction}><input type="hidden" name="id" value={r.id} /><button className="text-xs text-red-600 underline">삭제(보관)</button></form>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
              {list.length === 0 && (
                <tr><td colSpan={7} className="py-6 text-center text-neutral-400">{archivedView ? "보관된 공지가 없습니다." : "등록된 공지가 없습니다."}</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-neutral-400">
          삭제는 보관함으로 옮기며 홈에서 바로 내려갑니다. 보관함에서 복구(꺼진 상태로 돌아옴)하거나 완전 삭제할 수 있습니다.
        </p>
      </section>
    </main>
  );
}
