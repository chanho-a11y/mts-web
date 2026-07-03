import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// 품목보고번호 마스터 관리(관리자 전용) — 목록/추가·수정/삭제.
// 쓰기는 RLS(report_no_admin_write)로도 이중 보호되지만, 여기서도 role 확인.
async function requireAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "unauthorized" as const, status: 401, supabase: null };
  const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (prof?.role !== "admin") return { error: "forbidden" as const, status: 403, supabase: null };
  return { error: null, status: 200, supabase };
}

export async function GET() {
  const { error, status, supabase } = await requireAdmin();
  if (error || !supabase) return NextResponse.json({ error }, { status });
  const { data } = await supabase.from("report_no").select("id,report_no,product_name,material,origin,position").order("position", { ascending: true });
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(req: Request) {
  const { error, status, supabase } = await requireAdmin();
  if (error || !supabase) return NextResponse.json({ error }, { status });
  let p: any = {};
  try { p = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }

  const report_no = String(p.report_no || "").replace(/\s+/g, "").trim();
  if (!report_no) return NextResponse.json({ error: "품목보고번호는 필수입니다" }, { status: 400 });
  const row: Record<string, unknown> = {
    report_no,
    product_name: String(p.product_name || "").trim(),
    material: String(p.material || "커피원두(100%)").trim() || "커피원두(100%)",
    origin: p.origin ? String(p.origin).trim() : null,
    position: Number.isFinite(+p.position) ? parseInt(String(p.position), 10) : 999,
    updated_at: new Date().toISOString(),
  };

  if (p.id) {
    const { error: e } = await supabase.from("report_no").update(row).eq("id", String(p.id));
    if (e) return NextResponse.json({ error: e.message }, { status: 500 });
  } else {
    const { error: e } = await supabase.from("report_no").upsert(row, { onConflict: "report_no" });
    if (e) return NextResponse.json({ error: e.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { error, status, supabase } = await requireAdmin();
  if (error || !supabase) return NextResponse.json({ error }, { status });
  let p: any = {};
  try { p = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }
  const id = String(p.id || "");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const { error: e } = await supabase.from("report_no").delete().eq("id", id);
  if (e) return NextResponse.json({ error: e.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
