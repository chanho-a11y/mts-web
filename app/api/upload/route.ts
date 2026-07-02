import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// 공용 이미지 업로드 — 관리자 전용. multipart(file) → product-assets(public) → { url }.
// 블로그 커버·본문 이미지, 사이트 관리자 슬라이드/배너/디자인자산, 페이지 이미지 등에 공용.
const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"];
const EXT: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif", "image/svg+xml": "svg" };

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (prof?.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!hasServiceRole) return NextResponse.json({ error: "service-role 키가 필요합니다(배포 환경)" }, { status: 503 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "파일이 없습니다" }, { status: 400 });
  if (!ALLOWED.includes(file.type)) return NextResponse.json({ error: `지원하지 않는 형식(${file.type})` }, { status: 400 });
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "10MB 이하만 업로드 가능합니다" }, { status: 400 });

  const folder = String(form.get("folder") || "uploads").replace(/[^a-z0-9_-]/gi, "") || "uploads";
  const ext = EXT[file.type] ?? "png";
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());

  const admin = createAdminClient();
  const up = await admin.storage.from("product-assets").upload(path, buf, { contentType: file.type, upsert: true });
  if (up.error) return NextResponse.json({ error: "업로드 실패: " + up.error.message }, { status: 500 });
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-assets/${path}`;
  return NextResponse.json({ ok: true, url });
}
