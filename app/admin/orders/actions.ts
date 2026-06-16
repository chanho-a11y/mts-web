"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// 주문 상태: created(기본) → preparing(확인) → shipped(출고) → delivered
export async function setOrderStatusAction(formData: FormData) {
  const orderId = String(formData.get("order_id") || "");
  const status = String(formData.get("status") || "");
  const supabase = createClient();
  await supabase.from("orders").update({ status }).eq("id", orderId);
  if (status === "shipped") await onShip(orderId);
  revalidatePath("/admin/orders");
}

export async function bulkOrdersAction(ids: string[], action: "confirm" | "ship") {
  const supabase = createClient();
  const status = action === "confirm" ? "preparing" : "shipped";
  await supabase.from("orders").update({ status }).in("id", ids);
  if (action === "ship") for (const id of ids) await onShip(id);
  revalidatePath("/admin/orders");
}

// 출고 처리: 재고 차감 + 송장 생성 (이메일 발송은 Gmail 연동 시)
async function onShip(orderId: string) {
  const supabase = createClient();
  const { data: order } = await supabase.from("orders").select("order_no").eq("id", orderId).maybeSingle();
  const { data: items } = await supabase.from("order_item").select("variant_id,qty").eq("order_id", orderId);
  for (const it of items ?? []) {
    if (it.variant_id) {
      await supabase.from("inventory_ledger").insert({ variant_id: it.variant_id, delta: -it.qty, reason: "order", ref_id: order?.order_no ?? orderId });
    }
  }
  const { data: existing } = await supabase.from("shipment").select("id").eq("order_id", orderId).maybeSingle();
  if (!existing) {
    await supabase.from("shipment").insert({ order_id: orderId, carrier: "lotte", status: "shipped", shipped_at: new Date().toISOString() });
  }
  // TODO: 고객 출고 알림 이메일 (Gmail 연동 후)
}
