import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// O-1(1단계): CSP 위반 리포트 수집 엔드포인트.
//
// 현재 CSP 는 `Content-Security-Policy-Report-Only` 로만 걸려 있어 위반이 차단되지 않는다.
// 그런데 report-uri 가 없어서 위반이 각 방문자 브라우저 콘솔에만 찍히고 어디에도 모이지 않았다
// → "며칠 관찰 후 enforce 전환"이 실제로 불가능한 상태였다.
//
// 이 라우트가 위반을 Vercel 런타임 로그로 모은다. 며칠 수집해 위반이 없거나
// 전부 무해한 잡음(브라우저 확장 등)임을 확인한 뒤 헤더 키를 enforce 로 바꾼다.
//
// 주의: 이 엔드포인트는 인증 없이 열려 있어야 한다(브라우저가 자동 POST). 쓰기 부작용이 전혀 없고,
//       본문 크기·로그 길이를 제한해 로그 폭탄을 방지한다.

const MAX_BODY = 16 * 1024; // 16KB 초과 리포트는 버림

// 잡음 필터 — 브라우저 확장/외부 앱이 주입하는 스킴은 우리 CSP 문제와 무관하다.
const NOISE = ["chrome-extension:", "moz-extension:", "safari-extension:", "safari-web-extension:", "about:", "blob:null"];

type Report = {
  "document-uri"?: string; "blocked-uri"?: string; "violated-directive"?: string;
  "effective-directive"?: string; "original-policy"?: string; disposition?: string;
  "script-sample"?: string; "line-number"?: number;
};

export async function POST(req: Request) {
  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return new NextResponse(null, { status: 204 });
  }
  if (!raw || raw.length > MAX_BODY) return new NextResponse(null, { status: 204 });

  let reports: Report[] = [];
  try {
    const parsed = JSON.parse(raw);
    // report-uri 형식: { "csp-report": {...} } / report-to 형식: [{ body: {...} }, ...]
    if (Array.isArray(parsed)) {
      reports = parsed.map((r) => (r?.body ?? r) as Report);
    } else if (parsed?.["csp-report"]) {
      reports = [parsed["csp-report"] as Report];
    } else {
      reports = [parsed as Report];
    }
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  for (const r of reports.slice(0, 5)) {
    const blocked = String(r?.["blocked-uri"] ?? "");
    if (NOISE.some((n) => blocked.startsWith(n))) continue;
    const directive = String(r?.["effective-directive"] ?? r?.["violated-directive"] ?? "?");
    const doc = String(r?.["document-uri"] ?? "?").slice(0, 200);
    const sample = String(r?.["script-sample"] ?? "").slice(0, 120);
    // Vercel 런타임 로그에서 "[csp-violation]" 으로 검색해 수집한다.
    console.warn(`[csp-violation] directive=${directive} blocked=${blocked.slice(0, 200)} doc=${doc}${sample ? ` sample=${sample}` : ""}`);
  }

  return new NextResponse(null, { status: 204 });
}

// 브라우저가 프리플라이트를 보내는 경우 대비
export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
