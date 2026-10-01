// GA4 Data API (server-only).
//
// 설계 메모
//  · 신규 의존성을 넣지 않는다. googleapis 는 번들·빌드시간이 크게 늘어난다.
//    이미 쓰고 있는 `jose` 로 서비스 계정 JWT 를 서명해 REST 를 직접 호출한다.
//  · 결제·이메일과 같은 패턴: env 가 없으면 조용히 비활성(설정 안내 문구만).
//  · NEXT_PUBLIC_ 접두사 금지 — 서비스 계정 키가 클라이언트로 새면 안 된다.
//  · GA4 Data API 에는 일일 쿼터가 있다. 관리자 화면은 실시간일 필요가 없으므로
//    fetch 레벨에서 30분 캐시한다.
//
// 필요한 env (Vercel)
//    GA4_PROPERTY_ID      숫자 속성 ID (측정 ID G-XXXX 가 아니다)
//    GA4_SA_EMAIL         서비스 계정 이메일
//    GA4_SA_PRIVATE_KEY   서비스 계정 개인키(PEM, 개행은 \n 이스케이프 허용)
// 그리고 GA4 속성에 위 서비스 계정을 "뷰어" 로 추가해야 한다.

import { SignJWT, importPKCS8 } from "jose";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/analytics.readonly";
const CACHE_SECONDS = 1800;

export function ga4Configured(): boolean {
  return !!(process.env.GA4_PROPERTY_ID && process.env.GA4_SA_EMAIL && process.env.GA4_SA_PRIVATE_KEY);
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string | null> {
  if (!ga4Configured()) return null;
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt > now + 60) return cachedToken.value;

  try {
    const pem = (process.env.GA4_SA_PRIVATE_KEY as string).replace(/\\n/g, "\n").trim();
    const key = await importPKCS8(pem, "RS256");
    const assertion = await new SignJWT({ scope: SCOPE })
      .setProtectedHeader({ alg: "RS256" })
      .setIssuer(process.env.GA4_SA_EMAIL as string)
      .setAudience(TOKEN_URL)
      .setIssuedAt(now)
      .setExpirationTime(now + 3600)
      .sign(key);

    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }),
      cache: "no-store",
    });
    if (!res.ok) {
      console.warn("[ga4] token request failed:", res.status);
      return null;
    }
    const json = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!json.access_token) return null;
    cachedToken = { value: json.access_token, expiresAt: now + (json.expires_in ?? 3600) };
    return cachedToken.value;
  } catch (e) {
    console.warn("[ga4] token error:", (e as Error)?.message?.slice(0, 160));
    return null;
  }
}

export interface Ga4Row {
  dims: string[];
  metrics: number[];
}

export async function ga4RunReport(body: Record<string, unknown>): Promise<Ga4Row[] | null> {
  return runReport(body);
}

async function runReport(body: Record<string, unknown>): Promise<Ga4Row[] | null> {
  const token = await getAccessToken();
  if (!token) return null;
  const property = process.env.GA4_PROPERTY_ID as string;
  try {
    const res = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${property}:runReport`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        next: { revalidate: CACHE_SECONDS },
      },
    );
    if (!res.ok) {
      console.warn("[ga4] runReport failed:", res.status, (await res.text()).slice(0, 200));
      return null;
    }
    const json = (await res.json()) as {
      rows?: { dimensionValues?: { value: string }[]; metricValues?: { value: string }[] }[];
    };
    return (json.rows ?? []).map((r) => ({
      dims: (r.dimensionValues ?? []).map((d) => d.value ?? ""),
      metrics: (r.metricValues ?? []).map((m) => Number(m.value ?? 0) || 0),
    }));
  } catch (e) {
    console.warn("[ga4] fetch error:", (e as Error)?.message?.slice(0, 160));
    return null;
  }
}

/** GA4 는 YYYY-MM-DD 문자열 범위를 받는다. 비어 있으면 최근 28일. */
function range(from?: string, to?: string) {
  return [{ startDate: from || "28daysAgo", endDate: to || "today" }];
}

/** 유입 경로별 세션·전환 */
export async function ga4TrafficSources(from?: string, to?: string, limit = 15) {
  return runReport({
    dateRanges: range(from, to),
    dimensions: [{ name: "sessionSource" }, { name: "sessionMedium" }],
    metrics: [{ name: "sessions" }, { name: "engagedSessions" }, { name: "conversions" }],
    orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    limit,
  });
}

/** 랜딩페이지 Top N + 이탈률 */
export async function ga4LandingPages(from?: string, to?: string, limit = 20) {
  return runReport({
    dateRanges: range(from, to),
    dimensions: [{ name: "landingPagePlusQueryString" }],
    metrics: [{ name: "sessions" }, { name: "bounceRate" }],
    orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    limit,
  });
}

/**
 * 제품 상세페이지 조회수.
 * 자사 DB 의 SKU 판매수량과 나란히 놓으면 "조회 대비 구매" 를 볼 수 있다.
 * GA4(세션 기준)와 자사 DB(주문 기준)는 정확히 맞지 않으므로 합산하지 말고
 * 비율만 읽는다.
 */
export async function ga4ProductViews(from?: string, to?: string, limit = 30) {
  return runReport({
    dateRanges: range(from, to),
    dimensions: [{ name: "pagePath" }],
    metrics: [{ name: "screenPageViews" }],
    dimensionFilter: {
      filter: {
        fieldName: "pagePath",
        stringFilter: { matchType: "BEGINS_WITH", value: "/products/" },
      },
    },
    orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
    limit,
  });
}

// ---------------------------------------------------------------------------
// D-129: 주간 마케팅 보고(MCP commerce_run_report web_traffic / content_performance)용.
// GA4 는 세션 기준, 자사 DB 는 주문 기준이다. 둘을 합산하지 말고 나란히 읽는다.
// 봇 의심 트래픽은 engagedSessions(참여 세션)를 함께 내려 읽는 쪽에서 걸러 본다.

type Section = { section: string; rows: Record<string, string | number>[]; available: boolean };

function toSection(name: string, dimNames: string[], metricNames: string[], rows: Ga4Row[] | null): Section {
  if (!rows) return { section: name, rows: [], available: false };
  return {
    section: name,
    available: true,
    rows: rows.map((r) => {
      const o: Record<string, string | number> = {};
      dimNames.forEach((d, i) => (o[d] = r.dims[i] ?? ""));
      metricNames.forEach((m, i) => (o[m] = r.metrics[i] ?? 0));
      return o;
    }),
  };
}

async function q(name: string, from: string, to: string, dims: string[], metrics: string[], extra: Record<string, unknown> = {}) {
  const rows = await runReport({
    dateRanges: range(from, to),
    dimensions: dims.map((n) => ({ name: n })),
    metrics: metrics.map((n) => ({ name: n })),
    orderBys: [{ metric: { metricName: metrics[0] }, desc: true }],
    ...extra,
  });
  return toSection(name, dims, metrics, rows);
}

const begins = (field: string, values: string[]) => ({
  orGroup: {
    expressions: values.map((v) => ({ filter: { fieldName: field, stringFilter: { matchType: "BEGINS_WITH", value: v } } })),
  },
});

export async function ga4WebTrafficReport(from: string, to: string): Promise<Section[]> {
  const S = ["sessions", "engagedSessions", "keyEvents", "totalUsers"];
  return Promise.all([
    q("channel", from, to, ["sessionDefaultChannelGroup"], S, { limit: 20 }),
    q("source_medium", from, to, ["sessionSource", "sessionMedium"], S, { limit: 20 }),
    q("country", from, to, ["country"], ["sessions", "engagedSessions"], { limit: 10 }),
    q("new_vs_returning", from, to, ["newVsReturning"], ["totalUsers", "sessions", "engagedSessions"], { limit: 5 }),
    q("customer_type", from, to, ["customUser:customer_type"], ["totalUsers", "sessions", "keyEvents"], { limit: 10 }),
  ]);
}

export async function ga4ContentPerformanceReport(from: string, to: string): Promise<Section[]> {
  return Promise.all([
    q("content_pages", from, to, ["pagePath"], ["screenPageViews", "activeUsers", "userEngagementDuration"], {
      dimensionFilter: begins("pagePath", ["/education", "/en/education", "/blogs/"]),
      limit: 30,
    }),
    q("landing_pages", from, to, ["landingPage", "sessionSource"], ["sessions", "engagedSessions", "keyEvents"], { limit: 30 }),
    q("b2b_cta_by_page", from, to, ["pagePath"], ["eventCount"], {
      dimensionFilter: { filter: { fieldName: "eventName", stringFilter: { matchType: "EXACT", value: "b2b_cta_click" } } },
      limit: 30,
    }),
    q("b2b_cta_by_type", from, to, ["customEvent:cta", "customEvent:cta_source"], ["eventCount"], {
      dimensionFilter: { filter: { fieldName: "eventName", stringFilter: { matchType: "EXACT", value: "b2b_cta_click" } } },
      limit: 20,
    }),
  ]);
}
