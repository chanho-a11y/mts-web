// D-142 롯데 파일접수용 엑셀 다운로드
// 기존 수기 양식(시트 '대한통운', 16열)과 열 구성과 순서를 그대로 맞춘다. 품목 1개가 1행.
// 롯데는 '상품명' 이하 열만 읽는다. C열(주문번호)은 참고용으로만 채운다.
// 박스 분할(수령자명 뒤 번호 등)은 내려받은 파일에서 대표가 직접 수정한다.
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/server";
import { LOTTE_UPLOAD_HEADERS, LOTTE_UPLOAD_SHEET } from "@/lib/lotte";

export const dynamic = "force-dynamic";

type Addr = { recipient?: string; phone?: string; zipcode?: string; addr1?: string; addr2?: string } | null;
type Row = {
  id: string; order_no: string; status: string; phone: string | null; placed_at: string; profile_id: string | null;
  shipping_address: Addr;
  order_item: { title_snapshot: string | null; qty: number; cancelled_qty: number | null }[] | null;
};

const ALLOWED = ["paid", "preparing", "shipped", "in_transit"];

export async function GET(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (prof?.role !== "admin") return new NextResponse("Forbidden", { status: 403 });

  const ids = (new URL(req.url).searchParams.get("ids") ?? "")
    .split(",").map((s) => s.trim()).filter((s) => /^[0-9a-f-]{36}$/i.test(s)).slice(0, 300);
  if (ids.length === 0) return new NextResponse("주문을 선택해 주세요.", { status: 400 });

  const { data, error } = await supabase
    .from("orders")
    .select("id,order_no,status,phone,placed_at,profile_id,shipping_address,order_item(title_snapshot,qty,cancelled_qty)")
    .in("id", ids).in("status", ALLOWED).order("placed_at");
  if (error) return new NextResponse(error.message, { status: 500 });
  const orders = (data ?? []) as unknown as Row[];

  const pids = Array.from(new Set(orders.map((o) => o.profile_id).filter((x): x is string => !!x)));
  const [profs, bizs] = pids.length
    ? await Promise.all([
        supabase.from("profiles").select("id,name,phone").in("id", pids),
        supabase.from("business_accounts").select("profile_id,company_name,contact_phone").in("profile_id", pids),
      ])
    : [{ data: [] }, { data: [] }];
  const P = new Map(((profs.data ?? []) as { id: string; name: string | null; phone: string | null }[]).map((p) => [p.id, p]));
  const B = new Map(((bizs.data ?? []) as { profile_id: string; company_name: string | null; contact_phone: string | null }[]).map((b) => [b.profile_id, b]));

  const aoa: (string | number)[][] = [[...LOTTE_UPLOAD_HEADERS]];
  for (const o of orders) {
    const a = o.shipping_address ?? {};
    const p = o.profile_id ? P.get(o.profile_id) : undefined;
    const b = o.profile_id ? B.get(o.profile_id) : undefined;
    const recvPhone = a.phone || o.phone || "";
    const ordererName = b?.company_name || p?.name || a.recipient || "";
    const ordererPhone = b?.contact_phone || p?.phone || recvPhone;
    const address = [a.addr1, a.addr2].filter(Boolean).join(" ");
    for (const it of o.order_item ?? []) {
      const qty = it.qty - (it.cancelled_qty ?? 0);
      if (qty <= 0) continue;
      aoa.push([
        "", "", o.order_no, "", "", "", it.title_snapshot ?? "", "", qty,
        ordererName, ordererPhone, a.recipient ?? "", recvPhone, a.zipcode ?? "", address, "",
      ]);
    }
  }
  if (aoa.length === 1) return new NextResponse("접수할 품목이 없습니다. (결제완료 이후 주문만 가능)", { status: 400 });

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  // 우편번호, 연락처는 앞자리 0 보존을 위해 문자열 셀로 고정
  for (let r = 1; r < aoa.length; r++) {
    for (const c of [10, 12, 13]) {
      const ref = XLSX.utils.encode_cell({ r, c });
      if (ws[ref]) { ws[ref].t = "s"; ws[ref].z = "@"; }
    }
  }
  ws["!cols"] = [6, 6, 16, 2, 8, 8, 28, 8, 5, 14, 14, 12, 14, 8, 48, 16].map((wch) => ({ wch }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, LOTTE_UPLOAD_SHEET);
  const buf: Buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const d = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()).replace(/-/g, "");
  const fname = `롯데접수_${d}.xlsx`;
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="lotte_${d}.xlsx"; filename*=UTF-8''${encodeURIComponent(fname)}`,
      "Cache-Control": "no-store",
    },
  });
}
