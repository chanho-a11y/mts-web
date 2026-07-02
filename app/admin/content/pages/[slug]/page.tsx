import { notFound } from "next/navigation";
import { pageById, getPageSettings } from "@/lib/page-content";
import { savePageContentAction } from "../actions";
import ImageUpload from "@/components/image-upload";

export const dynamic = "force-dynamic";

export default async function AdminPageEditor({ params, searchParams }: { params: { slug: string }; searchParams: { saved?: string } }) {
  const def = pageById(params.slug);
  if (!def) notFound();
  const s = await getPageSettings();
  const input = "mt-1 w-full rounded border px-3 py-2 text-sm";
  return (
    <main className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{def.title} 편집</h1>
        <p className="mt-1 text-sm text-neutral-500">{def.path} · 비워두면 기본값이 사용됩니다.</p>
      </div>
      {searchParams.saved && <p className="rounded bg-green-50 px-4 py-2 text-sm text-green-700">저장되었습니다. 페이지에 반영됩니다.</p>}
      <form action={savePageContentAction} className="space-y-4">
        <input type="hidden" name="page" value={def.id} />
        {def.fields.map((f) => (
          <div key={f.key}>
            {f.type === "image" ? (
              <ImageUpload name={f.key} defaultValue={s[f.key] ?? ""} folder="page" label={f.label} />
            ) : (
              <>
                <label className="block text-sm font-medium">{f.label} <span className="text-xs text-neutral-400">({f.type})</span></label>
                {f.type === "textarea"
                  ? <textarea name={f.key} defaultValue={s[f.key] ?? ""} rows={5} className={input} />
                  : <input name={f.key} defaultValue={s[f.key] ?? ""} className={input} />}
              </>
            )}
          </div>
        ))}
        <button className="rounded-full bg-black px-6 py-2 text-sm text-white">저장</button>
      </form>
    </main>
  );
}
