"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth-guard";

/**
 * MCP 상품 수정 제안 처리.
 *
 * 실제 UPDATE 는 DB 함수 apply_mcp_product_change() 안에서만 일어난다.
 * 그 함수는 SECURITY INVOKER 라 호출자(관리자) 권한으로 돌고 RLS 가 그대로 적용된다.
 * 서버 액션은 layout 가드를 우회할 수 있으므로 requireAdmin() 을 여기서 다시 건다(D-092).
 */

async function slugOf(changeId: string): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("mcp_product_change")
    .select("product:product_id(slug)")
    .eq("id", changeId)
    .maybeSingle();
  const p = (data as { product?: { slug?: string } | null } | null)?.product;
  return p?.slug ?? null;
}

export async function applyProductChangeAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("change_id") || "");
  if (!id) return;

  const slug = await slugOf(id);
  const supabase = createClient();
  const { error } = await supabase.rpc("apply_mcp_product_change", { p_change_id: id });

  if (error) redirect(`/admin/products/changes?fail=${encodeURIComponent(error.message)}`);

  revalidatePath("/admin/products/changes");
  revalidatePath("/admin/products");
  if (slug) {
    revalidatePath(`/products/${slug}`);
    revalidatePath(`/admin/products/${slug}`);
  }
  revalidatePath("/");
  redirect("/admin/products/changes?ok=applied");
}

export async function rejectProductChangeAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("change_id") || "");
  if (!id) return;

  const supabase = createClient();
  const { error } = await supabase.rpc("reject_mcp_product_change", { p_change_id: id });

  if (error) redirect(`/admin/products/changes?fail=${encodeURIComponent(error.message)}`);

  revalidatePath("/admin/products/changes");
  redirect("/admin/products/changes?ok=rejected");
}
