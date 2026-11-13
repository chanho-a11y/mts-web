// D-166 문의함 공통: 상태 라벨, 유형 라벨, 신규 문의 메일 알림.
import { sendEmail, emailLayout } from "@/lib/email";

export const INQUIRY_STATUSES = ["new", "replied", "hold", "closed", "duplicate"] as const;
export type InquiryStatus = (typeof INQUIRY_STATUSES)[number];

export const STATUS_LABEL: Record<InquiryStatus, string> = {
  new: "신규",
  replied: "회신완료",
  hold: "보류",
  closed: "종료(미회신)",
  duplicate: "중복",
};

export const TYPE_LABEL: Record<string, string> = {
  general: "일반",
  wholesale: "납품",
  consulting: "컨설팅",
  education: "교육",
  product: "제품",
  tax_invoice: "세금계산서",
};

export function isInquiryStatus(v: string): v is InquiryStatus {
  return (INQUIRY_STATUSES as readonly string[]).includes(v);
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** 신규 문의를 대표 메일로 알린다. 실패해도 접수 자체는 막지 않는다. */
export async function notifyNewInquiry(m: {
  name?: string | null;
  email: string;
  phone?: string | null;
  type?: string | null;
  message?: string | null;
}): Promise<void> {
  const to = process.env.CONTACT_NOTIFY_EMAIL || "chanho@mtspace.coffee";
  const typeLabel = TYPE_LABEL[m.type || "general"] || m.type || "일반";
  const rows = [
    ["유형", typeLabel],
    ["이름", m.name || "-"],
    ["이메일", m.email],
    ["연락처", m.phone || "-"],
  ]
    .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#888">${k}</td><td style="padding:4px 0">${esc(String(v))}</td></tr>`)
    .join("");
  const body = `<table style="font-size:14px;border-collapse:collapse">${rows}</table>
    <div style="margin-top:16px;padding:12px;background:#f5f2ec;border-radius:6px;font-size:14px;white-space:pre-wrap">${esc(m.message || "(내용 없음)")}</div>
    <p style="margin-top:16px"><a href="https://mtspace.coffee/admin/inquiries" style="display:inline-block;background:#1a1a1a;color:#fff;text-decoration:none;padding:10px 18px;border-radius:999px">문의함 열기</a></p>`;
  const subject = `[문의 접수] ${typeLabel} 문의 | ${(m.name || m.email).slice(0, 40)}`;
  try {
    await sendEmail(to, subject, emailLayout(`새 ${typeLabel} 문의가 접수되었습니다`, body));
  } catch {
    /* 알림 실패는 무시: 문의는 DB 와 관리자 문의함에 남아 있다 */
  }
}
