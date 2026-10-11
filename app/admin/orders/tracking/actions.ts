"use server";
// D-142 롯데 송장 등록: 집하 상세 파일의 운송장을 주문에 연결하고, 주문당 1회 출고 메일(운송장, 배송조회 링크)을 보낸다.
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth-guard";
import { sendEmail, shipNotificationHtml } from "@/lib/email";
import { matchWaybills, formatTrackingNo, type LotteWaybill, type MatchOrder, type WaybillMatch } from "@/lib/lotte";

function db() {
  return hasServiceRole ? createAdminClient() : createClient();
}

/** 송장 연결 대상이 될 수 있는 주문 상태 */
const OPEN_STATUSES = ["paid", "preparing"];
const SHIPPED_STATUSES = ["shipped", "in_transit", "delivered"];
const LINKABLE = [...OPEN_STATUSES, ...SHIPPED_STATUSES];
const SHIPPED_LOOKBACK_DAYS = 30;

export interface PoolOrder {
  id: string;
  order_no: string;
  status: string;
  placed_at: string;
  recipient: string;
  company: string;
  region: string;
  items: string;
  tracked: string[];      // 이미 등록된 운송장
  notified: boolean;      // 출고 메일 발송(안내) 완료 여부
}

type Addr = { recipient?: string; phone?: string; zipcode?: string; addr1?: string; addr2?: string } | null;
type ItemRow = { title_snapshot: string | null; qty: number; cancelled_qty: number | null };
type ShipRow = { id: string; tracking_no: string | null; notified_at: string | null };
type OrderRow = {
  id: string; order_no: string; status: string; placed_at: string; profile_id: string | null;
  shipping_address: Addr; order_item: ItemRow[] | null; shipment: ShipRow[] | null;
};

const clip = (s: unknown, n = 200) => String(s ?? "").slice(0, n);

/** 매칭 후보 주문: 결제완료, 확인 상태 전부 + 최근 30일 출고분 중 운송장이 하나도 없는 주문 */
async function loadPool(): Promise<{ pool: PoolOrder[]; matchOrders: MatchOrder[] }> {
  const supabase = db();
  const sel = "id,order_no,status,placed_at,profile_id,shipping_address,order_item(title_snapshot,qty,cancelled_qty),shipment(id,tracking_no,notified_at)";
  const since = new Date(Date.now() - SHIPPED_LOOKBACK_DAYS * 86400000).toISOString();
  const [open, shipped] = await Promise.all([
    supabase.from("orders").select(sel).in("status", OPEN_STATUSES).order("placed_at").limit(500),
    supabase.from("orders").select(sel).in("status", SHIPPED_STATUSES).gte("placed_at", since).order("placed_at").limit(500),
  ]);
  if (open.error) throw new Error(open.error.message);
  if (shipped.error) throw new Error(shipped.error.message);
  const rows = [
    ...((open.data ?? []) as unknown as OrderRow[]),
    ...((shipped.data ?? []) as unknown as OrderRow[]).filter((o) => !(o.shipment ?? []).some((s) => s.tracking_no)),
  ];

  const pids = Array.from(new Set(rows.map((o) => o.profile_id).filter((x): x is string => !!x)));
  const [profs, bizs] = pids.length
    ? await Promise.all([
        supabase.from("profiles").select("id,name").in("id", pids),
        supabase.from("business_accounts").select("profile_id,company_name").in("profile_id", pids),
      ])
    : [{ data: [] }, { data: [] }];
  const pname = new Map(((profs.data ?? []) as { id: string; name: string | null }[]).map((p) => [p.id, p.name ?? ""]));
  const cname = new Map(((bizs.data ?? []) as { profile_id: string; company_name: string | null }[]).map((b) => [b.profile_id, b.company_name ?? ""]));

  const pool: PoolOrder[] = [];
  const matchOrders: MatchOrder[] = [];
  for (const o of rows) {
    const a = o.shipping_address ?? {};
    const items = (o.order_item ?? []).filter((i) => i.qty - (i.cancelled_qty ?? 0) > 0);
    const company = o.profile_id ? cname.get(o.profile_id) ?? "" : "";
    pool.push({
      id: o.id, order_no: o.order_no, status: o.status, placed_at: o.placed_at,
      recipient: a.recipient ?? "", company,
      region: (a.addr1 ?? "").split(/\s+/).slice(0, 3).join(" "),
      items: items.map((i) => `${i.title_snapshot ?? ""} ×${i.qty - (i.cancelled_qty ?? 0)}`).join(", "),
      tracked: (o.shipment ?? []).map((s) => s.tracking_no).filter((x): x is string => !!x),
      notified: (o.shipment ?? []).some((s) => !!s.notified_at),
    });
    matchOrders.push({
      id: o.id, order_no: o.order_no, recipient: a.recipient ?? "",
      profile_name: o.profile_id ? pname.get(o.profile_id) ?? "" : "", company_name: company,
      addr1: a.addr1 ?? "", addr2: a.addr2 ?? "",
      items: items.map((i) => i.title_snapshot ?? ""),
    });
  }
  return { pool, matchOrders };
}

export interface PreviewResult {
  ok: boolean;
  message?: string;
  matches: WaybillMatch[];
  pool: PoolOrder[];
  registered: Record<string, string>; // 이미 DB에 있는 운송장 → 주문번호
}

export async function previewTrackingAction(input: LotteWaybill[]): Promise<PreviewResult> {
  await requireAdmin();
  if (!Array.isArray(input) || input.length === 0) return { ok: false, message: "송장 행이 없습니다.", matches: [], pool: [], registered: {} };
  if (input.length > 500) return { ok: false, message: "한 번에 500건까지 등록할 수 있습니다.", matches: [], pool: [], registered: {} };
  const waybills: LotteWaybill[] = input
    .map((w) => ({
      tracking_no: formatTrackingNo(clip(w.tracking_no, 30)),
      receiver: clip(w.receiver, 80), orderer: clip(w.orderer, 80), address: clip(w.address, 200),
      product: clip(w.product, 120), qty: Number(w.qty) || 1, picked_at: clip(w.picked_at, 20),
      customer_order_no: clip(w.customer_order_no, 40), delivery_status: clip(w.delivery_status, 20),
    }))
    .filter((w) => /^\d{4}-\d{4}-\d{4}$/.test(w.tracking_no));
  if (waybills.length === 0) return { ok: false, message: "올바른 운송장번호가 없습니다.", matches: [], pool: [], registered: {} };

  try {
    const { pool, matchOrders } = await loadPool();
    const supabase = db();
    const { data: existing } = await supabase
      .from("shipment").select("tracking_no,orders(order_no)")
      .in("tracking_no", waybills.map((w) => w.tracking_no));
    const registered: Record<string, string> = {};
    for (const r of (existing ?? []) as unknown as { tracking_no: string; orders: { order_no: string } | null }[]) {
      registered[r.tracking_no] = r.orders?.order_no ?? "";
    }
    const matches = matchWaybills(waybills, matchOrders).map((m) =>
      registered[m.waybill.tracking_no] ? { ...m, selected: [], confidence: "none" as const } : m,
    );
    return { ok: true, matches, pool, registered };
  } catch (e) {
    return { ok: false, message: `주문 조회 실패: ${(e as Error).message}`, matches: [], pool: [], registered: {} };
  }
}

export interface ConfirmResultRow {
  order_no: string;
  trackings: string[];
  result: "ok" | "skip" | "error";
  mailed: boolean;
  message: string;
}

/**
 * 연결 확정. 주문 단위로:
 *  1) 운송장 저장 (출고 버튼으로 만든 빈 shipment 행이 있으면 그 행을 채우고, 나머지는 새 행)
 *  2) 결제완료, 확인 상태면 출고(shipped)로 전이
 *  3) 아직 안내 전(notified_at 없음)이면 운송장 전체를 담아 메일 1통, 성공 시 notified_at 기록
 *     sendMail=false 면 메일 없이 notified_at 만 기록(이후 재업로드해도 발송 안 함)
 */
export async function confirmTrackingAction(input: {
  pairs: { tracking_no: string; order_id: string }[];
  sendMail: boolean;
}): Promise<{ ok: boolean; message?: string; rows: ConfirmResultRow[] }> {
  await requireAdmin();
  const pairs = (input?.pairs ?? [])
    .map((p) => ({ tracking_no: formatTrackingNo(clip(p.tracking_no, 30)), order_id: clip(p.order_id, 40) }))
    .filter((p) => /^\d{4}-\d{4}-\d{4}$/.test(p.tracking_no) && /^[0-9a-f-]{36}$/i.test(p.order_id));
  if (pairs.length === 0) return { ok: false, message: "연결된 송장이 없습니다.", rows: [] };
  if (pairs.length > 1000) return { ok: false, message: "연결 수가 너무 많습니다.", rows: [] };

  const byOrder = new Map<string, string[]>();
  for (const p of pairs) {
    const list = byOrder.get(p.order_id) ?? [];
    if (!list.includes(p.tracking_no)) list.push(p.tracking_no);
    byOrder.set(p.order_id, list);
  }

  const supabase = db();
  const rows: ConfirmResultRow[] = [];
  const now = new Date().toISOString();

  for (const [orderId, trackings] of byOrder) {
    const { data: order } = await supabase
      .from("orders").select("id,order_no,status,email,shipping_address").eq("id", orderId).maybeSingle();
    if (!order) { rows.push({ order_no: orderId, trackings, result: "error", mailed: false, message: "주문을 찾을 수 없음" }); continue; }
    const o = order as { id: string; order_no: string; status: string; email: string | null; shipping_address: Addr };
    if (!LINKABLE.includes(o.status)) {
      rows.push({ order_no: o.order_no, trackings, result: "skip", mailed: false, message: `연결 불가 상태(${o.status})` });
      continue;
    }

    const { data: shipData, error: shipErr } = await supabase
      .from("shipment").select("id,tracking_no,notified_at,shipped_at").eq("order_id", orderId).order("created_at");
    if (shipErr) { rows.push({ order_no: o.order_no, trackings, result: "error", mailed: false, message: shipErr.message }); continue; }
    const ships = (shipData ?? []) as (ShipRow & { shipped_at: string | null })[];
    const have = new Set(ships.map((s) => s.tracking_no).filter(Boolean) as string[]);
    const blanks = ships.filter((s) => !s.tracking_no);
    let failed = "";

    for (const tn of trackings) {
      if (have.has(tn)) continue;
      const blank = blanks.shift();
      const res = blank
        ? await supabase.from("shipment").update({ tracking_no: tn, carrier: "lotte", status: "shipped", shipped_at: blank.shipped_at ?? now }).eq("id", blank.id)
        : await supabase.from("shipment").insert({ order_id: orderId, carrier: "lotte", tracking_no: tn, status: "shipped", shipped_at: now });
      if (res.error) { failed = res.error.message; break; }
      have.add(tn);
    }
    if (failed) { rows.push({ order_no: o.order_no, trackings, result: "error", mailed: false, message: `운송장 저장 실패: ${failed}` }); continue; }

    if (OPEN_STATUSES.includes(o.status)) {
      const { error } = await supabase.from("orders").update({ status: "shipped" }).eq("id", orderId).in("status", OPEN_STATUSES);
      if (error) { rows.push({ order_no: o.order_no, trackings, result: "error", mailed: false, message: `상태 변경 실패: ${error.message}` }); continue; }
    }

    const alreadyNotified = ships.some((s) => !!s.notified_at);
    const allTrackings = Array.from(have);
    let mailed = false;
    let message = alreadyNotified ? "운송장 저장 (이미 안내된 주문이라 메일 생략)" : "운송장 저장";
    if (!alreadyNotified) {
      if (!input.sendMail) {
        await supabase.from("shipment").update({ notified_at: now }).eq("order_id", orderId);
        message = "운송장 저장 (메일 발송 안 함)";
      } else if (!o.email) {
        message = "운송장 저장 (고객 이메일 없음, 메일 미발송)";
      } else {
        const name = o.shipping_address?.recipient;
        const r = await sendEmail(
          o.email,
          `[MTSPACE COFFEE] 주문 ${o.order_no} 출고 안내 (운송장 ${allTrackings[0]}${allTrackings.length > 1 ? ` 외 ${allTrackings.length - 1}건` : ""})`,
          shipNotificationHtml(o.order_no, name, allTrackings),
        );
        if (r.sent) {
          await supabase.from("shipment").update({ notified_at: now }).eq("order_id", orderId);
          mailed = true;
          message = "운송장 저장, 메일 발송";
        } else {
          message = `운송장 저장, 메일 실패(${r.reason ?? "unknown"}). 다시 올리면 재시도됩니다`;
        }
      }
    }
    rows.push({ order_no: o.order_no, trackings: allTrackings, result: "ok", mailed, message });
  }

  revalidatePath("/admin/orders");
  revalidatePath("/admin/orders/tracking");
  return { ok: true, rows };
}
