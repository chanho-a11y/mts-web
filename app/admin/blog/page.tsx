import { createClient } from "@/lib/supabase/server";
import { createPostAction, updatePostAction, deletePostAction, applyRevisionAction } from "./actions";
import { REV_SUFFIX } from "./rev";
import ImageUpload from "@/components/image-upload";
import RichEditor from "@/components/rich-editor";

export const dynamic = "force-dynamic";

const STATUS: Record<string, string> = { published: "발행", draft: "초안" };

export default async function AdminBlogPage() {
  const supabase = createClient();
  const { data: posts } = await supabase
    .from("content_post")
    .select("id,slug,title,excerpt,body_html,cover_image,status,published_at,created_at")
    .order("created_at", { ascending: false });

  // MCP 가 만든 개선안 초안(`<원본slug>--rev`)을 알아보기 위한 슬러그 집합
  const slugs = new Set((posts ?? []).map((p) => p.slug));
  const revTargetOf = (slug: string): string | null => {
    if (!slug.endsWith(REV_SUFFIX)) return null;
    const base = slug.slice(0, -REV_SUFFIX.length);
    return slugs.has(base) ? base : null;
  };

  const input = "mt-1 w-full rounded border px-3 py-2 text-sm";
  return (
    <main className="max-w-3xl space-y-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">블로그 관리</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Coffeelog 글을 직접 작성·수정·삭제합니다. 발행(published) 상태만 사이트에 노출됩니다.
          </p>
        </div>
        <a href="/admin/studio?tab=blog" className="shrink-0 rounded-full bg-clay px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
          통합 스튜디오로 글쓰기 →
        </a>
      </div>

      {/* 새 글 작성 */}
      <section className="rounded-xl border p-5">
        <h2 className="mb-3 font-bold">새 글 작성</h2>
        <form action={createPostAction} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">제목<input name="title" required className={input} /></label>
            <label className="text-sm">슬러그(선택)<input name="slug" placeholder="자동 생성" className={input} /></label>
          </div>
          <label className="block text-sm">요약<input name="excerpt" className={input} /></label>
          <ImageUpload name="cover_image" folder="blog-cover" label="커버 이미지 첨부" />
          <div className="text-sm">본문
            <RichEditor name="body_html" minWords={800} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">SEO 제목(선택)<input name="seo_title" className={input} /></label>
            <label className="text-sm">SEO 설명(선택)<input name="seo_description" className={input} /></label>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm">상태
              <select name="status" className={`${input} w-32`}>
                <option value="draft">초안(보관)</option>
                <option value="published">발행(게시)</option>
              </select>
            </label>
            <button className="self-end rounded-full bg-black px-5 py-2 text-sm text-white">작성</button>
          </div>
        </form>
      </section>

      {/* 글 목록 */}
      <section className="space-y-4">
        <h2 className="font-bold">글 목록 ({posts?.length ?? 0}) <span className="text-xs font-normal text-neutral-400">— 스튜디오에서 보관/게시한 글도 여기서 수정</span></h2>
        {(posts ?? []).map((p) => (
          <details key={p.id} className="rounded-xl border p-4">
            <summary className="flex cursor-pointer items-center justify-between gap-3">
              <span className="font-medium">{p.title}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs ${p.status === "published" ? "bg-green-100 text-green-700" : "bg-neutral-100 text-neutral-500"}`}>
                {STATUS[p.status] ?? p.status}
              </span>
            </summary>
            {revTargetOf(p.slug) && (
              <form action={applyRevisionAction} className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3">
                <input type="hidden" name="rev_id" value={p.id} />
                <p className="text-xs leading-relaxed text-amber-900">
                  <span className="font-semibold">MCP 개선안 초안</span>입니다. 반영하면 원본{" "}
                  <span className="font-mono">{revTargetOf(p.slug)}</span> 의 본문·요약·SEO 가 이 내용으로 바뀌고
                  이 초안은 삭제됩니다. 최초 발행일은 그대로 유지됩니다.
                </p>
                <button className="ml-auto shrink-0 rounded-full bg-amber-600 px-4 py-1.5 text-xs font-semibold text-white hover:opacity-90">
                  원본에 반영
                </button>
              </form>
            )}

            <form action={updatePostAction} className="mt-4 space-y-3">
              <input type="hidden" name="id" value={p.id} />
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm">제목<input name="title" defaultValue={p.title} className={input} /></label>
                <label className="text-sm">슬러그<input name="slug" defaultValue={p.slug} className={input} /></label>
              </div>
              <label className="block text-sm">요약<input name="excerpt" defaultValue={p.excerpt ?? ""} className={input} /></label>
              <ImageUpload name="cover_image" defaultValue={p.cover_image ?? ""} folder="blog-cover" label="커버 이미지 첨부" />
              <div className="text-sm">본문
                <RichEditor name="body_html" defaultValue={p.body_html ?? ""} minWords={800} />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm">상태
                  <select name="status" defaultValue={p.status} className={`${input} w-32`}>
                    <option value="draft">초안(보관)</option>
                    <option value="published">발행(게시)</option>
                  </select>
                </label>
                <button className="self-end rounded-full bg-black px-5 py-2 text-sm text-white">저장</button>
                <button formAction={deletePostAction} className="self-end rounded-full border px-4 py-2 text-sm text-red-500">삭제</button>
              </div>
            </form>
          </details>
        ))}
        {(!posts || posts.length === 0) && <p className="py-6 text-center text-neutral-400">글이 없습니다.</p>}
      </section>
    </main>
  );
}
