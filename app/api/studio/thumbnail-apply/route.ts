import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// 썸네일 → 제품 대표 이미지(product_image is_primary) 적용(관리자 전용).
// 다른 제품 필드는 건드리지 않는다. body: { slug, thumb_dataurl }
export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (prof?.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let payload: any = {};
  try { payload = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }
  const slug = String(payload.slug || "").trim();
  if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });
  if (!hasServiceRole) return NextResponse.json({ error: "이미지 업로드에는 SUPABASE_SERVICE_ROLE_KEY 환경변수가 필요합니다" }, { status: 503 });

  const m = String(payload.thumb_dataurl || "").match(/^data:(image\/\w+);base64,(.+)$/);
  if (!m) return NextResponse.json({ error: "no image" }, { status: 400 });

  const { data: product } = await supabase.from("product").select("id,title_ko").eq("slug", slug).maybeSingle();
  if (!product) return NextResponse.json({ error: "product not found" }, { status: 404 });
  const pid = (product as any).id;

  const ext = m[1] === "image/jpeg" ? "jpg" : "png";
  const buf = Buffer.from(m[2], "base64");
  const path = `thumb/${slug}-${Date.now()}.${ext}`;
  const admin = createAdminClient();
  const up = await admin.storage.from("product-assets").upload(path, buf, { contentType: m[1], upsert: true });
  if (up.error) return NextResponse.json({ error: "upload_failed" }, { status: 500 });

  const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-assets/${path}`;
  // 썸네일은 '스튜디오 저장분 한 개'만 유지: 기존 스튜디오 썸네일(thumb/*) 제거 후 단일 대표 등록.
  // 추가 이미지(is_primary=false·다른 경로)는 보존.
  await admin.from("product_image").delete().eq("product_id", pid).like("storage_path", "%/thumb/%");
  await admin.from("product_image").update({ is_primary: false }).eq("product_id", pid);
  await admin.from("product_image").insert({ product_id: pid, storage_path: publicUrl, alt: (product as any).title_ko || slug, is_primary: true, position: 0 });

  revalidatePath(`/products/${slug}`);
  revalidatePath(`/admin/products/${slug}`);
  return NextResponse.json({ ok: true, url: publicUrl });
}
