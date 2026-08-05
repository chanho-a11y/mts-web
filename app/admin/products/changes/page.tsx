import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { applyProductChangeAction, rejectProductChangeAction } from "./actions";

export const dynamic = "force-dynamic";

const FIELD_KO: Record<string, string> = {
  title_ko: "제품명", one_liner: "한 줄 요약", story: "제품 설명",
  seo_title: "SEO 제목", seo_description: "SEO 설명",
  flavor_notes: "풍미 노트", roast_level: "로스팅 정도", origin: "원산지",
  producer: "생산자", variety: "품종", altitude: "고도", process: "가공방식",
  recipe: "추출 레시피", hashtags: "해시태그", evidence: "자사 1차 데이터",
  product_type: "제품 유형", categories: "카테고리",
  title_en: "제품명(영문)", one_liner_en: "한 줄 요약(영문)", story_en: "제품 설명(영문)",
  seo_title_en: "SEO 제목(영문)", seo_description_en: "SEO 설명(영문)",
  flavor_notes_en: "풍미 노트(영문)", roast_level_en: "로스팅 정도(영문)",
  producer_en: "생산자(영문)", variety_en: "품종(영문)", altitude_en: "고도(영문)",
  process_en: "가공방식(영문)", recipe_en: "추출 레시피(영문)",
};

const STATUS_KO: Record<string, string> = { pending: "대기", applied: "반영됨", rejected: "버림" };

function show(v: unknown): string {
  if (v === null || v === undefined) return "(비어 있음)";
  if (typeof v === "string") return v;
  return JSON.stringify(v, null, 1);
}

type Change = {
  id: string;
  patch: Record<string, unknown>;
  before: Record<string, unknown>;
  note: string | null;
  status: string;
  created_at: string;
  reviewed_at: string | null;
  product: { slug: string; title_ko: string } | null;
};

export default async function ProductChangesPage({
  searchParams,
}: {
  searchParams: { ok?: string; fail?: string };
}) {
  const supabase = createClient();
  const { data } = await supabase
    .from("mcp_product_change")
    .select("id,patch,before,note,status,created_at,reviewed_at,product:product_id(slug,title_ko)")
    .order("created_at", { ascending: false })
    .limit(50);

  const changes = (data ?? []) as unknown as Change[];
  const pending = changes.filter((c) => c.status === "pending");
  const done = changes.filter((c) => c.status !== "pending");

  return (
    <main className="max-w-4xl space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">상품 수정 제안</h1>
          <p className="mt-1 text-sm text-neutral-500">
            MCP(Claude)가 올린 제안입니다. <b>반영을 누르기 전까지 상품은 바뀌지 않습니다.</b>{" "}
            가격·재고·판매상태·표시사항은 제안 대상이 아닙니다.
          </p>
        </div>
        <Link href="/admin/products" className="shrink-0 rounded-full border px-4 py-2 text-sm hover:bg-neutral-100">
          ← 제품 관리
        </Link>
      </div>

      {searchParams.ok === "applied" && (
        <p className="rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-800">반영했습니다.</p>
      )}
      {searchParams.ok === "rejected" && (
        <p className="rounded-lg border px-4 py-3 text-sm text-neutral-600">제안을 버렸습니다.</p>
      )}
      {searchParams.fail && (
        <p className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          처리하지 못했습니다 — {searchParams.fail}
        </p>
      )}

      <section className="space-y-4">
        <h2 className="font-bold">
          대기 중 ({pending.length})
        </h2>
        {pending.length === 0 && (
          <p className="rounded-xl border py-8 text-center text-sm text-neutral-400">대기 중인 제안이 없습니다.</p>
        )}

        {pending.map((c) => (
          <article key={c.id} className="rounded-xl border border-amber-300 bg-amber-50/40 p-5">
            <header className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <h3 className="font-semibold">{c.product?.title_ko ?? "(삭제된 상품)"}</h3>
                <p className="mt-0.5 font-mono text-xs text-neutral-500">{c.product?.slug}</p>
              </div>
              <time className="text-xs text-neutral-500">
                {new Date(c.created_at).toLocaleString("ko-KR")}
              </time>
            </header>

            {c.note && (
              <p className="mt-3 rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-neutral-700">
                <span className="font-semibold">근거</span> · {c.note}
              </p>
            )}

            <div className="mt-4 space-y-3">
              {Object.keys(c.patch).map((k) => (
                <div key={k} className="rounded-lg bg-white p-3">
                  <p className="text-xs font-semibold text-neutral-500">{FIELD_KO[k] ?? k}</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <div className="rounded border border-neutral-200 bg-neutral-50 p-2">
                      <p className="mb-1 text-[11px] text-neutral-400">현재</p>
                      <pre className="whitespace-pre-wrap break-words font-sans text-sm text-neutral-500 line-through decoration-neutral-300">
                        {show(c.before[k])}
                      </pre>
                    </div>
                    <div className="rounded border border-green-200 bg-green-50 p-2">
                      <p className="mb-1 text-[11px] text-green-600">제안</p>
                      <pre className="whitespace-pre-wrap break-words font-sans text-sm text-neutral-800">
                        {show(c.patch[k])}
                      </pre>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center gap-2">
              <form action={applyProductChangeAction}>
                <input type="hidden" name="change_id" value={c.id} />
                <button className="rounded-full bg-amber-600 px-5 py-2 text-sm font-semibold text-white hover:opacity-90">
                  반영
                </button>
              </form>
              <form action={rejectProductChangeAction}>
                <input type="hidden" name="change_id" value={c.id} />
                <button className="rounded-full border px-4 py-2 text-sm text-neutral-500 hover:bg-neutral-100">
                  버림
                </button>
              </form>
              <p className="ml-auto text-xs text-neutral-500">
                제안 이후 값이 바뀌었으면 반영이 거부됩니다.
              </p>
            </div>
          </article>
        ))}
      </section>

      {done.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-bold">처리 완료 ({done.length})</h2>
          <ul className="divide-y rounded-xl border">
            {done.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                <span className={`rounded-full px-2 py-0.5 text-xs ${c.status === "applied" ? "bg-green-100 text-green-700" : "bg-neutral-100 text-neutral-500"}`}>
                  {STATUS_KO[c.status] ?? c.status}
                </span>
                <span className="font-medium">{c.product?.title_ko ?? "-"}</span>
                <span className="text-xs text-neutral-500">
                  {Object.keys(c.patch).map((k) => FIELD_KO[k] ?? k).join(", ")}
                </span>
                <time className="ml-auto text-xs text-neutral-400">
                  {c.reviewed_at ? new Date(c.reviewed_at).toLocaleString("ko-KR") : ""}
                </time>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
