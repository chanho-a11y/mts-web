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

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (prof?.role !== "admin") return new NextResponse("Forbidden", { status: 403 });

  const { data: orders } = await supabase
    .from("orders")
    .select(`id,order_no,email,phone,customer_type,status,shipping_address,items_subtotal,discount_total,
      tip_amount,shipping_fee,tax_amount,grand_total,currency,coupon_code,note,channel,placed_at,paid_at,
      order_item(sku,title_snapshot,unit_price,qty,line_total),
      payment(method,provider,pg_tid,capture_id,status,amount),
      shipment(status,shipped_at,tracking_no)`)
    .order("placed_at", { ascending: false });

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
  const fname = `orders_export_${new Date().toISOString().slice(0, 10)}.csv`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fname}"`,
    },
  });
}
