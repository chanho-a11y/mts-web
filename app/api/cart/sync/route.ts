import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// 장바구니 '쓰기 전용 미러'.
//
// 장바구니 자체는 계속 localStorage 가 정본이고, 체크아웃은 이 테이블을 읽지 않는다.
// 따라서 결제 경로에는 어떤 영향도 없다(중복주문 D-089 회귀 위험 없음).
// 목적은 오직 하나 — "담아두고 주문하지 않은 거래처"를 관리자 분석에서 보기 위함이다.
//
// 로그인 회원만 기록한다. 비회원 카트를 담으려면 익명 쓰기 RLS 를 새로 열어야 하는데,
// 게스트 주문이 0건인 현재 상황에서는 보안 표면만 넓히는 셈이다.
// 기존 RLS(cart_owner: profile_id = auth.uid())를 그대로 쓰므로 정책 변경도 없다.

const MAX_ITEMS = 100;

interface SyncItem {
  variantId?: string;
  qty?: number;
  price?: number;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const noContent = () => new NextResponse(null, { status: 204 });

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // 비회원은 조용히 넘긴다 — 클라이언트가 로그인 여부를 몰라도 그냥 호출할 수 있게.
  if (!user) return noContent();

  let body: { items?: SyncItem[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }

  const items = (body.items ?? [])
    .filter((i) => i && typeof i.variantId === "string" && UUID_RE.test(i.variantId) && Number(i.qty) > 0)
    .slice(0, MAX_ITEMS)
    .map((i) => ({
      variant_id: i.variantId as string,
      qty: Math.min(9999, Math.max(1, Math.floor(Number(i.qty)))),
      unit_price_snapshot: Math.max(0, Math.floor(Number(i.price ?? 0))) || null,
    }));

  try {
    const now = new Date().toISOString();

    // 회원당 카트 1개(cart_profile_uidx). 있으면 갱신, 없으면 생성.
    const { data: existing } = await supabase.from("cart").select("id").eq("profile_id", user.id).maybeSingle();
    let cartId = existing?.id as string | undefined;

    if (!cartId) {
      const { data: created, error } = await supabase
        .from("cart")
        .insert({ profile_id: user.id, updated_at: now })
        .select("id")
        .single();
      if (error || !created) return noContent();
      cartId = created.id as string;
    } else {
      await supabase.from("cart").update({ updated_at: now }).eq("id", cartId);
    }

    // 미러는 현재 상태의 사본이므로 통째로 교체한다.
    // 삭제 범위는 '요청한 본인의 카트' 한 건뿐이며 RLS 가 이를 한 번 더 강제한다.
    await supabase.from("cart_item").delete().eq("cart_id", cartId);
    if (items.length) {
      await supabase.from("cart_item").insert(items.map((i) => ({ cart_id: cartId, ...i })));
    }
  } catch (e) {
    // 미러 실패가 쇼핑을 막아서는 안 된다.
    console.warn("[cart-sync] failed:", (e as Error)?.message?.slice(0, 160));
  }

  return noContent();
}
