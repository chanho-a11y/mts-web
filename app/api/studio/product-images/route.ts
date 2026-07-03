import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// 통합 스튜디오 추가 이미지(대표 아님) 관리 — 목록/추가/삭제. 관리자 전용.
// 대표 썸네일은 /api/studio/thumbnail-apply(단일). 여기서는 is_primary=false 갤러리 이미지만 다룬다.
async function requireAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "unauthorized" as const, status: 401, supabase: null };
  const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (prof?.role !== "admin") return { error: "forbidden" as const, status: 403, supabase: null };
  return { error: null, status: 200, supabase };
}

export async function GET(req: Request) {
  const { error, status, supabase } = await requireAdmin();
  if (error || !supabase) return NextResponse.json({ error }, { status });
  const slug = new URL(req.url).searchParams.get("slug")?.trim() ?? "";
  if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });
  const { data: prod } = await supabase.from("product").select("id").eq("slug", slug).maybeSingle();
  if (!prod) return NextResponse.json({ error: "product not found" }, { status: 404 });
  const { data } = await supabase.from("product_image")
    .select("id,storage_path,is_primary,position")
    .eq("product_id", (prod as { id: string }).id)
    .order("is_primary", { ascending: false }).order("position", { ascending: true });
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(req: Request) {
  const { error, status, supabase } = await requireAdmin();
  if (error || !supabase) return NextResponse.json({ error }, { status });
  if (!hasServiceRole) return NextResponse.json({ error: "이미지 저장에는 SUPABASE_SERVICE_ROLE_KEY 환경변수가 필요합니다" }, { status: 503 });
  let p: { slug?: string; url?: string } = {};
  try { p = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }
  const slug = String(p.slug || "").trim();
  const url = String(p.url || "").trim();
  if (!slug || !url) return NextResponse.json({ error: "slug/url required" }, { status: 400 });

  const { data: prod } = await supabase.from("product").select("id,title_ko").eq("slug", slug).maybeSingle();
  if (!prod) return NextResponse.json({ error: "product not found" }, { status: 404 });
  const pid = (prod as { id: string }).id;
  const admin = createAdminClient();
  // position = 기존 최대 + 1
  const { data: existing } = await admin.from("product_image").select("position").eq("product_id", pid);
  const nextPos = (existing ?? []).reduce((mx: number, r: { position?: number }) => Math.max(mx, r.position ?? 0), 0) + 1;
  const { error: e } = await admin.from("product_image").insert({ product_id: pid, storage_path: url, alt: (prod as { title_ko?: string }).title_ko || slug, is_primary: false, position: nextPos });
  if (e) return NextResponse.json({ error: e.message }, { status: 500 });
  revalidatePath(`/products/${slug}`);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { error, status, supabase } = await requireAdmin();
  if (error || !supabase) return NextResponse.json({ error }, { status });
  if (!hasServiceRole) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY 필요" }, { status: 503 });
  let p: { id?: string; slug?: string } = {};
  try { p = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }
  const id = String(p.id || "");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const admin = createAdminClient();
  const { error: e } = await admin.from("product_image").delete().eq("id", id).eq("is_primary", false);
  if (e) return NextResponse.json({ error: e.message }, { status: 500 });
  if (p.slug) revalidatePath(`/products/${String(p.slug)}`);
  return NextResponse.json({ ok: true });
}
