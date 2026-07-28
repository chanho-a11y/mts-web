import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmail, orderConfirmationHtml, orderAdminNotifyHtml } from "./email";

export interface ApproveExtra { provider?: string; tid?: string; captureId?: string; raw?: unknown;
  // H-2: PG 가 실제 승인한 금액(주문 통화 기준 정수). 제공 시 order.grand_total 과 일치할 때만 결제완료 전이.
  paidAmount?: number | null }
export interface ApproveResult { ok: boolean; already?: boolean; orderNo?: string; reason?: string }

// 주문 결제 승인 확정 — 멱등. payment.paid + orders.paid 로 전이(created·expired에서만).
// 신규 결제완료 전이 시 1회에 한해 주문확인 메일(고객)+주문접수 알림(관리자) 발송(메일 실패는 승인에 영향 없음).
export async function approveOrder(db: SupabaseClient, orderId: string, extra: ApproveExtra = {}): Promise<ApproveResult> {
  const { data: order } = await db
    .from("orders")
    .select("id,order_no,status,grand_total,currency,email,shipping_address,order_item(title_snapshot,sku,qty,line_total)")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return { ok: false, reason: "order_not_found" };

  // 멱등: 이미 결제완료+ 단계면 통과
  const alreadyPaid = ["paid", "preparing", "shipped", "in_transit", "delivered"].includes(order.status);

  // H-2: PG 확정 금액 검증 — 이미 결제완료가 아닌 신규 승인에 한해, 금액이 파싱된 경우 정확히 일치해야 함.
  // (금액 미파싱 시엔 로깅만 하고 통과 = 알 수 없는 응답형식으로 정상결제를 막지 않기 위함. 파싱되면 fail-closed.)
  if (!alreadyPaid && extra.paidAmount != null && Number.isFinite(extra.paidAmount)) {
    const expected = Number(order.grand_total);
    if (Math.round(extra.paidAmount) !== Math.round(expected)) {
      console.error(`[approve-amount-mismatch] order=${order.order_no} expected=${expected} paid=${extra.paidAmount} provider=${extra.provider}`);
      // 승인 거절 + 결제 레코드에 불일치 표시(결제완료로 전이하지 않음)
      await db.from("payment").update({ status: "amount_mismatch", raw_response: (extra.raw ?? null) as object }).eq("order_id", orderId);
      return { ok: false, reason: "amount_mismatch", orderNo: order.order_no };
    }
  }

  const pUpd: Record<string, unknown> = { status: "paid", approved_at: new Date().toISOString() };
  if (extra.tid) pUpd.pg_tid = extra.tid;
  if (extra.captureId) pUpd.capture_id = extra.captureId;
  if (extra.raw !== undefined) pUpd.raw_response = extra.raw as object;
  await db.from("payment").update(pUpd).eq("order_id", orderId);

  // expired 도 포함 — 미결제 만료 처리(24h) 뒤 PG 승인이 늦게 도착하는 경우를 되살리는 안전망.
  // (결제는 됐는데 주문만 만료 상태로 남는 사고 방지)
  if (!alreadyPaid && (order.status === "created" || order.status === "expired")) {
    if (order.status === "expired") console.warn(`[approve-after-expire] order=${order.order_no} 만료 처리된 주문에 승인이 도착해 결제완료로 되살림`);
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

    // 관리자 주문 접수 알림 (신규 결제완료 전이 시 1회). 수신처=ORDER_NOTIFY_TO(기본 chanho@mtspace.coffee).
    // 고객 메일 유무와 무관하게 항상 발송. 실패는 승인에 영향 없음.
    try {
      const adminTo = process.env.ORDER_NOTIFY_TO || "chanho@mtspace.coffee";
      const sa = (order.shipping_address as Record<string, unknown> | null) ?? {};
      const amountLabel = order.currency === "USD"
        ? `$${Number(order.grand_total).toLocaleString("en-US")}`
        : `${Number(order.grand_total).toLocaleString("ko-KR")}원`;
      const ra = await sendEmail(
        adminTo,
        `[MTSPACE COFFEE] 새 주문 ${order.order_no} · ${amountLabel}`,
        orderAdminNotifyHtml({
          order_no: order.order_no,
          email: order.email,
          grand_total: order.grand_total,
          currency: order.currency,
          shipping: sa as {
            recipient?: string; phone?: string; zipcode?: string; addr1?: string; addr2?: string; country?: string; shipping_label?: string;
          },
          items: ((order as { order_item?: { title_snapshot?: string | null; sku?: string | null; qty?: number | null; line_total?: number | null }[] }).order_item) ?? [],
        }),
      );
      console.log(`[order-admin-notify] order=${order.order_no} to=${adminTo}`, ra);
    } catch (e) {
      console.warn(`[order-admin-notify] send threw for order=${order.order_no}:`, (e as Error)?.message);
    }
  }
  return { ok: true, already: alreadyPaid, orderNo: order.order_no };
}
