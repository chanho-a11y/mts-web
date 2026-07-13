"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function addReviewAction(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const slug = String(formData.get("slug") || "");
  if (!user) redirect(`/account/login?error=${encodeURIComponent("리뷰는 로그인이 필요합니다")}`);
  const productId = String(formData.get("product_id") || "");
  const rating = Math.min(5, Math.max(1, parseInt(String(formData.get("rating") || "5"), 10)));
  // L-2: 임의 product_id 방지 — 실재 제품만 허용
  const { data: prod } = await supabase.from("product").select("id").eq("id", productId).maybeSingle();
  if (!prod) redirect(`/products/${slug}?error=${encodeURIComponent("잘못된 제품입니다")}`);
  const { data: prof } = await supabase.from("profiles").select("name").eq("id", user.id).maybeSingle();
  const title = String(formData.get("title") || "").slice(0, 120);
  const body = String(formData.get("body") || "").slice(0, 4000);
  // L-2: 1인 1제품 1리뷰 — 기존 리뷰 있으면 갱신(중복 방지)
  const { data: existing } = await supabase.from("review").select("id").eq("product_id", productId).eq("profile_id", user.id).maybeSingle();
  if (existing) {
    await supabase.from("review").update({ rating, title, body, author_name: prof?.name ?? "고객" }).eq("id", existing.id);
  } else {
    await supabase.from("review").insert({
      product_id: productId, profile_id: user.id, author_name: prof?.name ?? "고객", rating, title, body,
    });
  }
  revalidatePath(`/products/${slug}`);
}
