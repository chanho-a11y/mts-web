import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { approveOrder } from "@/lib/payments-approve";
import { paypalToken, paypalCapture } from "@/lib/payments";

export const dynamic = "force-dynamic";

function db() {
  return hasServiceRole ? createAdminClient() : createClient();
}
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://mtspace.coffee";
const TEST = process.env.PAYMENTS_TEST_MODE === "true";

// 공통 승인 처리. provider별 검증 후 approveOrder.
async function handle(provider: string, q: URLSearchParams, body: Record<string, unknown>) {
  const orderId = String(q.get("oid") || body.oid || body.order_id || "");
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
    const r = await approveOrder(db(), orderId, { provider, tid: ppId, captureId: cap.captureId, raw: cap.raw });
    return { ...r, orderNo: r.orderNo || orderNo };
  }

  if (provider === "kakaopay") {
    const pgToken = String(q.get("pg_token") || body.pg_token || "");
    const secret = process.env.KAKAOPAY_SECRET, cid = process.env.KAKAOPAY_CID;
    if (!secret || !cid || !pgToken) return { ok: false, reason: "kakaopay_unconfigured", orderNo };
    // 저장된 tid 조회 (ready 단계에서 payment.pg_tid 에 저장되어 있어야 함)
    const { data: pay } = await db().from("payment").select("pg_tid").eq("order_id", orderId).maybeSingle();
    const tid = pay?.pg_tid;
    if (!tid) return { ok: false, reason: "kakaopay_no_tid", orderNo };
    const res = await fetch("https://open-api.kakaopay.com/online/v1/payment/approve", {
      method: "POST",
      headers: { Authorization: `SECRET_KEY ${secret}`, "Content-Type": "application/json" },
      body: JSON.stringify({ cid, tid, partner_order_id: orderNo, partner_user_id: orderNo, pg_token: pgToken }),
    });
    const raw = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, reason: "kakaopay_approve_failed", orderNo };
    const r = await approveOrder(db(), orderId, { provider, tid, raw });
    return { ...r, orderNo: r.orderNo || orderNo };
  }

  if (provider === "inicis") {
    // 이니시스 인증결과(authToken/authUrl) 승인은 운영 키(서명) 연동 필요.
    if (!process.env.INICIS_MID || !process.env.INICIS_SIGNKEY) return { ok: false, reason: "inicis_unconfigured", orderNo };
    // 운영 연동 시: authUrl 로 승인요청(서명) → 결과 검증 → approveOrder. (키 확보 후 구현)
    return { ok: false, reason: "inicis_pending_keys", orderNo };
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
  return NextResponse.json({ received: true, provider: params.provider, ...r });
}
