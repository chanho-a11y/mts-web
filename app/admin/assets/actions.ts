"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth-guard";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";

/**
 * MCP 자산 삭제 — 사람만 지울 수 있다 (D-108).
 *
 * MCP 쪽에는 삭제 툴도 DELETE 정책도 없다(D-107, 부재로 강제). 그 비대칭의 나머지
 * 반쪽이 이 액션이다: 잘못 올라간 자산의 정리는 관리자 화면에서 사람이 한다.
 * service-role 은 이 서버 액션 안에서만 쓰이고, requireAdmin() 이 선행한다(D-092 원칙).
 */
export async function deleteAssetAction(formData: FormData) {
  await requireAdmin();

  const fail = (msg: string): never => redirect(`/admin/assets?e=${encodeURIComponent(msg)}`);

  if (!hasServiceRole) fail("service-role 키가 없어 삭제할 수 없습니다(배포 환경에서 실행하세요).");

  const path = String(formData.get("path") || "");
  // MCP 가 만든 자산만 지운다. 프리픽스 밖 경로는 이 화면의 소관이 아니다.
  if (!/^mcp\/[A-Za-z0-9._/-]+$/.test(path) || path.includes("..")) fail("잘못된 자산 경로입니다.");

  const admin = createAdminClient();
  const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-assets/`;

  // 참조 중인 자산은 지우지 않는다 — 커버가 404 가 되는 사고를 화면 차원에서 한 번 더 막는다.
  const { data: refs } = await admin
    .from("content_post")
    .select("slug,status")
    .eq("cover_image", base + path);
  if (refs && refs.length > 0) {
    fail(`글이 참조 중이라 지울 수 없습니다: ${refs.map((r) => r.slug).join(", ")} — 블로그 관리에서 커버를 먼저 바꾸세요.`);
  }

  const { error: se } = await admin.storage.from("product-assets").remove([path]);
  if (se) fail(`스토리지 삭제 실패: ${se.message}`);

  // 파일과 대장이 어긋나면 미참조 리포트가 거짓말을 한다 — 반드시 같이 지운다.
  const { error: le } = await admin.from("mcp_asset").delete().eq("path", path);
  if (le) fail(`대장 정리 실패(파일은 지워짐): ${le.message}`);

  revalidatePath("/admin/assets");
  redirect("/admin/assets?ok=1");
}
