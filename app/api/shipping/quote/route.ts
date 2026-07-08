import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { computeShipping } from "@/lib/shipping";

export const dynamic = "force-dynamic";

// 체크아웃 배송비 실시간 견적. body: { country, items:[{variantId, qty}] }
// 무게=variant.weight_g, 소계=resolve_price(회원 등급가 반영) — 주문 생성부와 동일 규칙.
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { country?: string; items?: { variantId: string; qty: number }[] } | null;
  const country = body?.country || "KR";
  const items = (body?.items ?? []).filter((i) => i?.variantId && i?.qty > 0);

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const profileId = user?.id ?? null;

  let subtotal = 0;
  let totalWeight = 0;
  for (const it of items) {
    const { data: v } = await supabase.from("product_variant").select("weight_g").eq("id", it.variantId).maybeSingle();
    const { data: rp } = await supabase.rpc("resolve_price", { p_variant_id: it.variantId, p_profile_id: profileId });
    const row = Array.isArray(rp) ? rp[0] : rp;
    subtotal += (row?.price ?? 0) * it.qty;
    totalWeight += ((v as { weight_g?: number } | null)?.weight_g ?? 0) * it.qty;
  }

  const q = await computeShipping(supabase, country, totalWeight, subtotal);
  return NextResponse.json({ ...q, subtotalKRW: subtotal });
}
