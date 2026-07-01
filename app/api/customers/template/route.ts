// 고객 임포트 양식 다운로드 — 첨부 customers_export.csv 와 동일 컬럼.
export const dynamic = "force-dynamic";

const HEADERS = [
  "Customer ID", "First Name", "Last Name", "Email", "Accepts Email Marketing",
  "Default Address Company", "Default Address Address1", "Default Address Address2",
  "Default Address City", "Default Address Province Code", "Default Address Country Code",
  "Default Address Zip", "Default Address Phone", "Phone", "Accepts SMS Marketing",
  "Total Spent", "Total Orders", "Note", "Tax Exempt", "Tags", "Accepts WhatsApp Marketing",
];

export async function GET() {
  const sample = ["", "길동", "홍", "hong@example.com", "no", "회사명", "주소1", "주소2", "서울시", "KR-11", "KR", "04524", "01000000000", "01000000000", "no", "0", "0", "", "no", "", "no"];
  const csv = "﻿" + HEADERS.join(",") + "\n" + sample.map((s) => (s.includes(",") ? `"${s}"` : s)).join(",") + "\n";
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="customers_import_template.csv"',
    },
  });
}
