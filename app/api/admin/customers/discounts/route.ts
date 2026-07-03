import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// 기업 고객 할인 일괄 등록 — 대상(제품/카테고리) × 방식(금액/율)을 여러 건 등록.
// 카테고리/제품 대상은 해당 변형들로 확장되어 customer_variant_prices(절대 개별가)로 저장(resolve_price 최우선).
type Item = { target: "product" | "category"; product_slug?: string; category?: string; mode: "amount" | "percent"; value: number };

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (prof?.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: { profile_id?: string; items?: Item[] } = {};
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }
  const profileId = String(body.profile_id || "");
  const items = Array.isArray(body.items) ? body.items : [];
  if (!profileId) return NextResponse.json({ error: "고객이 지정되지 않았습니다" }, { status: 400 });
  if (!items.length) return NextResponse.json({ error: "등록할 할인이 없습니다" }, { status: 400 });

  const priceFor = (base: number, mode: string, value: number) =>
    mode === "amount" ? Math.max(0, base - Math.round(value)) : Math.max(0, Math.round(base * (1 - value / 100)));

  let applied = 0, variantsSet = 0;
  for (const it of items) {
    const value = Number(it.value);
    if (!Number.isFinite(value) || value <= 0) continue;
    if (it.mode !== "amount" && it.mode !== "percent") continue;

    // 대상 변형 수집
    let variants: { id: string; base_price: number }[] = [];
    if (it.target === "product" && it.product_slug) {
      const { data: p } = await supabase.from("product").select("id").eq("slug", it.product_slug).maybeSingle();
      if (p) {
        const { data: vs } = await supabase.from("product_variant").select("id,base_price").eq("product_id", (p as { id: string }).id).eq("is_active", true);
        variants = (vs ?? []) as { id: string; base_price: number }[];
      }
    } else if (it.target === "category" && it.category) {
      const { data: pcs } = await supabase.from("product_categories").select("product_id, category!inner(slug)").eq("category.slug", it.category);
      const pids = (pcs ?? []).map((x: { product_id: string }) => x.product_id);
      if (pids.length) {
        const { data: vs } = await supabase.from("product_variant").select("id,base_price").in("product_id", pids).eq("is_active", true);
        variants = (vs ?? []) as { id: string; base_price: number }[];
      }
    }
    if (!variants.length) continue;

    const vids = variants.map((v) => v.id);
    // 동일 변형의 기존 개별가는 교체(중복 방지)
    await supabase.from("customer_variant_prices").delete().eq("profile_id", profileId).in("variant_id", vids);
    const rows = variants
      .map((v) => ({ profile_id: profileId, variant_id: v.id, price: priceFor(v.base_price, it.mode, value), created_by: user.id }))
      .filter((r) => r.price > 0);
    if (rows.length) {
      const { error } = await supabase.from("customer_variant_prices").insert(rows);
      if (!error) { applied++; variantsSet += rows.length; }
    }
  }

  revalidatePath(`/admin/customers/${profileId}`);
  return NextResponse.json({ ok: true, applied, variantsSet });
}
