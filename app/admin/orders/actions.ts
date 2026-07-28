"use server";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { sendEmail, shipNotificationHtml } from "@/lib/email";
import { inicisCancel, paypalRefund } from "@/lib/payments-refund";

import { requireAdmin, getAdminUser } from "@/lib/auth-guard";
// 취소/환불 등 관리자 쓰기는 RLS 우회(service-role) 우선, 없으면 세션 클라이언트
function adminDb() {
  return hasServiceRole ? createAdminClient() : createClient();
}

// 주문 상태: created(미결제) → paid(결제완료) → preparing(확인) → shipped(출고) → delivered
//            created 가 24시간 경과하면 cron 이 expired(미결제 만료)로 전환한다.
// 미결제(created)는 결제 전이므로 준비/출고로 진행 불가 — 개별·일괄 처리 모두 결제완료(paid) 이상만 전이.
export async function setOrderStatusAction(formData: FormData) {
  await requireAdmin();
  const orderId = String(formData.get("order_id") || "");
  const status = String(formData.get("status") || "");
  const supabase = createClient();
  // created(미결제)·expired(미결제 만료) 주문을 준비/출고로 넘기려는 시도는 차단(결제 전 진행 방지).
  if ((status === "preparing" || status === "shipped")) {
    const { data: o } = await supabase.from("orders").select("status").eq("id", orderId).maybeSingle();
    if (o?.status === "created" || o?.status === "expired") { revalidatePath("/admin/orders"); return; }
  }
  await supabase.from("orders").update({ status }).eq("id", orderId);
  if (status === "shipped") await onShip(orderId);
  revalidatePath("/admin/orders");
}

export async function bulkOrdersAction(ids: string[], action: "confirm" | "ship") {
  await requireAdmin();
  const supabase = createClient();
  const status = action === "confirm" ? "preparing" : "shipped";
  // 미결제(created)는 제외하고 결제완료 이상만 전이 (confirm=paid→preparing, ship=paid/preparing→shipped).
  const fromStatuses = action === "confirm" ? ["paid"] : ["paid", "preparing"];
  const { data: eligible } = await supabase
    .from("orders").select("id").in("id", ids).in("status", fromStatuses);
  const okIds = (eligible ?? []).map((o) => (o as { id: string }).id);
  if (okIds.length === 0) { revalidatePath("/admin/orders"); return; }
  await supabase.from("orders").update({ status }).in("id", okIds);
  if (action === "ship") for (const id of okIds) await onShip(id);
  revalidatePath("/admin/orders");
}

// 출고 처리: 재고 차감 + 송장 생성 (이메일 발송은 Gmail 연동 시)
async function onShip(orderId: string) {
  const supabase = createClient();
  const { data: order } = await supabase.from("orders").select("order_no,email,shipping_address").eq("id", orderId).maybeSingle();
  const { data: items } = await supabase.from("order_item").select("variant_id,qty,cancelled_qty").eq("order_id", orderId);
  for (const it of items ?? []) {
    const ship = it.qty - (it.cancelled_qty ?? 0); // 취소분 제외한 실제 출고 수량만 차감
    if (it.variant_id && ship > 0) {
      await supabase.from("inventory_ledger").insert({ variant_id: it.variant_id, delta: -ship, reason: "order", ref_id: order?.order_no ?? orderId });
    }
  }
  const { data: existing } = await supabase.from("shipment").select("id").eq("order_id", orderId).maybeSingle();
  if (!existing) {
    await supabase.from("shipment").insert({ order_id: orderId, carrier: "lotte", status: "shipped", shipped_at: new Date().toISOString() });
  }
  // 고객 출고 알림 이메일 (이메일 프로바이더 미설정 시 자동 생략)
  if (order?.email) {
    const name = (order.shipping_address as { name?: string } | null)?.name;
    await sendEmail(order.email, `[MTSPACE COFFEE] 주문 ${order.order_no} 출고 안내`, shipNotificationHtml(order.order_no, name));
  }
}

// ── 주문 취소/부분취소 (이니시스 카드) ──
// mode=full: 잔여 전액 취소 / mode=partial: 선택 품목·수량 취소.
// 흐름: 검증 → 금액산출 → 이니시스 취소 API → refund 기록 → order_item.cancelled_qty →
//       (출고된 건만) 재고 복원 → payment/orders 상태 전이. 이니시스 실패 시 DB 무변경.
export interface CancelItemInput { order_item_id: string; qty: number }
export async function cancelOrderAction(input: {
  order_id: string;
  mode: "full" | "partial";
  items?: CancelItemInput[];
  reason?: string;
}): Promise<{ ok: boolean; message: string }> {
  // C-2: 기존엔 로그인 여부만 확인해, 일반 회원도 타인 주문을 실제 환불(PG 취소)시킬 수 있었다.
  const user = await getAdminUser();
  if (!user) return { ok: false, message: "관리자 권한이 필요합니다." };
  const db = adminDb();

  const { data: order } = await db.from("orders")
    .select("id,order_no,status,grand_total,currency")
    .eq("id", input.order_id).maybeSingle();
  if (!order) return { ok: false, message: "주문을 찾을 수 없습니다." };

  const { data: pay } = await db.from("payment")
    .select("id,provider,pg_tid,capture_id,amount,status")
    .eq("order_id", input.order_id).maybeSingle();
  if (!pay) return { ok: false, message: "결제 정보가 없습니다." };
  if (pay.provider !== "inicis" && pay.provider !== "paypal") {
    return { ok: false, message: "이니시스·페이팔 결제만 취소를 지원합니다." };
  }
  if (pay.provider === "inicis" && !pay.pg_tid) return { ok: false, message: "결제 TID가 없어 취소할 수 없습니다." };
  if (pay.provider === "paypal" && !pay.capture_id) return { ok: false, message: "페이팔 capture_id가 없어 환불할 수 없습니다." };
  // 페이팔은 결제통화(USD)와 품목가(KRW) 불일치로 전체환불만 지원(부분취소는 이니시스 전용)
  if (pay.provider === "paypal" && input.mode === "partial") {
    return { ok: false, message: "페이팔 주문은 전체 환불만 지원합니다. (부분취소는 이니시스 카드 전용)" };
  }
  if (!["paid", "partial_cancelled"].includes(pay.status)) {
    return { ok: false, message: `취소 가능한 결제 상태가 아닙니다 (${pay.status}).` };
  }

  const cancellable = ["paid", "preparing", "shipped", "in_transit", "delivered", "partial_refunded"];
  if (!cancellable.includes(order.status)) {
    return { ok: false, message: `취소 가능한 주문 상태가 아닙니다 (${order.status}).` };
  }

  // 이미 취소된 금액 → 잔여 취소가능액
  const { data: refunds } = await db.from("refund").select("amount,status").eq("payment_id", pay.id);
  const alreadyCancelled = (refunds ?? [])
    .filter((r) => r.status === "success")
    .reduce((s, r) => s + (r.amount || 0), 0);
  const remaining = pay.amount - alreadyCancelled;
  if (remaining <= 0) return { ok: false, message: "이미 전액 취소된 주문입니다." };

  // 품목 로드
  const { data: items } = await db.from("order_item")
    .select("id,variant_id,qty,cancelled_qty,unit_price,title_snapshot")
    .eq("order_id", input.order_id);
  const itemMap = new Map((items ?? []).map((i) => [i.id, i]));

  // 취소 대상 산출
  type Line = { item: NonNullable<ReturnType<typeof itemMap.get>>; qty: number; amount: number };
  const cancelItems: Line[] = [];
  if (input.mode === "full") {
    // 전체취소: 남은 모든 품목 수량을 재고복원 대상으로(금액은 잔여 전액=배송비 포함)
    for (const it of items ?? []) {
      const avail = it.qty - (it.cancelled_qty ?? 0);
      if (avail > 0) cancelItems.push({ item: it, qty: avail, amount: it.unit_price * avail });
    }
  } else {
    for (const sel of input.items ?? []) {
      const it = itemMap.get(sel.order_item_id);
      if (!it) return { ok: false, message: "선택한 품목을 찾을 수 없습니다." };
      const avail = it.qty - (it.cancelled_qty ?? 0);
      const q = Math.floor(Number(sel.qty) || 0);
      if (q <= 0) continue;
      if (q > avail) return { ok: false, message: `${it.title_snapshot}: 취소 수량 초과 (취소가능 ${avail}).` };
      cancelItems.push({ item: it, qty: q, amount: it.unit_price * q });
    }
    if (cancelItems.length === 0) return { ok: false, message: "취소할 품목·수량을 선택하세요." };
  }

  // 금액: 전체취소=잔여 전액(배송비·할인 반영), 부분취소=선택 품목가 합.
  const itemsAmount = cancelItems.reduce((s, c) => s + c.amount, 0);
  const requested = input.mode === "full" ? remaining : itemsAmount;
  if (requested <= 0 || requested > remaining) {
    return { ok: false, message: `취소 금액(${requested.toLocaleString()}원)이 잔여 취소가능액(${remaining.toLocaleString()}원)을 초과합니다.` };
  }

  const reason = (input.reason || "관리자 취소").slice(0, 80);
  const ip = headers().get("x-forwarded-for")?.split(",")[0]?.trim();

  // PG 취소 호출 — 이니시스(전체·부분) / 페이팔(전체환불 USD)
  let pgCancelId: string | null = null;
  if (pay.provider === "paypal") {
    const r = await paypalRefund({ captureId: pay.capture_id!, amount: requested, currency: order.currency || "USD" });
    if (!r.ok) return { ok: false, message: `페이팔 환불 실패: ${r.message}` };
    pgCancelId = r.refundId ?? null;
  } else {
    // 전체취소 API는 "최초 취소 & 전액"일 때만. 그 외(부분/추가취소)는 부분취소 API.
    const useFullApi = alreadyCancelled === 0 && requested === pay.amount;
    const r = await inicisCancel({
      tid: pay.pg_tid!,
      reason,
      clientIp: ip,
      partial: useFullApi ? undefined : { price: requested, confirmPrice: remaining - requested },
    });
    if (!r.ok) return { ok: false, message: `이니시스 취소 실패: ${r.message}` };
    pgCancelId = r.cancelId ?? null;
  }

  // ── PG 성공 후 DB 반영 ──
  await db.from("refund").insert({
    payment_id: pay.id, amount: requested, reason,
    pg_cancel_id: pgCancelId, status: "success", created_by: user.id,
  });

  for (const c of cancelItems) {
    await db.from("order_item")
      .update({ cancelled_qty: (c.item.cancelled_qty ?? 0) + c.qty })
      .eq("id", c.item.id);
  }

  // 재고 복원: 출고(shipment 존재)된 주문만 — 미출고 건은 애초에 차감된 적 없음
  const { data: shp } = await db.from("shipment").select("id").eq("order_id", input.order_id).maybeSingle();
  if (shp) {
    for (const c of cancelItems) {
      if (c.item.variant_id) {
        await db.from("inventory_ledger").insert({
          variant_id: c.item.variant_id, delta: c.qty, reason: "cancel", ref_id: order.order_no,
        });
      }
    }
  }

  // 상태 전이
  const newCancelled = alreadyCancelled + requested;
  const full = newCancelled >= pay.amount;
  await db.from("payment").update({ status: full ? "cancelled" : "partial_cancelled" }).eq("id", pay.id);
  await db.from("orders").update({ status: full ? "cancelled" : "partial_refunded" }).eq("id", input.order_id);

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${input.order_id}`);
  return {
    ok: true,
    message: full ? "전체 취소 완료" : `부분 취소 완료 (${requested.toLocaleString()}원 · 잔여 ${(remaining - requested).toLocaleString()}원)`,
  };
}
