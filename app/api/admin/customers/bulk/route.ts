import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// 고객 일괄 작업 — 보관/복원/삭제. 관리자 전용.
// 삭제는 단건 로직과 동일: 주문 이력 있으면 완전삭제 대신 보관 폴백.
export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (prof?.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let p: { action?: string; ids?: string[] } = {};
  try { p = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }
  const action = String(p.action || "");
  const ids = Array.isArray(p.ids) ? p.ids.map(String).filter(Boolean) : [];
  if (!ids.length) return NextResponse.json({ error: "선택된 고객이 없습니다" }, { status: 400 });

  if (action === "archive" || action === "restore") {
    const archived = action === "archive";
    const { error } = await supabase.from("profiles").update({ archived }).in("id", ids);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    revalidatePath("/admin/customers");
    return NextResponse.json({ ok: true, [action === "archive" ? "archived" : "restored"]: ids.length });
  }

  if (action === "delete") {
    if (!hasServiceRole) return NextResponse.json({ error: "완전 삭제에는 SUPABASE_SERVICE_ROLE_KEY가 필요합니다" }, { status: 503 });
    const admin = createAdminClient();
    let deleted = 0, archivedInstead = 0, failed = 0;
    for (const id of ids) {
      try {
        // 생성자 참조 정리(삭제 차단 방지)
        await admin.from("customer_variant_prices").update({ created_by: null }).eq("created_by", id);
        await admin.from("business_accounts").update({ approved_by: null }).eq("approved_by", id);
        await admin.from("refund").update({ created_by: null }).eq("created_by", id);
        // 주문 이력 있으면 보관 폴백
        const { count } = await admin.from("orders").select("*", { count: "exact", head: true }).eq("profile_id", id);
        if ((count ?? 0) > 0) { await admin.from("profiles").update({ archived: true }).eq("id", id); archivedInstead++; continue; }
        const { error } = await admin.auth.admin.deleteUser(id);
        if (error) { await admin.from("profiles").update({ archived: true }).eq("id", id); archivedInstead++; continue; }
        await admin.from("profiles").delete().eq("id", id);
        deleted++;
      } catch { failed++; }
    }
    revalidatePath("/admin/customers");
    return NextResponse.json({ ok: true, deleted, archivedInstead, failed });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
