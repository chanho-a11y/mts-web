import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// 첨부된 Shopify 주문 export 와 동일한 75열 CSV 양식.
const HEADERS = [
  "Name","Email","Financial Status","Paid at","Fulfillment Status","Fulfilled at","Accepts Marketing","Currency",
  "Subtotal","Shipping","Taxes","Total","Discount Code","Discount Amount","Shipping Method","Created at",
  "Lineitem quantity","Lineitem name","Lineitem price","Lineitem compare at price","Lineitem sku",
  "Lineitem requires shipping","Lineitem taxable","Lineitem fulfillment status",
  "Billing Name","Billing Street","Billing Address1","Billing Address2","Billing Company","Billing City",
  "Billing Zip","Billing Province","Billing Country","Billing Phone",
  "Shipping Name","Shipping Street","Shipping Address1","Shipping Address2","Shipping Company","Shipping City",
  "Shipping Zip","Shipping Province","Shipping Country","Shipping Phone",
  "Notes","Note Attributes","Cancelled at","Payment Method","Payment Reference","Refunded Amount","Vendor","Id",
  "Tags","Risk Level","Source","Lineitem discount",
  "Tax 1 Name","Tax 1 Value","Tax 2 Name","Tax 2 Value","Tax 3 Name","Tax 3 Value","Tax 4 Name","Tax 4 Value",
  "Tax 5 Name","Tax 5 Value","Phone","Receipt Number","Duties","Billing Province Name","Shipping Province Name",
  "Payment ID","Payment Terms Name","Next Payment Due At","Payment References",
] as const;

type Row = Record<string, string | number>;

function esc(v: string | number | null | undefined): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// ISO → "YYYY-MM-DD HH:mm:ss +0900" (KST)
function kst(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).formatToParts(d).reduce<Record<string, string>>((a, x) => (a[x.type] = x.value, a), {});
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second} +0900`;
}

// 기간 정규화 — 최대 62일. 잘못된 값이면 최근 30일. (orders 페이지 resolveRange와 동일 규칙)
const DAY = 86400000, MAX_DAYS = 62;
const fmt = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
function valid(s: string | null): s is string { return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(new Date(s + "T00:00:00+09:00").getTime()); }
function resolveRange(fromRaw: string | null, toRaw: string | null): { from: string; to: string } {
  let to = valid(toRaw) ? toRaw : fmt(new Date());
  let from = valid(fromRaw) ? fromRaw : fmt(new Date(Date.now() - 29 * DAY));
  if (from > to) [from, to] = [to, from];
  const span = Math.round((new Date(to + "T00:00:00+09:00").getTime() - new Date(from + "T00:00:00+09:00").getTime()) / DAY);
  if (span > MAX_DAYS - 1) from = fmt(new Date(new Date(to + "T00:00:00+09:00").getTime() - (MAX_DAYS - 1) * DAY));
  return { from, to };
}

export async function GET(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (prof?.role !== "admin") return new NextResponse("Forbidden", { status: 403 });

  const url = new URL(req.url);
  const { from, to } = resolveRange(url.searchParams.get("from"), url.searchParams.get("to"));
  const fromIso = `${from}T00:00:00+09:00`;
  const toIso = `${to}T23:59:59.999+09:00`;
  // 기본은 결제 완료 건만 export. 결제창 진입 후 이탈한 'created' 주문이 섞여
  // 동일 고객·동일 장바구니가 여러 건으로 보이던 문제를 차단한다.
  // 미결제 포함이 필요하면 ?view=all (주문 관리 화면의 '미결제 포함' 보기와 동일 규칙).
  const includeUnpaid = url.searchParams.get("view") === "all";

  let q = supabase
    .from("orders")
    .select(`id,order_no,email,phone,customer_type,status,shipping_address,items_subtotal,discount_total,
      tip_amount,shipping_fee,tax_amount,grand_total,currency,coupon_code,note,channel,placed_at,paid_at,
      order_item(sku,title_snapshot,unit_price,qty,line_total),
      payment(method,provider,pg_tid,capture_id,status,amount),
      shipment(status,shipped_at,tracking_no)`)
    .gte("placed_at", fromIso)
    .lte("placed_at", toIso);
  // paid_at 기준 — 결제 후 환불/부분환불 건도 회계상 필요하므로 포함되고,
  // 결제 전 취소·이탈 건은 paid_at 이 null 이라 제외된다.
  if (!includeUnpaid) q = q.not("paid_at", "is", null);
  const { data: orders } = await q.order("placed_at", { ascending: false });

  const lines: string[] = [HEADERS.join(",")];

  for (const o of orders ?? []) {
    const addr = (o.shipping_address ?? {}) as Record<string, string>;
    const name = (o.order_no ?? "").startsWith("#") ? o.order_no : `#${o.order_no ?? ""}`;
    const pay = (o.payment ?? [])[0] as Record<string, string> | undefined;
    const ship = (o.shipment ?? [])[0] as Record<string, string> | undefined;
    const items = (o.order_item ?? []) as Record<string, string | number>[];
    const paid = !!o.paid_at || pay?.status === "captured" || pay?.status === "paid";
    const fulfilled = !!ship?.shipped_at || o.status === "fulfilled";

    const street = [addr.addr1, addr.addr2].filter(Boolean).join(", ");

    items.forEach((it, idx) => {
      const row: Row = Object.fromEntries(HEADERS.map((h) => [h, ""]));
      // 라인아이템 공통 (모든 행)
      row["Name"] = name;
      row["Created at"] = kst(o.placed_at as string);
      row["Lineitem quantity"] = it.qty ?? "";
      row["Lineitem name"] = it.title_snapshot ?? "";
      row["Lineitem price"] = it.unit_price ?? "";
      row["Lineitem sku"] = it.sku ?? "";
      row["Lineitem requires shipping"] = "true";
      row["Lineitem taxable"] = "true";
      row["Lineitem fulfillment status"] = fulfilled ? "fulfilled" : "";
      row["Lineitem discount"] = 0;
      row["Vendor"] = "MTSPACE COFFEE";
      row["Phone"] = o.phone ?? "";

      if (idx === 0) {
        // 주문 대표 행: 주문 레벨 필드 전부
        row["Email"] = o.email ?? "";
        row["Financial Status"] = paid ? "paid" : "pending";
        row["Paid at"] = kst(o.paid_at as string);
        row["Fulfillment Status"] = fulfilled ? "fulfilled" : "unfulfilled";
        row["Fulfilled at"] = kst(ship?.shipped_at);
        row["Accepts Marketing"] = "no";
        row["Currency"] = o.currency ?? "KRW";
        row["Subtotal"] = o.items_subtotal ?? "";
        row["Shipping"] = o.shipping_fee ?? "";
        row["Taxes"] = o.tax_amount ?? "";
        row["Total"] = o.grand_total ?? "";
        row["Discount Code"] = o.coupon_code ?? "";
        row["Discount Amount"] = o.discount_total ?? "";
        row["Billing Name"] = addr.recipient ?? "";
        row["Billing Street"] = street;
        row["Billing Address1"] = addr.addr1 ?? "";
        row["Billing Address2"] = addr.addr2 ?? "";
        row["Billing Zip"] = addr.zipcode ? `'${addr.zipcode}` : "";
        row["Billing Country"] = addr.country ?? "KR";
        row["Billing Phone"] = addr.phone ?? o.phone ?? "";
        row["Shipping Name"] = addr.recipient ?? "";
        row["Shipping Street"] = street;
        row["Shipping Address1"] = addr.addr1 ?? "";
        row["Shipping Address2"] = addr.addr2 ?? "";
        row["Shipping Zip"] = addr.zipcode ? `'${addr.zipcode}` : "";
        row["Shipping Country"] = addr.country ?? "KR";
        row["Shipping Phone"] = addr.phone ?? o.phone ?? "";
        row["Notes"] = o.note ?? "";
        row["Payment Method"] = pay?.method ?? pay?.provider ?? "";
        row["Payment Reference"] = pay?.pg_tid ?? pay?.capture_id ?? "";
        row["Refunded Amount"] = 0;
        row["Id"] = o.id as string;
        row["Risk Level"] = "Low";
        row["Source"] = o.channel ?? "web";
        row["Tax 1 Name"] = o.tax_amount ? "VAT 10%" : "";
        row["Tax 1 Value"] = o.tax_amount ?? "";
        row["Payment ID"] = pay?.pg_tid ?? "";
        row["Payment References"] = pay?.pg_tid ?? "";
      }
      lines.push(HEADERS.map((h) => esc(row[h])).join(","));
    });
  }

  // UTF-8 BOM 추가 — Excel 한글 깨짐 방지
  const csv = "﻿" + lines.join("\r\n");
  const fname = `orders_export_${includeUnpaid ? "all_" : "paid_"}${from}_to_${to}.csv`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fname}"`,
    },
  });
}
