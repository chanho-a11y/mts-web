// 이메일 발송 추상화 — 프로바이더는 환경변수로 결정(키 없으면 no-op).
// 지원: Resend(RESEND_API_KEY) · 범용 웹훅(EMAIL_WEBHOOK_URL) · (그 외 미설정 시 발송 생략)
// Gmail은 SMTP 릴레이를 웹훅으로 두거나 Resend로 보내는 것을 권장.

export interface SendResult { sent: boolean; provider?: string; reason?: string }

const FROM = process.env.EMAIL_FROM || "MTSPACE COFFEE <hello@mtspace.coffee>";

export async function sendEmail(to: string, subject: string, html: string): Promise<SendResult> {
  if (!to) return { sent: false, reason: "no_recipient" };

  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: FROM, to: [to], subject, html }),
      });
      return res.ok ? { sent: true, provider: "resend" } : { sent: false, provider: "resend", reason: `http_${res.status}` };
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

// 템플릿: 출고 알림
export function shipNotificationHtml(orderNo: string, name?: string): string {
  return emailLayout(
    "주문이 출고되었습니다 🚚",
    `<p>${name ? name + "님, " : ""}주문하신 상품(<b>${orderNo}</b>)이 출고되었습니다.</p>
     <p>가평 로스터리에서 갓 로스팅한 신선한 원두가 배송 중입니다. 받으신 후 밀폐 보관하시고 2~3주 내 즐겨주세요.</p>
     <p style="margin-top:16px"><a href="https://mtspace.coffee/account/orders" style="display:inline-block;background:#1a1a1a;color:#fff;text-decoration:none;padding:10px 18px;border-radius:999px">주문 내역 보기</a></p>`,
  );
}
