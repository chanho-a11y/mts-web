"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9가-힣\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80) || `post-${Date.now()}`;
}

async function defaultStorefrontId(): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase.from("storefront").select("id").limit(1).maybeSingle();
  return data?.id ?? null;
}

export async function createPostAction(formData: FormData) {
  const supabase = createClient();
  const title = String(formData.get("title") || "").trim();
  if (!title) return;
  const slug = String(formData.get("slug") || "").trim() || slugify(title);
  const status = String(formData.get("status") || "draft");
  await supabase.from("content_post").insert({
    slug,
    title,
    excerpt: String(formData.get("excerpt") || "") || null,
    body_html: String(formData.get("body_html") || "") || null,
    cover_image: String(formData.get("cover_image") || "") || null,
    author: String(formData.get("author") || "MTSPACE COFFEE") || null,
    status,
    storefront_id: await defaultStorefrontId(),
    published_at: status === "published" ? new Date().toISOString() : null,
    seo_title: String(formData.get("seo_title") || "") || null,
    seo_description: String(formData.get("seo_description") || "") || null,
  });
  revalidatePath("/admin/blog");
  revalidatePath("/blogs/coffeelog");
}

export async function updatePostAction(formData: FormData) {
  const supabase = createClient();
  const id = String(formData.get("id") || "");
  if (!id) return;
  const status = String(formData.get("status") || "draft");
  const patch: Record<string, unknown> = {
    title: String(formData.get("title") || ""),
    slug: String(formData.get("slug") || ""),
    excerpt: String(formData.get("excerpt") || "") || null,
    body_html: String(formData.get("body_html") || "") || null,
    cover_image: String(formData.get("cover_image") || "") || null,
    status,
  };
  // 발행 상태로 처음 전환될 때 published_at 세팅
  if (status === "published") {
    const { data: cur } = await supabase.from("content_post").select("published_at").eq("id", id).maybeSingle();
    if (!cur?.published_at) patch.published_at = new Date().toISOString();
  }
  await supabase.from("content_post").update(patch).eq("id", id);
  revalidatePath("/admin/blog");
  revalidatePath("/blogs/coffeelog");
}

export async function deletePostAction(formData: FormData) {
  const supabase = createClient();
  const id = String(formData.get("id") || "");
  if (!id) return;
  await supabase.from("content_post").delete().eq("id", id);
  revalidatePath("/admin/blog");
  revalidatePath("/blogs/coffeelog");
}
