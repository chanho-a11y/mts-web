// 이니시스 INIAPI 취소/부분취소 (카드, KRW).
// 스펙(manual.inicis.com/pay/cancel.html):
//   전체취소  POST /api/v1/refund  type=Refund
//     hashData = SHA512(INIAPIKey + type + paymethod + timestamp + clientIp + mid + tid)
//   부분취소  POST /api/v1/refund  type=PartialRefund + price + confirmPrice(남은금액)
//     hashData = SHA512(INIAPIKey + type + paymethod + timestamp + clientIp + mid + tid + price + confirmPrice)
//   전문형식 = x-www-form-urlencoded(모든 value urlEncode), 응답 = JSON(resultCode "00"=성공).
//   ※ 카드취소는 INIAPI Key만 사용(signKey 아님). 인증서/IV는 가상계좌 환불 전용 → 불필요.
import crypto from "crypto";
import { paypalToken, paypalBase } from "./payments";

const sha512 = (s: string) => crypto.createHash("sha512").update(s, "utf8").digest("hex");
const TEST = process.env.PAYMENTS_TEST_MODE === "true";
// 운영 iniapi.inicis.com / 스테이징 stginiapi.inicis.com. 실 MID이므로 운영 기본, env로 override 가능.
const INIAPI_URL = process.env.INICIS_INIAPI_URL || "https://iniapi.inicis.com/api/v1/refund";

// YYYYMMDDhhmmss (KST)
function nowTs(): string {
  const d = new Date(Date.now() + 9 * 3600 * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}`;
}

export interface InicisCancelResult {
  ok: boolean;
  cancelId?: string;   // 부분취소 거래번호(prtcTid/tid) — refund.pg_cancel_id 저장
  resultCode?: string;
  message: string;
  raw?: unknown;
}

// 이니시스 카드 취소. partial 지정 시 부분취소, 미지정 시 전체취소.
export async function inicisCancel(opts: {
  tid: string;
  reason: string;
  clientIp?: string;
  partial?: { price: number; confirmPrice: number };
}): Promise<InicisCancelResult> {
  const mid = process.env.INICIS_MID;
  const key = process.env.INICIS_INIAPI_KEY;
  if (!mid || !key) return { ok: false, message: "INICIS INIAPI 키(INICIS_INIAPI_KEY)가 설정되지 않았습니다." };
  if (!opts.tid) return { ok: false, message: "취소할 결제 TID가 없습니다." };

  // 테스트 모드: 실제 호출 없이 성공 처리(전체 플로우 검증용)
  if (TEST) return { ok: true, cancelId: `TESTCANCEL${Date.now()}`, resultCode: "00", message: "테스트 모드 취소" };

  const timestamp = nowTs();
  const clientIp = (opts.clientIp || "0.0.0.0").slice(0, 15);
  const paymethod = "Card";
  const type = opts.partial ? "PartialRefund" : "Refund";

  const form = new URLSearchParams();
  form.set("type", type);
  form.set("paymethod", paymethod);
  form.set("timestamp", timestamp);
  form.set("clientIp", clientIp);
  form.set("mid", mid);
  form.set("tid", opts.tid);
  form.set("msg", (opts.reason || "관리자 취소").slice(0, 80));

  let hashSrc = key + type + paymethod + timestamp + clientIp + mid + opts.tid;
  if (opts.partial) {
    const price = String(opts.partial.price);
    const confirmPrice = String(opts.partial.confirmPrice);
    form.set("price", price);
    form.set("confirmPrice", confirmPrice);
    form.set("currency", "WON");
    hashSrc += price + confirmPrice;
  }
  form.set("hashData", sha512(hashSrc));

  let res: Response;
  try {
    res = await fetch(INIAPI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
      body: form.toString(),
    });
  } catch (e) {
    return { ok: false, message: `이니시스 취소 통신 실패: ${(e as Error).message}` };
  }

  const raw = (await res.json().catch(() => null)) as
    | { resultCode?: string; resultMsg?: string; tid?: string; prtcTid?: string }
    | null;
  const resultCode = String(raw?.resultCode ?? "");
  const ok = res.ok && resultCode === "00";
  const cancelId = raw?.tid ?? raw?.prtcTid ?? undefined;
  return {
    ok,
    cancelId,
    resultCode,
    message: raw?.resultMsg ?? (ok ? "취소 완료" : `취소 실패 (code=${resultCode || res.status})`),
    raw,
  };
}

// ── 페이팔 환불(Payments v2, capture 기준) ──
// 전체환불: amount 미지정(capture 잔액 전액) / 부분환불: amount(USD) 지정.
// ※ 현 데이터 모델상 order_item가 KRW라, 상위(cancelOrderAction)에서는 페이팔=전체환불(remaining USD)만 사용.
export interface PaypalRefundResult { ok: boolean; refundId?: string; message: string; raw?: unknown }
export async function paypalRefund(opts: { captureId: string; amount?: number; currency?: string }): Promise<PaypalRefundResult> {
  if (TEST) return { ok: true, refundId: `TESTPPREFUND${Date.now()}`, message: "테스트 모드 환불" };
  if (!opts.captureId) return { ok: false, message: "capture_id가 없어 페이팔 환불이 불가합니다." };
  const token = await paypalToken();
  if (!token) return { ok: false, message: "PayPal 자격증명(env) 미설정" };

  const body = opts.amount != null
    ? JSON.stringify({ amount: { value: opts.amount.toFixed(2), currency_code: opts.currency || "USD" } })
    : undefined;

  let res: Response;
  try {
    res = await fetch(`${paypalBase()}/v2/payments/captures/${opts.captureId}/refund`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      ...(body ? { body } : {}),
    });
  } catch (e) {
    return { ok: false, message: `페이팔 환불 통신 실패: ${(e as Error).message}` };
  }
  const raw = (await res.json().catch(() => null)) as { id?: string; status?: string; message?: string } | null;
  const ok = res.ok && (raw?.status === "COMPLETED" || raw?.status === "PENDING");
  return { ok, refundId: raw?.id, message: ok ? "페이팔 환불 완료" : `페이팔 환불 실패 (${raw?.message || res.status})`, raw };
}
