// 이메일 발송 추상화 — 프로바이더는 환경변수로 결정(키 없으면 no-op).
// 지원: Resend(RESEND_API_KEY), 범용 웹훅(EMAIL_WEBHOOK_URL). 그 외 미설정 시 발송 생략.
import { trackingUrl, carrierLabel } from "@/lib/tracking";

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

  // D-160: Gmail SMTP(nodemailer) 경로 제거. 운영 환경에는 GMAIL_APP_PASSWORD 가 없어 항상 Resend 로 나가고 있었다.
  // nodemailer 는 쓰이지 않으면서 취약점(high)만 안고 있었다. Gmail 이 다시 필요하면 Resend 도메인 발신으로 대체한다.
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

// HTML 이스케이프(고객 입력값을 메일에 넣을 때)
const escHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));

// 공통 레이아웃 래퍼 (D-174: lang="en" 이면 영문 푸터)
export function emailLayout(title: string, bodyHtml: string, lang: "ko" | "en" = "ko"): string {
  const footer = lang === "en"
    ? `MTSPACE COFFEE | hello@mtspace.coffee<br>everyday excellence`
    : `MTSPACE COFFEE · 경기도 가평 청평 로스터리 · hello@mtspace.coffee<br>everyday excellence`;
  return `<div style="font-family:-apple-system,'Helvetica Neue',sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
  <div style="padding:20px 0;border-bottom:2px solid #1a1a1a"><b style="letter-spacing:1px">MTSPACE COFFEE</b></div>
  <h1 style="font-size:20px;margin:24px 0 12px">${title}</h1>
  ${bodyHtml}
  <p style="margin-top:28px;font-size:12px;color:#888">${footer}</p>
</div>`;
}

// 템플릿: 결제완료(주문확인)
// D-174: 예상 출고일(lib/ship-date 규칙), 해외 배송 지연 안내, 영문판(해외 배송지 또는 영어 사이트 주문).
export interface OrderConfirmationOpts {
  lang?: "ko" | "en";
  intl?: boolean;
  /** 예상 출고일 표기 문자열(lang 에 맞춘 값). 없으면 출고일 블록을 생략한다. */
  shipDateLabel?: string;
}
export function orderConfirmationSubject(orderNo: string, lang: "ko" | "en" = "ko"): string {
  return lang === "en"
    ? `[MTSPACE COFFEE] Order confirmed (${orderNo})`
    : `[MTSPACE COFFEE] 주문이 완료되었습니다 (${orderNo})`;
}
export function orderConfirmationHtml(
  orderNo: string,
  name?: string,
  amount?: number,
  currency?: string,
  opts: OrderConfirmationOpts = {},
): string {
  const lang = opts.lang ?? "ko";
  const money =
    amount != null
      ? currency === "USD"
        ? `$${amount.toLocaleString("en-US")}`
        : `${amount.toLocaleString("ko-KR")}원`
      : "";
  const safeName = name ? escHtml(name) : "";
  const shipBox = opts.shipDateLabel
    ? `<div style="margin:18px 0;padding:14px 18px;background:#F6F1E7;border-radius:8px">
         <p style="margin:0 0 4px;font-size:13px;color:#3C352C">${lang === "en" ? "Estimated dispatch date" : "예상 출고일"}</p>
         <p style="margin:0;font-size:17px;font-weight:700">${escHtml(opts.shipDateLabel)}</p>
         <p style="margin:6px 0 0;font-size:12px;color:#888">${lang === "en"
           ? "If a public holiday falls in between, dispatch may be 1 day later, and up to 3 days later around the Lunar New Year (Seollal) and Chuseok holidays."
           : "공휴일이 끼면 1일, 설과 추석 연휴에는 최대 3일까지 출고가 늦어질 수 있습니다."}</p>
       </div>`
    : "";
  const intlNote = opts.intl
    ? `<p style="font-size:13px;color:#555">${lang === "en"
        ? "For international orders, delivery may take longer than the dispatch date suggests, depending on customs clearance and postal conditions in the destination country."
        : "해외 주문은 출고일과 별개로 통관과 현지 배송 사정에 따라 도착까지 더 오래 걸릴 수 있습니다."}</p>`
    : "";

  if (lang === "en") {
    return emailLayout(
      "Your order is confirmed",
      `<p>${safeName ? safeName + ", t" : "T"}hank you. Payment for your order (<b>${escHtml(orderNo)}</b>) has been completed.</p>
       ${money ? `<p style="margin:8px 0"><b>Total paid</b> ${money}</p>` : ""}
       ${shipBox}
       <p>Your beans are roasted at the MTSPACE COFFEE roastery. We will email you again with tracking details once your order ships.</p>
       ${intlNote}
       <p style="margin-top:16px"><a href="https://mtspace.coffee/account/orders" style="display:inline-block;background:#1a1a1a;color:#fff;text-decoration:none;padding:10px 18px;border-radius:999px">View my orders</a></p>`,
      "en",
    );
  }
  return emailLayout(
    "결제가 완료되었습니다 ✓",
    `<p>${safeName ? safeName + "님, " : ""}주문(<b>${escHtml(orderNo)}</b>) 결제가 정상적으로 완료되었습니다. 감사합니다.</p>
     ${money ? `<p style="margin:8px 0"><b>결제 금액</b> · ${money}</p>` : ""}
     ${shipBox}
     <p>원두는 MTSPACE COFFEE 로스터리에서 볶아 보내드립니다. 출고 시 별도 안내 메일을 드립니다.</p>
     ${intlNote}
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

// 템플릿: 출고 알림 (D-142: 롯데 송장 등록 시점에 1회 발송, 운송장번호와 배송조회 링크 포함)
export function shipNotificationSubject(orderNo: string, trackings: string[], lang: "ko" | "en" = "ko"): string {
  const first = trackings[0] ?? "";
  const more = trackings.length > 1 ? trackings.length - 1 : 0;
  return lang === "en"
    ? `[MTSPACE COFFEE] Order ${orderNo} has shipped (tracking ${first}${more ? ` +${more}` : ""})`
    : `[MTSPACE COFFEE] 주문 ${orderNo} 출고 안내 (운송장 ${first}${more ? ` 외 ${more}건` : ""})`;
}
export interface ShipNotificationOpts { lang?: "ko" | "en"; intl?: boolean }
export function shipNotificationHtml(orderNo: string, name?: string, trackings: string[] = [], opts: ShipNotificationOpts = {}): string {
  const en = opts.lang === "en";
  const rows = trackings.map((no) => `<tr>
      <td style="padding:10px 0;border-bottom:1px solid #E3DAC8;font-family:'IBM Plex Mono',Menlo,monospace;font-size:15px;letter-spacing:1px">${escHtml(no)}</td>
      <td style="padding:10px 0;border-bottom:1px solid #E3DAC8;text-align:right"><a href="${trackingUrl(no)}" style="display:inline-block;border:1px solid #1a1a1a;color:#1a1a1a;text-decoration:none;padding:6px 14px;border-radius:999px;font-size:13px">${en ? "Track" : "배송 조회"}</a></td>
    </tr>`).join("");
  // D-174: 운송사는 번호 형식으로 판별(EMS 13자리 영숫자, 그 외 롯데택배)
  const carrier = carrierLabel(trackings[0] ?? "", en ? "en" : "ko");
  const boxLabel = en
    ? `${carrier} tracking number${trackings.length > 1 ? `s (${trackings.length} boxes)` : ""}`
    : `${carrier} 운송장번호${trackings.length > 1 ? ` (${trackings.length}박스)` : ""}`;
  const box = trackings.length
    ? `<div style="margin:18px 0;padding:14px 18px;background:#F6F1E7;border-radius:8px">
         <p style="margin:0 0 4px;font-size:13px;color:#3C352C">${boxLabel}</p>
         <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse">${rows}</table>
       </div>`
    : "";
  const safeName = name ? escHtml(name) : "";
  if (en) {
    const intlNote = opts.intl
      ? `<p style="font-size:13px;color:#555">International deliveries may take longer depending on customs clearance and postal conditions in the destination country.</p>`
      : "";
    return emailLayout(
      "Your coffee is on its way",
      `<p>${safeName ? safeName + ", y" : "Y"}our order (<b>${escHtml(orderNo)}</b>) has been shipped via ${carrier}.</p>
       ${box}
       <p>These beans were roasted at the MTSPACE COFFEE roastery. Once they arrive, keep them in an airtight container and enjoy them within 2 to 3 weeks.</p>
       ${intlNote}
       <p style="font-size:13px;color:#888">Tracking updates appear after the carrier picks up the parcel, so they may not show on the day of dispatch.</p>
       <p style="margin-top:16px"><a href="https://mtspace.coffee/account/orders/${encodeURIComponent(orderNo)}" style="display:inline-block;background:#1a1a1a;color:#fff;text-decoration:none;padding:10px 18px;border-radius:999px">View my order</a></p>`,
      "en",
    );
  }
  return emailLayout(
    "주문하신 원두가 출고되었습니다",
    `<p>${safeName ? safeName + "님, " : ""}주문하신 상품(<b>${escHtml(orderNo)}</b>)을 ${carrier}로 보내드렸습니다.</p>
     ${box}
     <p>MTSPACE COFFEE 로스터리에서 로스팅한 원두입니다. 받으신 후 밀폐 보관하시고 2~3주 안에 즐겨 주세요.</p>
     <p style="font-size:13px;color:#888">배송 조회는 택배사 집하 처리 후 반영되어, 출고 당일에는 조회되지 않을 수 있습니다.</p>
     <p style="margin-top:16px"><a href="https://mtspace.coffee/account/orders/${encodeURIComponent(orderNo)}" style="display:inline-block;background:#1a1a1a;color:#fff;text-decoration:none;padding:10px 18px;border-radius:999px">주문 내역 보기</a></p>`,
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
