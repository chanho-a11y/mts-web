import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { approveOrder } from "@/lib/payments-approve";
import { paypalToken, paypalCapture } from "@/lib/payments";

export const dynamic = "force-dynamic";
const sha256 = (s: string) => crypto.createHash("sha256").update(s, "utf8").digest("hex");

function db() {
  return hasServiceRole ? createAdminClient() : createClient();
}
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://mtspace.coffee";
// H-1: 테스트 모드는 프로덕션에서 절대 활성화되지 않도록 코드 레벨에서 차단.
// (env 가 실수로 prod 에 남아도 결제 우회 불가)
const TEST = process.env.PAYMENTS_TEST_MODE === "true" && process.env.NODE_ENV !== "production";

// 공통 승인 처리. provider별 검증 후 approveOrder.
async function handle(provider: string, q: URLSearchParams, body: Record<string, unknown>) {
  // 모바일 이니시스는 P_NEXT_URL 에 쿼리를 붙이지 않고 P_NOTI(가맹점 임의데이터)로 orderId 를 왕복시킨다.
  const orderId = String(q.get("oid") || body.oid || body.order_id || body.P_NOTI || "");
  const orderNo = String(q.get("order") || body.order || body.order_no || "");
  if (!orderId) return { ok: false, reason: "no_order", orderNo };

  // 테스트 모드: 키 없이 전체 플로우 검증용 (PAYMENTS_TEST_MODE=true)
  if (TEST) {
    const r = await approveOrder(db(), orderId, { provider, raw: { test: true } });
    return { ...r, orderNo: r.orderNo || orderNo };
  }

  if (provider === "paypal") {
    const ppId = String(q.get("token") || body.token || "");
    const token = await paypalToken();
    if (!token || !ppId) return { ok: false, reason: "paypal_unconfigured", orderNo };
    const cap = await paypalCapture(token, ppId);
    if (!cap.ok) return { ok: false, reason: "paypal_capture_failed", orderNo };
    // H-2: 캡처 금액(USD) 추출 → 주문 통화(USD) 정수와 대조
    const capVal = (cap.raw as { purchase_units?: { payments?: { captures?: { amount?: { value?: string } }[] } }[] } | null)
      ?.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value;
    const paidAmount = capVal != null ? Math.round(Number(capVal)) : null;
    const r = await approveOrder(db(), orderId, { provider, tid: ppId, captureId: cap.captureId, raw: cap.raw, paidAmount });
    return { ...r, orderNo: r.orderNo || orderNo };
  }

  if (provider === "inicis") {
    // 이니시스 표준결제: 인증창 → returnUrl(POST)로 resultCode/authToken/authUrl 수신 → authUrl 승인요청(서명) → 검증.
    const mid = process.env.INICIS_MID, signKey = process.env.INICIS_SIGNKEY;
    if (!mid || !signKey) return { ok: false, reason: "inicis_unconfigured", orderNo };

    // --- 모바일 표준결제 결과(P_*) --- : 인증결과 수신 → P_REQ_URL 로 승인요청(P_MID·P_TID) → 승인결과 검증
    if (body.P_STATUS !== undefined || body.P_TID !== undefined) {
      const st = String(body.P_STATUS ?? "");
      if (st !== "00") return { ok: false, reason: `inicis_m_auth_${st || "empty"}`, orderNo };
      const reqUrl = String(body.P_REQ_URL || "");
      const authTid = String(body.P_TID || "");
      if (!reqUrl || !authTid) return { ok: false, reason: "inicis_m_no_requrl", orderNo };
      // 보안: 승인요청 URL 은 이니시스 도메인만 허용
      let mHost = "";
      try { mHost = new URL(reqUrl).host; } catch { return { ok: false, reason: "inicis_m_bad_requrl", orderNo }; }
      if (!/(^|\.)inicis\.com$/.test(mHost)) return { ok: false, reason: "inicis_m_bad_requrl", orderNo };

      const apRes = await fetch(reqUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ P_MID: mid, P_TID: authTid }).toString(),
      });
      // 승인응답은 querystring 형식(P_CHARSET=utf8 요청 → utf8 수신)
      const apText = await apRes.text();
      const ap = Object.fromEntries(new URLSearchParams(apText)) as Record<string, string>;
      if (String(ap.P_STATUS ?? "") !== "00") {
        console.error(`[inicis-mobile-approve-failed] order=${orderNo} status=${ap.P_STATUS} msg=${ap.P_RMESG1}`);
        return { ok: false, reason: `inicis_m_approve_${ap.P_STATUS || "err"}`, orderNo };
      }
      // H-2: 승인금액(P_AMT) 대조는 approveOrder 가 수행(불일치 시 결제완료 전이 차단)
      const mPaid = ap.P_AMT != null ? Math.round(Number(ap.P_AMT)) : null;
      const mr = await approveOrder(db(), orderId, { provider, tid: String(ap.P_TID || authTid), raw: ap, paidAmount: mPaid });
      return { ...mr, orderNo: mr.orderNo || orderNo };
    }

    const resultCode = String(body.resultCode || "");
    const authToken = String(body.authToken || "");
    const authUrl = String(body.authUrl || "");
    if (resultCode !== "0000" || !authToken || !authUrl) return { ok: false, reason: "inicis_auth_failed", orderNo };
    // 보안: authUrl 은 이니시스 도메인만 허용
    let host = "";
    try { host = new URL(authUrl).host; } catch { return { ok: false, reason: "inicis_bad_authurl", orderNo }; }
    if (!/(^|\.)inicis\.com$/.test(host)) return { ok: false, reason: "inicis_bad_authurl", orderNo };
    const timestamp = Date.now().toString();
    const signature = sha256(`authToken=${authToken}&timestamp=${timestamp}`);
    const verification = sha256(`authToken=${authToken}&signKey=${signKey}&timestamp=${timestamp}`);
    const form = new URLSearchParams({ mid, authToken, timestamp, signature, verification, charset: "UTF-8", format: "JSON" });
    const res = await fetch(authUrl, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: form.toString() });
    const raw = await res.json().catch(() => null);
    if (!raw || String(raw.resultCode) !== "0000") return { ok: false, reason: "inicis_approve_failed", orderNo };
    // H-2: 이니시스 승인응답 TotPrice(KRW) 대조
    const totPrice = (raw as { TotPrice?: string | number }).TotPrice;
    const paidAmount = totPrice != null ? Math.round(Number(totPrice)) : null;
    const r = await approveOrder(db(), orderId, { provider, tid: String(raw.tid ?? ""), raw, paidAmount });
    return { ...r, orderNo: r.orderNo || orderNo };
  }

  return { ok: false, reason: "unknown_provider", orderNo };
}

// 브라우저 리턴(GET) → 결제완료 페이지로 리다이렉트
export async function GET(req: NextRequest, { params }: { params: { provider: string } }) {
  const q = req.nextUrl.searchParams;
  const r = await handle(params.provider, q, {});
  const url = new URL("/checkout/complete", SITE);
  if (r.orderNo) url.searchParams.set("order", r.orderNo);
  url.searchParams.set("paid", r.ok ? "1" : "0");
  return NextResponse.redirect(url);
}

// 서버 노티/웹훅(POST) → JSON
export async function POST(req: NextRequest, { params }: { params: { provider: string } }) {
  let body: Record<string, unknown> = {};
  try {
    const ct = req.headers.get("content-type") || "";
    if (ct.includes("application/json")) body = await req.json();
    else { const fd = await req.formData(); fd.forEach((v, k) => { body[k] = String(v); }); }
  } catch { body = {}; }
  const r = await handle(params.provider, req.nextUrl.searchParams, body);

  // 이니시스는 인증 결과를 returnUrl 로 브라우저 POST 한다(결제창 팝업 컨텍스트).
  // → 부모창을 결제완료 페이지로 이동시키는 HTML 응답.
  if (params.provider === "inicis") {
    const url = new URL("/checkout/complete", SITE);
    if (r.orderNo) url.searchParams.set("order", r.orderNo);
    url.searchParams.set("paid", r.ok ? "1" : "0");
    const target = JSON.stringify(url.toString());
    return new NextResponse(
      `<!doctype html><html><head><meta charset="utf-8"></head><body><script>try{(window.top||window).location.replace(${target});}catch(e){location.replace(${target});}</script></body></html>`,
      { headers: { "content-type": "text/html; charset=utf-8" } },
    );
  }

  return NextResponse.json({ received: true, provider: params.provider, ...r });
}
