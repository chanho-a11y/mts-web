import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// 카테고리 → 제품 유형(단건 폼 규칙과 동일)
const CAT_TYPE: Record<string, string> = {
  blends: "블렌드", "single-origins": "싱글 오리진", wholesale: "블렌드",
  normcore: "블렌드", decaf: "디카페인", merch: "merch", limited: "블렌드",
};

// 제품 일괄 작업 — 발행/초안(setstatus)·보관/복원·삭제·유형변경. 관리자 전용.
export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (prof?.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let p: { action?: string; slugs?: string[]; category?: string; status?: string } = {};
  try { p = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }
  const action = String(p.action || "");
  const slugs = Array.isArray(p.slugs) ? p.slugs.map(String).filter(Boolean) : [];
  if (!slugs.length) return NextResponse.json({ error: "선택된 제품이 없습니다" }, { status: 400 });

  if (action === "archive" || action === "restore") {
    const status = action === "archive" ? "archived" : "active";
    const { error } = await supabase.from("product").update({ status }).in("slug", slugs);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // 게시(restore)는 스토어프론트 노출 링크를 보장해야 쇼핑에 뜬다(누락 시 게시해도 안 보이던 버그 수정).
    const admin = hasServiceRole ? createAdminClient() : supabase;
    const { data: sf } = await admin.from("storefront").select("id").eq("domain", "mtspace.coffee").maybeSingle();
    const { data: prods } = await admin.from("product").select("id").in("slug", slugs);
    const pids = (prods ?? []).map((p: { id: string }) => p.id);
    if (sf && pids.length) {
      if (action === "restore") {
        for (const pid of pids) {
          await admin.from("product_storefronts").upsert(
            { product_id: pid, storefront_id: (sf as { id: string }).id, is_visible: true },
            { onConflict: "product_id,storefront_id" },
          );
        }
      } else {
        await admin.from("product_storefronts").update({ is_visible: false }).in("product_id", pids);
      }
    }
    revalidatePath("/admin/products");
    return NextResponse.json({ ok: true, [action === "archive" ? "archived" : "restored"]: slugs.length });
  }

  // 발행/초안 일괄 전환 — 발행(active)=스토어프론트 노출 ON, 초안(draft)=노출 OFF.
  if (action === "setstatus") {
    const status = String(p.status || "");
    if (status !== "active" && status !== "draft") {
      return NextResponse.json({ error: "status는 active 또는 draft 여야 합니다" }, { status: 400 });
    }
    const { error } = await supabase.from("product").update({ status }).in("slug", slugs);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // 노출 링크 동기화 — 발행은 upsert(is_visible=true), 초안은 is_visible=false.
    const admin = hasServiceRole ? createAdminClient() : supabase;
    const { data: sf } = await admin.from("storefront").select("id").eq("domain", "mtspace.coffee").maybeSingle();
    const { data: prods } = await admin.from("product").select("id").in("slug", slugs);
    const pids = (prods ?? []).map((row: { id: string }) => row.id);
    if (sf && pids.length) {
      if (status === "active") {
        for (const pid of pids) {
          await admin.from("product_storefronts").upsert(
            { product_id: pid, storefront_id: (sf as { id: string }).id, is_visible: true },
            { onConflict: "product_id,storefront_id" },
          );
        }
      } else {
        await admin.from("product_storefronts").update({ is_visible: false }).in("product_id", pids);
      }
    }
    revalidatePath("/admin/products");
    return NextResponse.json({ ok: true, changed: slugs.length, status });
  }

  if (action === "settype") {
    const category = String(p.category || "").trim();
    if (!category) return NextResponse.json({ error: "변경할 유형(카테고리)을 선택하세요" }, { status: 400 });
    const admin = hasServiceRole ? createAdminClient() : supabase;
    const { data: cat } = await admin.from("category").select("id").eq("slug", category).maybeSingle();
    if (!cat) return NextResponse.json({ error: "카테고리를 찾을 수 없습니다" }, { status: 400 });
    const product_type = CAT_TYPE[category] ?? "블렌드";
    const is_b2b = category === "wholesale";
    let changed = 0, failed = 0;
    for (const slug of slugs) {
      try {
        const { data: prod } = await admin.from("product").select("id").eq("slug", slug).maybeSingle();
        if (!prod) { failed++; continue; }
        const pid = (prod as { id: string }).id;
        // is_b2b_only 는 항상 카테고리 기준으로 재설정한다(wholesale → 다른 유형으로 되돌릴 때 해제되도록).
        await admin.from("product").update({ product_type, is_b2b_only: is_b2b }).eq("id", pid);
        // 대표 변형도 함께 동기화 — 구매 차단·가격 노출은 변형의 is_b2b_only 를 본다.
        const { data: repV } = await admin.from("product_variant").select("id").eq("product_id", pid).order("position").limit(1).maybeSingle();
        if (repV) await admin.from("product_variant").update({ is_b2b_only: is_b2b }).eq("id", (repV as { id: string }).id);
        await admin.from("product_categories").delete().eq("product_id", pid);
        await admin.from("product_categories").insert({ product_id: pid, category_id: (cat as { id: string }).id });
        changed++;
      } catch { failed++; }
    }
    revalidatePath("/admin/products");
    return NextResponse.json({ ok: true, changed, failed });
  }

  if (action === "delete") {
    if (!hasServiceRole) return NextResponse.json({ error: "완전 삭제에는 SUPABASE_SERVICE_ROLE_KEY가 필요합니다" }, { status: 503 });
    const admin = createAdminClient();
    let deleted = 0, archivedInstead = 0, failed = 0;
    for (const slug of slugs) {
      try {
        const { data: prod } = await admin.from("product").select("id,product_variant(id)").eq("slug", slug).maybeSingle();
        if (!prod) { failed++; continue; }
        const pid = (prod as { id: string }).id;
        const vids = ((prod as { product_variant?: { id: string }[] }).product_variant ?? []).map((v) => v.id);
        // 주문에 사용된 제품은 완전삭제 불가 → 보관 폴백
        let ordered = false;
        if (vids.length) {
          const { count } = await admin.from("order_item").select("*", { count: "exact", head: true }).in("variant_id", vids);
          ordered = (count ?? 0) > 0;
        }
        if (ordered) { await admin.from("product").update({ status: "archived" }).eq("id", pid); archivedInstead++; continue; }
        // 소유 하위 정리 후 제품 삭제
        if (vids.length) await admin.from("customer_variant_prices").delete().in("variant_id", vids);
        await admin.from("product_variant").delete().eq("product_id", pid);
        await admin.from("product_image").delete().eq("product_id", pid);
        await admin.from("product_categories").delete().eq("product_id", pid);
        await admin.from("product_storefronts").delete().eq("product_id", pid);
        await admin.from("product_asset").delete().eq("product_id", pid);
        const { error } = await admin.from("product").delete().eq("id", pid);
        if (error) { await admin.from("product").update({ status: "archived" }).eq("id", pid); archivedInstead++; continue; }
        deleted++;
      } catch { failed++; }
    }
    revalidatePath("/admin/products");
    return NextResponse.json({ ok: true, deleted, archivedInstead, failed });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
