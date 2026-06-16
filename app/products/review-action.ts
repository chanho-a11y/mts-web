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
  const { data: prof } = await supabase.from("profiles").select("name").eq("id", user.id).maybeSingle();
  await supabase.from("review").insert({
    product_id: productId, profile_id: user.id, author_name: prof?.name ?? "고객",
    rating, title: String(formData.get("title") || ""), body: String(formData.get("body") || ""),
  });
  revalidatePath(`/products/${slug}`);
}
