import { PAGES } from "@/lib/page-content";

export const dynamic = "force-dynamic";

// 사이트 관리자 > 페이지 수정 — 각 페이지 편집을 새 창으로 연다.
export default function AdminPagesList() {
  return (
    <main className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">페이지 수정</h1>
        <p className="mt-1 text-sm text-neutral-500">각 페이지의 사진·글을 편집합니다. ‘편집’은 새 창으로 열립니다. 저장 시 해당 페이지에 즉시 반영됩니다(폴백 유지).</p>
      </div>
      <ul className="divide-y rounded-xl border">
        {PAGES.map((p) => (
          <li key={p.id} className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium">{p.title}</p>
              <p className="text-xs text-neutral-400">{p.path} · 편집 필드 {p.fields.length}개</p>
            </div>
            <div className="flex gap-2 text-sm">
              <a href={p.path} target="_blank" rel="noreferrer" className="rounded border px-3 py-1.5 hover:bg-neutral-50">미리보기</a>
              <a href={`/admin/content/pages/${p.id}`} target="_blank" rel="noreferrer" className="rounded-full bg-black px-3 py-1.5 text-white">편집 (새 창)</a>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
