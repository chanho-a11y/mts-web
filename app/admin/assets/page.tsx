import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { deleteAssetAction } from "./actions";

export const dynamic = "force-dynamic";

/**
 * MCP 자산 대장 (D-108).
 *
 * commerce_create_image 가 올린 커버들의 목록·참조 상태·삭제 버튼.
 * MCP 는 자산을 지우지 못한다(부재로 강제) — 정리는 여기서 사람이 한다.
 * 글이 참조 중인 자산은 삭제 버튼이 비활성화된다(서버 액션이 한 번 더 검사한다).
 */

interface AssetRow {
  path: string;
  purpose: string;
  bytes: number;
  mime: string;
  width: number;
  height: number;
  alt: string | null;
  post_slug: string | null;
  created_at: string;
}

export default async function AdminAssetsPage({
  searchParams,
}: {
  searchParams?: { e?: string; ok?: string };
}) {
  const admin = createAdminClient();
  const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-assets/`;

  const { data: assets } = await admin
    .from("mcp_asset")
    .select("path,purpose,bytes,mime,width,height,alt,post_slug,created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  // 실제 참조를 커버 URL 로 역조회한다. post_slug 는 선언이고 이쪽이 사실이다.
  const { data: posts } = await admin
    .from("content_post")
    .select("slug,status,cover_image")
    .like("cover_image", `${base}mcp/%`);

  const refsByPath = new Map<string, { slug: string; status: string }[]>();
  for (const p of posts ?? []) {
    const path = (p.cover_image as string).slice(base.length);
    const list = refsByPath.get(path) ?? [];
    list.push({ slug: p.slug, status: p.status });
    refsByPath.set(path, list);
  }

  const rows = (assets ?? []) as AssetRow[];

  return (
    <div>
      <h1 className="text-xl font-bold">MCP 자산</h1>
      <p className="mt-1 text-sm text-neutral-500">
        MCP(commerce_create_image)가 등록한 커버 이미지 대장입니다. MCP 는 자산을 덮어쓰거나 지우지
        못하므로, 잘못 올라간 파일의 정리는 이 화면에서만 합니다. 글이 참조 중인 자산은 지울 수 없습니다.
      </p>

      {searchParams?.e && (
        <p className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {searchParams.e}
        </p>
      )}
      {searchParams?.ok && (
        <p className="mt-3 rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          삭제했습니다.
        </p>
      )}
      {!hasServiceRole && (
        <p className="mt-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          service-role 키가 없는 환경이라 조회만 가능합니다.
        </p>
      )}

      <div className="mt-5 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase text-neutral-400">
              <th className="py-2 pr-3">미리보기</th>
              <th className="py-2 pr-3">경로 / alt</th>
              <th className="py-2 pr-3">규격</th>
              <th className="py-2 pr-3">참조 글</th>
              <th className="py-2 pr-3">등록</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-neutral-400">
                  등록된 자산이 없습니다.
                </td>
              </tr>
            )}
            {rows.map((a) => {
              const refs = refsByPath.get(a.path) ?? [];
              const referenced = refs.length > 0;
              return (
                <tr key={a.path} className="border-b align-top">
                  <td className="py-3 pr-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={base + a.path}
                      alt={a.alt ?? a.path}
                      className="h-12 w-[72px] rounded border object-cover"
                    />
                  </td>
                  <td className="max-w-[360px] py-3 pr-3">
                    <p className="break-all font-mono text-xs">{a.path}</p>
                    {a.alt && <p className="mt-1 text-xs text-neutral-500">{a.alt}</p>}
                  </td>
                  <td className="whitespace-nowrap py-3 pr-3 text-xs text-neutral-600">
                    {a.width}×{a.height}
                    <br />
                    {Math.round(a.bytes / 1024)}KB · {a.mime.replace("image/", "")}
                  </td>
                  <td className="py-3 pr-3 text-xs">
                    {referenced ? (
                      refs.map((r) => (
                        <p key={r.slug}>
                          <span className="font-medium">{r.slug}</span>{" "}
                          <span className={r.status === "published" ? "text-green-600" : "text-neutral-400"}>
                            ({r.status})
                          </span>
                        </p>
                      ))
                    ) : (
                      <span className="text-neutral-400">미참조{a.post_slug ? ` (선언: ${a.post_slug})` : ""}</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap py-3 pr-3 text-xs text-neutral-500">
                    {new Date(a.created_at).toLocaleDateString("ko-KR")}
                  </td>
                  <td className="py-3 text-right">
                    <form action={deleteAssetAction}>
                      <input type="hidden" name="path" value={a.path} />
                      <button
                        type="submit"
                        disabled={referenced || !hasServiceRole}
                        title={referenced ? "참조 중인 자산은 지울 수 없습니다" : "스토리지와 대장에서 함께 삭제"}
                        className="rounded border px-2 py-1 text-xs text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        삭제
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
