import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// 라벨 이미지 → product_asset('label') 저장. 제품 콘텐츠(body_html 등)는 건드리지 않음. 관리자 전용.
// body: { slug, label_dataurl }
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
  if (!hasServiceRole) return NextResponse.json({ error: "no_service_role" }, { status: 503 });

  const { data: product } = await supabase.from("product").select("id").eq("slug", slug).maybeSingle();
  if (!product) return NextResponse.json({ error: "product not found" }, { status: 404 });

  // 라벨 메타(품목보고번호·원재료명·포인트컬러) 제품에 영구 저장
  const meta: Record<string, unknown> = {};
  if (typeof payload.reportNo === "string") meta.report_no = payload.reportNo || null;
  if (typeof payload.material === "string") meta.material = payload.material || null;
  if (typeof payload.point === "string") meta.label_point = payload.point || null;
  if (Object.keys(meta).length) await supabase.from("product").update(meta).eq("id", (product as any).id);

  const m = String(payload.label_dataurl || "").match(/^data:(image\/\w+);base64,(.+)$/);
  if (!m) return NextResponse.json({ ok: true, saved: ["meta"], note: "이미지 없이 메타만 저장" });
  const ext = m[1] === "image/jpeg" ? "jpg" : "png";
  const buf = Buffer.from(m[2], "base64");
  const admin = createAdminClient();
  const path = `label/${slug}-${Date.now()}.${ext}`;
  const up = await admin.storage.from("product-assets").upload(path, buf, { contentType: m[1], upsert: true });
  if (up.error) return NextResponse.json({ error: "upload_failed" }, { status: 500 });
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-assets/${path}`;
  await admin.from("product_asset").insert({ product_id: (product as any).id, kind: "label", url });
  return NextResponse.json({ ok: true, url });
}
