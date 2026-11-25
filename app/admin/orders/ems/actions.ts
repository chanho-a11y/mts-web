"use server";
// D-174: 해외 주문 EMS 운송장 등록. 주문 상세 화면에서 번호를 입력하면
//  1) shipment 행 저장(출고 버튼으로 만든 빈 행이 있으면 그 행을 채움, carrier=ems)
//  2) 결제완료, 확인 상태면 출고(shipped)로 전이
//  3) 아직 안내 전이면 출고 메일 1통(EMS 번호와 우체국 조회 링크), 성공 시 notified_at 기록
// 롯데 송장 등록(D-142, tracking/actions.ts)과 같은 규칙을 따른다.
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth-guard";
import { sendEmail, shipNotificationHtml, shipNotificationSubject } from "@/lib/email";
import { orderEmailLang, isIntlShipping } from "@/lib/ship-date";
import { isEmsNo, normalizeEmsNo } from "@/lib/tracking";

function db() {
  return hasServiceRole ? createAdminClient() : createClient();
}

const OPEN_STATUSES = ["paid", "preparing"];
const LINKABLE = [...OPEN_STATUSES, "shipped", "in_transit", "delivered"];

export interface EmsRegisterResult { ok: boolean; mailed: boolean; message: string }

export async function registerEmsAction(input: { orderId: string; emsNo: string; sendMail: boolean }): Promise<EmsRegisterResult> {
  await requireAdmin();
  const orderId = String(input?.orderId ?? "").slice(0, 40);
  const emsNo = normalizeEmsNo(String(input?.emsNo ?? "").slice(0, 40));
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) return { ok: false, mailed: false, message: "주문 ID가 올바르지 않습니다." };
  if (!isEmsNo(emsNo)) return { ok: false, mailed: false, message: "EMS 번호 형식이 아닙니다. 영문 2자, 숫자 9자, 영문 2자(예: EE123456789KR)로 입력해 주세요." };

  const supabase = db();
  const { data: order } = await supabase
    .from("orders").select("id,order_no,status,email,shipping_address").eq("id", orderId).maybeSingle();
  if (!order) return { ok: false, mailed: false, message: "주문을 찾을 수 없습니다." };
  const o = order as { id: string; order_no: string; status: string; email: string | null; shipping_address: unknown };
  if (!LINKABLE.includes(o.status)) return { ok: false, mailed: false, message: `등록할 수 없는 주문 상태입니다(${o.status}).` };

  // 같은 번호가 다른 주문에 이미 등록돼 있으면 막는다(오입력 방지).
  const { data: dup } = await supabase.from("shipment").select("order_id").eq("tracking_no", emsNo).limit(5);
  if (((dup ?? []) as { order_id: string }[]).some((d) => d.order_id !== orderId)) {
    return { ok: false, mailed: false, message: "이 EMS 번호는 다른 주문에 이미 등록되어 있습니다." };
  }

  const { data: shipData, error: shipErr } = await supabase
    .from("shipment").select("id,tracking_no,notified_at,shipped_at").eq("order_id", orderId).order("created_at");
  if (shipErr) return { ok: false, mailed: false, message: shipErr.message };
  const ships = (shipData ?? []) as { id: string; tracking_no: string | null; notified_at: string | null; shipped_at: string | null }[];
  const now = new Date().toISOString();

  if (!ships.some((s) => s.tracking_no === emsNo)) {
    const blank = ships.find((s) => !s.tracking_no);
    const res = blank
      ? await supabase.from("shipment").update({ tracking_no: emsNo, carrier: "ems", status: "shipped", shipped_at: blank.shipped_at ?? now }).eq("id", blank.id)
      : await supabase.from("shipment").insert({ order_id: orderId, carrier: "ems", tracking_no: emsNo, status: "shipped", shipped_at: now });
    if (res.error) return { ok: false, mailed: false, message: `운송장 저장 실패: ${res.error.message}` };
  }

  if (OPEN_STATUSES.includes(o.status)) {
    const { error } = await supabase.from("orders").update({ status: "shipped" }).eq("id", orderId).in("status", OPEN_STATUSES);
    if (error) return { ok: false, mailed: false, message: `상태 변경 실패: ${error.message}` };
  }

  const alreadyNotified = ships.some((s) => !!s.notified_at);
  let mailed = false;
  let message = alreadyNotified ? "EMS 번호 저장 (이미 안내된 주문이라 메일 생략)" : "EMS 번호 저장";
  if (!alreadyNotified) {
    if (!input.sendMail) {
      await supabase.from("shipment").update({ notified_at: now }).eq("order_id", orderId);
      message = "EMS 번호 저장 (메일 발송 안 함)";
    } else if (!o.email) {
      message = "EMS 번호 저장 (고객 이메일 없음, 메일 미발송)";
    } else {
      const { data: all } = await supabase.from("shipment").select("tracking_no").eq("order_id", orderId).order("created_at");
      const trackings = Array.from(new Set(((all ?? []) as { tracking_no: string | null }[]).map((s) => s.tracking_no).filter((x): x is string => !!x)));
      const lang = orderEmailLang(o.shipping_address);
      const name = (o.shipping_address as { recipient?: string } | null)?.recipient;
      const r = await sendEmail(
        o.email,
        shipNotificationSubject(o.order_no, trackings, lang),
        shipNotificationHtml(o.order_no, name, trackings, { lang, intl: isIntlShipping(o.shipping_address) }),
      );
      if (r.sent) {
        await supabase.from("shipment").update({ notified_at: now }).eq("order_id", orderId);
        mailed = true;
        message = "EMS 번호 저장, 출고 메일 발송";
      } else {
        message = `EMS 번호 저장, 메일 실패(${r.reason ?? "unknown"}). 같은 번호로 다시 등록하면 재시도됩니다`;
      }
    }
  }

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  return { ok: true, mailed, message };
}
