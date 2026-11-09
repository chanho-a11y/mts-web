import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { approveOrder } from "@/lib/payments-approve";
import { paypalToken, paypalCapture, tossConfirm } from "@/lib/payments";
import { logPaymentEvent } from "@/lib/payment-events";
import { resolveInicisApproveUrl } from "@/lib/inicis-idc";
import { classifyPaymentFail, type PaymentFailKind } from "@/lib/payment-fail";

export const dynamic = "force-dynamic";
const sha256 = (s: string) => crypto.createHash("sha256").update(s, "utf8").digest("hex");

function db() {
  return hasServiceRole ? createAdminClient() : createClient();
}
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://mtspace.coffee";
// H-1: 테스트 모드는 프로덕션에서 절대 활성화되지 않도록 코드 레벨에서 차단.
// (env 가 실수로 prod 에 남아도 결제 우회 불가)
const TEST = process.env.PAYMENTS_TEST_MODE === "true" && process.env.NODE_ENV !== "production";

// 모바일 이니시스는 P_NEXT_URL 에 쿼리를 붙이지 않고 P_NOTI(가맹점 임의데이터)로 orderId 를 왕복시킨다.
// handle() 과 이벤트 로깅이 같은 값을 봐야 하므로 한 곳에서 뽑는다(표현식은 기존과 동일).
function pickOrderId(q: URLSearchParams, body: Record<string, unknown>) {
  return String(q.get("oid") || body.oid || body.order_id || body.P_NOTI || "");
}

// D-163: 실패 응답에 PG 원문 메시지(pgMsg, 로그·payment_event 용)와 고객 안내 유형(fail, 완료 페이지 용)을 싣는다.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const clip = (v: unknown) => String(v ?? "").slice(0, 200);
function failOut(reason: string, orderNo: string, pgMsg: unknown) {
  const msg = clip(pgMsg);
  return { ok: false as const, reason, orderNo, pgMsg: msg || undefined, fail: classifyPaymentFail(msg) };
}
type FailExtra = { pgMsg?: string; fail?: PaymentFailKind | null };

// D-163: 모바일 이니시스는 복귀 URL 에 주문번호가 없어 로그에 order= 가 비어 찍혔다. orderId 로 주문번호를 찾아 채운다.
async function lookupOrderNo(orderId: string): Promise<string> {
  if (!UUID_RE.test(orderId)) return "";
  try {
    const { data } = await db().from("orders").select("order_no").eq("id", orderId).maybeSingle();
    return String((data as { order_no?: string } | null)?.order_no ?? "");
  } catch {
    return "";
  }
}

// 공통 승인 처리. provider별 검증 후 approveOrder.
async function handle(provider: string, q: URLSearchParams, body: Record<string, unknown>) {
  const orderId = pickOrderId(q, body);
  let orderNo = String(q.get("order") || body.order || body.order_no || "");
  if (!orderNo && orderId) orderNo = await lookupOrderNo(orderId);
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
      if (st !== "00") {
        // D-160: 인증 단계 실패 사유(P_RMESG1)를 남긴다. 이전엔 코드만 남아 해시 오류와 고객 취소를 구분할 수 없었다.
        console.error(`[inicis-mobile-auth-failed] order=${orderNo} status=${st} msg=${String(body.P_RMESG1 ?? "").slice(0, 200)}`);
        return failOut(`inicis_m_auth_${st || "empty"}`, orderNo, body.P_RMESG1);
      }
      const reqUrl = String(body.P_REQ_URL || "");
      const authTid = String(body.P_TID || "");
      if (!reqUrl || !authTid) return { ok: false, reason: "inicis_m_no_requrl", orderNo };
      // 보안(D-143): 승인요청은 idc_name 으로 고른 화이트리스트 URL 로만 보낸다(P_REQ_URL 은 대조용).
      const mIdc = resolveInicisApproveUrl("mobile", body.idc_name, reqUrl);
      if (!mIdc.ok) return { ok: false, reason: `inicis_m_idc_${mIdc.reason}`, orderNo };
      if (!mIdc.receivedMatches) console.warn(`[inicis-idc-url-diff] mobile order=${orderNo} idc=${mIdc.idc} received=${reqUrl}`);

      const apRes = await fetch(mIdc.url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ P_MID: mid, P_TID: authTid }).toString(),
      });
      // 승인응답은 querystring 형식(P_CHARSET=utf8 요청 → utf8 수신)
      const apText = await apRes.text();
      const ap = Object.fromEntries(new URLSearchParams(apText)) as Record<string, string>;
      if (String(ap.P_STATUS ?? "") !== "00") {
        console.error(`[inicis-mobile-approve-failed] order=${orderNo} status=${ap.P_STATUS} msg=${ap.P_RMESG1}`);
        return failOut(`inicis_m_approve_${ap.P_STATUS || "err"}`, orderNo, ap.P_RMESG1);
      }
      // H-2: 승인금액(P_AMT) 대조는 approveOrder 가 수행(불일치 시 결제완료 전이 차단)
      const mPaid = ap.P_AMT != null ? Math.round(Number(ap.P_AMT)) : null;
      const mr = await approveOrder(db(), orderId, { provider, tid: String(ap.P_TID || authTid), raw: ap, paidAmount: mPaid, pgOrderNo: ap.P_OID ?? null });
      return { ...mr, orderNo: mr.orderNo || orderNo };
    }

    const resultCode = String(body.resultCode || "");
    const authToken = String(body.authToken || "");
    const authUrl = String(body.authUrl || "");
    if (resultCode !== "0000" || !authToken || !authUrl) {
      // D-163: PC 인증 실패도 사유를 남긴다. 이전엔 조용히 반환돼 고객 취소와 카드 거절을 구분할 수 없었다.
      console.error(`[inicis-auth-failed] order=${orderNo} code=${resultCode || "empty"} msg=${clip(body.resultMsg)}`);
      return failOut("inicis_auth_failed", orderNo, body.resultMsg);
    }
    // 보안(D-143): 승인요청은 idc_name 으로 고른 화이트리스트 URL 로만 보낸다(authUrl 은 대조용).
    const pIdc = resolveInicisApproveUrl("pc", body.idc_name, authUrl);
    if (!pIdc.ok) return { ok: false, reason: `inicis_idc_${pIdc.reason}`, orderNo };
    if (!pIdc.receivedMatches) console.warn(`[inicis-idc-url-diff] pc order=${orderNo} idc=${pIdc.idc} received=${authUrl}`);
    const timestamp = Date.now().toString();
    const signature = sha256(`authToken=${authToken}&timestamp=${timestamp}`);
    const verification = sha256(`authToken=${authToken}&signKey=${signKey}&timestamp=${timestamp}`);
    const form = new URLSearchParams({ mid, authToken, timestamp, signature, verification, charset: "UTF-8", format: "JSON" });
    const res = await fetch(pIdc.url, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: form.toString() });
    const raw = await res.json().catch(() => null);
    if (!raw || String(raw.resultCode) !== "0000") {
      // D-163: PC 승인 거절 사유(한도 초과 등)를 남긴다. 2026-11-09 김용민님 건이 이 경로에서 사유 없이 실패했다.
      const rc = raw ? String((raw as { resultCode?: unknown }).resultCode ?? "") : `http_${res.status}`;
      const rm = raw ? (raw as { resultMsg?: unknown }).resultMsg : "no_json";
      console.error(`[inicis-approve-failed] order=${orderNo} code=${rc} msg=${clip(rm)}`);
      return failOut("inicis_approve_failed", orderNo, rm);
    }
    // H-2: 이니시스 승인응답 TotPrice(KRW) 대조
    const totPrice = (raw as { TotPrice?: string | number }).TotPrice;
    const paidAmount = totPrice != null ? Math.round(Number(totPrice)) : null;
    const r = await approveOrder(db(), orderId, { provider, tid: String(raw.tid ?? ""), raw, paidAmount, pgOrderNo: (raw as { MOID?: string }).MOID ?? null });
    return { ...r, orderNo: r.orderNo || orderNo };
  }

  if (provider === "toss") {
    // D-161 토스페이먼츠. successUrl/failUrl 둘 다 GET 으로 돌아온다(쿼리: paymentKey·orderId·amount / code·message·orderId).
    if (q.get("fail")) {
      const code = String(q.get("code") || "unknown").replace(/[^A-Z0-9_]/gi, "").slice(0, 60);
      console.warn(`[toss-fail] order=${orderNo} code=${code} msg=${String(q.get("message") || "").slice(0, 200)}`);
      return failOut(`toss_fail_${code}`, orderNo, `${code} ${q.get("message") || ""}`);
    }
    if (!process.env.TOSS_SECRET_KEY) return { ok: false, reason: "toss_unconfigured", orderNo };
    const paymentKey = String(q.get("paymentKey") || "");
    const tossOrderId = String(q.get("orderId") || "");
    const amount = Number(q.get("amount"));
    if (!paymentKey || !tossOrderId || !Number.isFinite(amount)) return { ok: false, reason: "toss_bad_return", orderNo };

    // 승인 전 대조(fail-closed): 토스 문서 권고대로 successUrl 의 amount 가 우리가 요청한 금액인지 먼저 확인한다.
    // 다르면 confirm 을 호출하지 않으므로 고객 카드에 잘못된 금액이 청구되지 않는다.
    const { data: od } = await db().from("orders").select("order_no,grand_total,currency,status").eq("id", orderId).maybeSingle();
    if (!od) return { ok: false, reason: "order_not_found", orderNo };
    if (tossOrderId !== od.order_no) return { ok: false, reason: "toss_order_mismatch", orderNo: od.order_no };
    // 새로고침 등으로 같은 successUrl 이 다시 열려도 이미 결제완료면 승인을 재요청하지 않는다.
    if (["paid", "preparing", "shipped", "in_transit", "delivered"].includes(od.status)) return { ok: true, already: true, orderNo: od.order_no };
    if (od.currency !== "KRW" || Math.round(amount) !== Math.round(Number(od.grand_total))) {
      console.error(`[toss-amount-mismatch-before-confirm] order=${od.order_no} expected=${od.grand_total} got=${amount}`);
      return { ok: false, reason: "amount_mismatch", orderNo: od.order_no };
    }

    const c = await tossConfirm(paymentKey, od.order_no, Math.round(amount));
    if (!c.ok) {
      console.error(`[toss-confirm-failed] order=${od.order_no} code=${c.code} msg=${String(c.message ?? "").slice(0, 200)}`);
      return failOut(`toss_confirm_${String(c.code ?? "err").slice(0, 60)}`, od.order_no, `${c.code ?? ""} ${c.message ?? ""}`);
    }
    // H-2: 승인응답 totalAmount 를 approveOrder 가 한 번 더 대조한다. pg_tid = paymentKey(취소 API 의 키).
    const tr = await approveOrder(db(), orderId, { provider, tid: c.paymentKey || paymentKey, raw: c.raw, paidAmount: c.totalAmount, pgOrderNo: c.orderId });
    return { ...tr, orderNo: tr.orderNo || od.order_no };
  }

  return { ok: false, reason: "unknown_provider", orderNo };
}

// 결제창(iframe 일 수 있음) 안에서 열린 응답이 최상위 창을 결제완료 페이지로 옮기게 하는 HTML.
function topRedirect(url: URL) {
  const target = JSON.stringify(url.toString());
  return new NextResponse(
    `<!doctype html><html><head><meta charset="utf-8"></head><body><script>try{(window.top||window).location.replace(${target});}catch(e){location.replace(${target});}</script></body></html>`,
    { headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

// 브라우저 리턴(GET) → 결제완료 페이지로 리다이렉트
export async function GET(req: NextRequest, { params }: { params: { provider: string } }) {
  const q = req.nextUrl.searchParams;
  const r = await handle(params.provider, q, {});
  // 분석용 부가 기록 — 실패해도 결제 흐름에 영향을 주지 않는다(lib/payment-events.ts).
  await logPaymentEvent({
    orderId: pickOrderId(q, {}),
    provider: params.provider,
    stage: "return",
    ok: r.ok,
    code: r.ok ? null : (r as { reason?: string }).reason ?? null,
    message: r.ok ? null : (r as FailExtra).pgMsg ?? null,
  });
  const url = new URL("/checkout/complete", SITE);
  if (r.orderNo) url.searchParams.set("order", r.orderNo);
  url.searchParams.set("paid", r.ok ? "1" : "0");
  if (!r.ok && (r as FailExtra).fail) url.searchParams.set("fail", String((r as FailExtra).fail));
  // 토스 PC 결제창은 iframe 이다. 리턴이 iframe 안에서 열려도 완료 페이지(X-Frame-Options DENY)가 최상위 창에 뜨도록
  // 이니시스 POST 응답과 같은 방식으로 window.top 을 이동시킨다.
  if (params.provider === "toss") return topRedirect(url);
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
  await logPaymentEvent({
    orderId: pickOrderId(req.nextUrl.searchParams, body),
    provider: params.provider,
    stage: "approve",
    ok: r.ok,
    code: r.ok ? null : (r as { reason?: string }).reason ?? null,
    message: r.ok ? null : (r as FailExtra).pgMsg ?? null,
  });

  // 이니시스는 인증 결과를 returnUrl 로 브라우저 POST 한다(결제창 팝업 컨텍스트).
  // → 부모창을 결제완료 페이지로 이동시키는 HTML 응답.
  if (params.provider === "inicis") {
    const url = new URL("/checkout/complete", SITE);
    if (r.orderNo) url.searchParams.set("order", r.orderNo);
    url.searchParams.set("paid", r.ok ? "1" : "0");
    if (!r.ok && (r as FailExtra).fail) url.searchParams.set("fail", String((r as FailExtra).fail));
    return topRedirect(url);
  }

  return NextResponse.json({ received: true, provider: params.provider, ...r });
}
