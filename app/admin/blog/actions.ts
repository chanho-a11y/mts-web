"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

import { requireAdmin } from "@/lib/auth-guard";
import { REV_SUFFIX } from "./rev";

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
  await requireAdmin();
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
  await requireAdmin();
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
  await requireAdmin();
  const supabase = createClient();
  const id = String(formData.get("id") || "");
  if (!id) return;
  await supabase.from("content_post").delete().eq("id", id);
  revalidatePath("/admin/blog");
  revalidatePath("/blogs/coffeelog");
}

/**
 * 개선안 초안(`<원본slug>--rev`)을 원본 글에 반영한다.
 *
 * MCP 는 발행글을 수정하지 못하므로 개선안은 항상 별도 초안으로만 들어온다.
 * 원본을 실제로 바꾸는 지점은 이 액션 하나뿐이고, 사람이 버튼을 눌러야만 실행된다.
 * 즉 승인 게이트는 그대로 유지되고, 승인 방식이 복붙에서 클릭으로 바뀔 뿐이다.
 *
 * 발행일(published_at)은 건드리지 않는다 — 원본의 최초 발행 시점을 보존한다.
 */
export async function applyRevisionAction(formData: FormData) {
  await requireAdmin();
  const supabase = createClient();
  const revId = String(formData.get("rev_id") || "");
  if (!revId) return;

  const { data: rev } = await supabase
    .from("content_post")
    .select("id,slug,title,body_html,excerpt,cover_image,tags,seo_title,seo_description,status")
    .eq("id", revId)
    .maybeSingle();

  // 초안이고, 개선안 접미사를 가진 글만 반영 대상이다.
  if (!rev || rev.status !== "draft" || !rev.slug.endsWith(REV_SUFFIX)) return;

  const targetSlug = rev.slug.slice(0, -REV_SUFFIX.length);
  const { data: target } = await supabase
    .from("content_post")
    .select("id")
    .eq("slug", targetSlug)
    .maybeSingle();
  if (!target) return;

  const patch: Record<string, unknown> = {
    title: rev.title,
    body_html: rev.body_html,
    excerpt: rev.excerpt,
    tags: rev.tags,
    seo_title: rev.seo_title,
    seo_description: rev.seo_description,
  };
  // MCP 는 커버 이미지를 만들지 않는다. 비어 있으면 원본 커버를 지우지 않고 그대로 둔다.
  if (rev.cover_image) patch.cover_image = rev.cover_image;

  await supabase.from("content_post").update(patch).eq("id", target.id);
  await supabase.from("content_post").delete().eq("id", rev.id);

  revalidatePath("/admin/blog");
  revalidatePath("/blogs/coffeelog");
  revalidatePath(`/blogs/coffeelog/${targetSlug}`);
  revalidatePath("/");
}
