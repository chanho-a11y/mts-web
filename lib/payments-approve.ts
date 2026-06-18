import type { SupabaseClient } from "@supabase/supabase-js";

export interface ApproveExtra { provider?: string; tid?: string; captureId?: string; raw?: unknown }
export interface ApproveResult { ok: boolean; already?: boolean; orderNo?: string; reason?: string }

// 주문 결제 승인 확정 — 멱등. payment.paid + orders.paid 로 전이(created에서만).
export async function approveOrder(db: SupabaseClient, orderId: string, extra: ApproveExtra = {}): Promise<ApproveResult> {
  const { data: order } = await db.from("orders").select("id,order_no,status,grand_total,currency").eq("id", orderId).maybeSingle();
  if (!order) return { ok: false, reason: "order_not_found" };

  // 멱등: 이미 결제완료+ 단계면 통과
  const alreadyPaid = ["paid", "preparing", "shipped", "in_transit", "delivered"].includes(order.status);

  const pUpd: Record<string, unknown> = { status: "paid", approved_at: new Date().toISOString() };
  if (extra.tid) pUpd.pg_tid = extra.tid;
  if (extra.captureId) pUpd.capture_id = extra.captureId;
  if (extra.raw !== undefined) pUpd.raw_response = extra.raw as object;
  await db.from("payment").update(pUpd).eq("order_id", orderId);

  if (!alreadyPaid && order.status === "created") {
    await db.from("orders").update({ status: "paid" }).eq("id", orderId);
  }
  return { ok: true, already: alreadyPaid, orderNo: order.order_no };
}
