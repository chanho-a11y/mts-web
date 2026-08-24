// 이메일 발송 추상화 — 프로바이더는 환경변수로 결정(키 없으면 no-op).
// 지원: Resend(RESEND_API_KEY) · 범용 웹훅(EMAIL_WEBHOOK_URL) · (그 외 미설정 시 발송 생략)
// Gmail은 SMTP 릴레이를 웹훅으로 두거나 Resend로 보내는 것을 권장.

export interface SendResult {
  sent: boolean;
  provider?: string;
  reason?: string;
  /** 프로바이더가 준 메시지 ID. Resend 웹훅(오픈·클릭)과 발송 로그를 잇는 열쇠. */
  messageId?: string;
}

const GMAIL_USER = process.env.GMAIL_USER || "chanho@mtspace.coffee";
const FROM = process.env.EMAIL_FROM || `MTSPACE COFFEE <${GMAIL_USER}>`;

export async function sendEmail(to: string, subject: string, html: string): Promise<SendResult> {
  if (!to) return { sent: false, reason: "no_recipient" };

  // 1순위: Gmail SMTP (앱 비밀번호) — chanho@mtspace.coffee 발송
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  if (gmailPass) {
    try {
      const nodemailer = (await import("nodemailer")).default;
      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com", port: 465, secure: true,
        auth: { user: GMAIL_USER, pass: gmailPass.replace(/\s+/g, "") },
      });
      const info = await transporter.sendMail({ from: FROM, to, subject, html });
      return { sent: true, provider: "gmail", messageId: (info as { messageId?: string })?.messageId };
    } catch (e) {
      // Gmail 실패 시 다음 프로바이더(Resend·webhook)로 폴백한다.
      console.warn("[email] gmail failed, falling back:", (e as Error)?.message?.slice(0, 120) || "smtp_error");
    }
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: FROM, to: [to], subject, html }),
      });
      if (!res.ok) return { sent: false, provider: "resend", reason: `http_${res.status}` };
      // 응답 body 의 id 를 흘려보내면 웹훅 이벤트를 발송 로그에 붙일 수 있다.
      const j = (await res.json().catch(() => null)) as { id?: string } | null;
      return { sent: true, provider: "resend", messageId: j?.id };
    } catch (e) {
      return { sent: false, provider: "resend", reason: "fetch_error" };
    }
  }

  const webhook = process.env.EMAIL_WEBHOOK_URL;
  if (webhook) {
    try {
      const res = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: FROM, to, subject, html }),
      });
      return res.ok ? { sent: true, provider: "webhook" } : { sent: false, provider: "webhook", reason: `http_${res.status}` };
    } catch {
      return { sent: false, provider: "webhook", reason: "fetch_error" };
    }
  }

  return { sent: false, reason: "no_provider" };
}

// 공통 레이아웃 래퍼
export function emailLayout(title: string, bodyHtml: string): string {
  return `<div style="font-family:-apple-system,'Helvetica Neue',sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
  <div style="padding:20px 0;border-bottom:2px solid #1a1a1a"><b style="letter-spacing:1px">MTSPACE COFFEE</b></div>
  <h1 style="font-size:20px;margin:24px 0 12px">${title}</h1>
  ${bodyHtml}
  <p style="margin-top:28px;font-size:12px;color:#888">MTSPACE COFFEE · 경기도 가평 청평 로스터리 · hello@mtspace.coffee<br>everyday excellence</p>
</div>`;
}

// 템플릿: 결제완료(주문확인)
export function orderConfirmationHtml(orderNo: string, name?: string, amount?: number, currency?: string): string {
  const money =
    amount != null
      ? currency === "USD"
        ? `$${amount.toLocaleString("en-US")}`
        : `${amount.toLocaleString("ko-KR")}원`
      : "";
  return emailLayout(
    "결제가 완료되었습니다 ✓",
    `<p>${name ? name + "님, " : ""}주문(<b>${orderNo}</b>) 결제가 정상적으로 완료되었습니다. 감사합니다.</p>
     ${money ? `<p style="margin:8px 0"><b>결제 금액</b> · ${money}</p>` : ""}
     <p>원두는 <b>매주 월·화 로스팅, 화·수 출고</b> 일정에 맞춰 가평 로스터리에서 갓 볶아 보내드립니다. 출고 시 별도 안내 메일을 드립니다.</p>
     <p style="margin-top:16px"><a href="https://mtspace.coffee/account/orders" style="display:inline-block;background:#1a1a1a;color:#fff;text-decoration:none;padding:10px 18px;border-radius:999px">주문 내역 보기</a></p>`,
  );
}

// 템플릿: 관리자 새 주문 접수 알림 (내부용 — chanho@mtspace.coffee 등)
export interface AdminNotifyOrder {
  order_no: string;
  email?: string | null;
  grand_total?: number | null;
  currency?: string | null;
  shipping?: { recipient?: string; phone?: string; zipcode?: string; addr1?: string; addr2?: string; country?: string; shipping_label?: string } | null;
  items?: { title_snapshot?: string | null; sku?: string | null; qty?: number | null; line_total?: number | null }[];
}
export function orderAdminNotifyHtml(o: AdminNotifyOrder): string {
  const money = (n?: number | null) =>
    n == null ? "" : o.currency === "USD" ? `$${n.toLocaleString("en-US")}` : `${n.toLocaleString("ko-KR")}원`;
  const rows = (o.items ?? [])
    .map((it) =>
      `<tr><td style="padding:6px 0;border-bottom:1px solid #eee">${it.title_snapshot ?? it.sku ?? "-"} <span style="color:#999">× ${it.qty ?? 1}</span></td><td style="padding:6px 0;border-bottom:1px solid #eee;text-align:right">${money(it.line_total)}</td></tr>`,
    )
    .join("");
  const s = o.shipping ?? {};
  const addr = [s.zipcode ? `(${s.zipcode})` : "", s.addr1 ?? "", s.addr2 ?? ""].filter(Boolean).join(" ");
  const intl = s.country && s.country !== "KR" ? `${s.country} ` : "";
  return emailLayout(
    "새 주문이 접수되었습니다",
    `<p style="margin:4px 0"><b>주문번호</b> ${o.order_no}</p>
     <p style="margin:4px 0"><b>결제금액</b> ${money(o.grand_total)}</p>
     <table style="width:100%;border-collapse:collapse;margin:12px 0">${rows}</table>
     <p style="margin:4px 0"><b>주문자</b> ${s.recipient ?? "-"} · ${o.email ?? "-"} · ${s.phone ?? "-"}</p>
     <p style="margin:4px 0"><b>배송지</b> ${intl}${addr || "-"}${s.shipping_label ? ` · ${s.shipping_label}` : ""}</p>
     <p style="margin-top:16px"><a href="https://mtspace.coffee/admin/orders" style="display:inline-block;background:#1a1a1a;color:#fff;text-decoration:none;padding:10px 18px;border-radius:999px">관리자 주문 보기</a></p>`,
  );
}

// 템플릿: 출고 알림
export function shipNotificationHtml(orderNo: string, name?: string): string {
  return emailLayout(
    "주문이 출고되었습니다 🚚",
    `<p>${name ? name + "님, " : ""}주문하신 상품(<b>${orderNo}</b>)이 출고되었습니다.</p>
     <p>가평 로스터리에서 갓 로스팅한 신선한 원두가 배송 중입니다. 받으신 후 밀폐 보관하시고 2~3주 내 즐겨주세요.</p>
     <p style="margin-top:16px"><a href="https://mtspace.coffee/account/orders" style="display:inline-block;background:#1a1a1a;color:#fff;text-decoration:none;padding:10px 18px;border-radius:999px">주문 내역 보기</a></p>`,
  );
}

// 템플릿: 비밀번호 재설정 인증코드 (6자리 코드 + 자동입력 링크 겸용)
export function passwordResetCodeHtml(code: string, link: string, name?: string, minutes = 10): string {
  return emailLayout(
    "비밀번호 재설정 인증코드",
    `<p>${name ? name + "님, " : ""}비밀번호 재설정을 요청하셨습니다. 아래 인증코드를 입력해 주세요.</p>
     <p style="margin:20px 0;padding:18px 0;text-align:center;background:#F6F1E7;border:1px solid #E3DAC8;border-radius:8px;font-family:'IBM Plex Mono',Menlo,monospace;font-size:30px;font-weight:700;letter-spacing:10px;color:#3C352C">${code}</p>
     <p style="text-align:center;margin:0 0 22px"><a href="${link}" style="display:inline-block;background:#1a1a1a;color:#fff;text-decoration:none;padding:10px 18px;border-radius:999px">비밀번호 재설정하기</a></p>
     <p style="font-size:13px;color:#888;line-height:1.7">· 인증코드는 <b>${minutes}분</b> 동안만 유효하며, 1회만 사용할 수 있습니다.<br>· 위 버튼을 누르면 인증코드가 자동 입력된 화면으로 이동합니다.<br>· 본인이 요청하지 않았다면 이 메일을 무시해 주세요. 비밀번호는 변경되지 않습니다.</p>`,
  );
}
