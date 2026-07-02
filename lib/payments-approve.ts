import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmail, orderConfirmationHtml } from "./email";

export interface ApproveExtra { provider?: string; tid?: string; captureId?: string; raw?: unknown }
export interface ApproveResult { ok: boolean; already?: boolean; orderNo?: string; reason?: string }

// 주문 결제 승인 확정 — 멱등. payment.paid + orders.paid 로 전이(created에서만).
// 신규 결제완료 전이 시 1회에 한해 주문확인 메일 발송(메일 실패는 승인에 영향 없음).
export async function approveOrder(db: SupabaseClient, orderId: string, extra: ApproveExtra = {}): Promise<ApproveResult> {
  const { data: order } = await db
    .from("orders")
    .select("id,order_no,status,grand_total,currency,email,shipping_address")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return { ok: false, reason: "order_not_found" };

  // 멱등: 이미 결제완료+ 단계면 통과
  const alreadyPaid = ["paid", "preparing", "shipped", "in_transit", "delivered"].includes(order.status);

  const pUpd: Record<string, unknown> = { status: "paid", approved_at: new Date().toISOString() };
  if (extra.tid) pUpd.pg_tid = extra.tid;
  if (extra.captureId) pUpd.capture_id = extra.captureId;
  if (extra.raw !== undefined) pUpd.raw_response = extra.raw as object;
  await db.from("payment").update(pUpd).eq("order_id", orderId);

  if (!alreadyPaid && order.status === "created") {
    await db.from("orders").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", orderId);

    // 주문확인 메일 (신규 결제완료 전이 시에만)
    if (order.email) {
      const name = (order.shipping_address as { recipient?: string } | null)?.recipient;
      try {
        const r = await sendEmail(
          order.email,
          `[MTSPACE COFFEE] 주문이 완료되었습니다 (${order.order_no})`,
          orderConfirmationHtml(order.order_no, name, order.grand_total, order.currency),
        );
        console.log(`[order-confirm-email] order=${order.order_no} to=${order.email}`, r);
      } catch (e) {
        console.warn(`[order-confirm-email] send threw for order=${order.order_no}:`, (e as Error)?.message);
      }
    } else {
      console.warn(`[order-confirm-email] skipped: no email on order ${order.order_no}`);
    }
  }
  return { ok: true, already: alreadyPaid, orderNo: order.order_no };
}
