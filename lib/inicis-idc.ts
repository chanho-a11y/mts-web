// 이니시스 IDC 센터코드 화이트리스트 (D-143, 2026-10-12 KG이니시스 가맹점 보안강화 권고 [2])
//
// 결제요청에 센터코드 옵션(PC: acceptmethod "centerCd(Y)", 모바일: P_RESERVED "centerCd=Y")을 켜면
// 인증결과에 idc_name(fc | ks | stg)이 함께 돌아온다. 승인요청은 인증결과에 실려 온 URL(authUrl, P_REQ_URL)이
// 아니라, 가맹점이 미리 저장한 아래 표에서 idc_name 으로 고른 URL 로만 보낸다(리다이렉트 URL 피싱 방지).
// URL 값은 이니시스 권고 메일(2026-10-12) 원문 그대로다.
//
// 판정 원칙
//  1. idc_name 이 없거나 표에 없으면 승인하지 않는다.
//  2. stg(이니시스 테스트 서버)는 운영(NODE_ENV=production)에서 거절한다.
//  3. 인증결과에 실려 온 URL 이 표의 URL 과 다르면 경고만 남기고, 승인은 표의 URL 로 보낸다.
//     승인 대상이 항상 표의 URL 이므로 보안 수준은 같고, 이니시스 측 표기 차이로 결제가 막히는 일을 피한다.

export type InicisModule = "pc" | "mobile";
export type InicisIdc = "fc" | "ks" | "stg";

const APPROVE_URLS: Record<InicisModule, Record<InicisIdc, string>> = {
  pc: {
    fc: "https://fcstdpay.inicis.com/api/payAuth",
    ks: "https://ksstdpay.inicis.com/api/payAuth",
    stg: "https://stgstdpay.inicis.com/api/payAuth",
  },
  mobile: {
    fc: "https://fcmobile.inicis.com/smart/payReq.ini",
    ks: "https://ksmobile.inicis.com/smart/payReq.ini",
    stg: "https://stgmobile.inicis.com/smart/payReq.ini",
  },
};

export type IdcResolution =
  | { ok: true; url: string; idc: InicisIdc; receivedMatches: boolean }
  | { ok: false; reason: "no_idc" | "unknown_idc" | "stg_blocked" };

// 비교용 정규화: 프로토콜, 호스트(소문자), 경로만 본다. 쿼리와 끝 슬래시는 무시.
function normalize(u: string): string | null {
  try {
    const x = new URL(u);
    return `${x.protocol}//${x.host.toLowerCase()}${x.pathname.replace(/\/+$/, "")}`;
  } catch {
    return null;
  }
}

export function resolveInicisApproveUrl(
  module: InicisModule,
  idcName: unknown,
  receivedUrl: string,
  opts: { allowStg?: boolean } = {},
): IdcResolution {
  const allowStg = opts.allowStg ?? process.env.NODE_ENV !== "production";
  const idc = String(idcName ?? "").trim().toLowerCase();
  if (!idc) return { ok: false, reason: "no_idc" };
  if (idc !== "fc" && idc !== "ks" && idc !== "stg") return { ok: false, reason: "unknown_idc" };
  if (idc === "stg" && !allowStg) return { ok: false, reason: "stg_blocked" };
  const url = APPROVE_URLS[module][idc];
  const receivedMatches = normalize(receivedUrl) === normalize(url);
  return { ok: true, url, idc, receivedMatches };
}
