// D-174: 운송장 번호로 운송사(롯데택배, EMS)를 판별하고 조회 링크를 만든다.
// 서버와 브라우저 양쪽에서 쓰는 순수 모듈이다.
import { lotteTrackingUrl } from "@/lib/lotte";

export type Carrier = "lotte" | "ems";

/** EMS 번호 정규화: 공백, 하이픈 제거 후 대문자 (예: ee 123 456 789 kr → EE123456789KR) */
export function normalizeEmsNo(raw: string): string {
  return String(raw ?? "").replace(/[\s-]/g, "").toUpperCase();
}

/** EMS(국제우편) 번호 형식: 영문 2자 + 숫자 9자 + 영문 2자, 13자리 (예: EE123456789KR) */
export function isEmsNo(raw: string): boolean {
  return /^[A-Z]{2}\d{9}[A-Z]{2}$/.test(normalizeEmsNo(raw));
}

export function carrierOf(trackingNo: string): Carrier {
  return isEmsNo(trackingNo) ? "ems" : "lotte";
}

/** 우체국 국제우편(EMS) 조회 링크 (2026-11-25 POST_CODE 파라미터로 조회 화면 열림 확인) */
export function emsTrackingUrl(trackingNo: string): string {
  return `https://service.epost.go.kr/trace.RetrieveEmsRigiTraceList.comm?POST_CODE=${encodeURIComponent(normalizeEmsNo(trackingNo))}&displayHeader=N`;
}

export function trackingUrl(trackingNo: string): string {
  return carrierOf(trackingNo) === "ems" ? emsTrackingUrl(trackingNo) : lotteTrackingUrl(trackingNo);
}

export function carrierLabel(trackingNo: string, lang: "ko" | "en" = "ko"): string {
  if (carrierOf(trackingNo) === "ems") return lang === "en" ? "Korea Post EMS" : "우체국 EMS";
  return lang === "en" ? "Lotte Global Logistics" : "롯데택배";
}
