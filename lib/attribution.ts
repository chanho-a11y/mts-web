// 유입 경로(Attribution) 계측 (D-154)
// - middleware 가 외부 유입(UTM, 클릭 ID, 외부 리퍼러)을 감지해 1st-party 쿠키 2종에 기록한다.
//     mts_ft: 첫 유입(first touch). 한 번 쓰면 덮어쓰지 않는다. 180일.
//     mts_lt: 마지막 비직접 유입(last non-direct touch). 새 외부 유입이 오면 갱신. 30일.
// - 가입(signUpAction, OAuth 콜백)과 주문 생성(createOrderAction) 시 이 쿠키를 읽어 DB 에 저장한다.
// - Edge 런타임(middleware)에서도 import 되므로 Node 전용 API 를 쓰지 않는다.
// - 개인정보는 담지 않는다. 랜딩은 경로만 저장하고 쿼리스트링은 버린다.

export const FT_COOKIE = "mts_ft";
export const LT_COOKIE = "mts_lt";
export const FT_MAX_AGE = 60 * 60 * 24 * 180; // 180일
export const LT_MAX_AGE = 60 * 60 * 24 * 30; // 30일

export type Channel =
  | "direct"
  | "organic_search"
  | "paid_search"
  | "social"
  | "paid_social"
  | "ai_assistant"
  | "email"
  | "blog"
  | "referral";

export interface Touch {
  ch: Channel;          // 분류된 채널
  src: string;          // 소스 (utm_source 또는 리퍼러 호스트, 직접 유입은 "(direct)")
  med: string;          // 매체 (utm_medium 또는 추정값)
  cmp?: string;         // utm_campaign
  cnt?: string;         // utm_content
  trm?: string;         // utm_term
  ref?: string;         // 리퍼러 호스트
  lp: string;           // 랜딩 경로(쿼리 제외)
  at: string;           // ISO 시각
}

const MAX = 100;
const clip = (v: string | null | undefined, n = MAX) => {
  const s = (v ?? "").trim();
  return s ? s.slice(0, n) : undefined;
};

// 결제, 인증 등 우리 흐름의 일부로 되돌아오는 호스트. 유입으로 세지 않는다.
// (예: 이니시스 결제 후 복귀가 'inicis referral' 로 마지막 유입을 덮어쓰는 것을 막는다)
const IGNORE_HOST = [
  /(^|\.)inicis\.com$/,
  /(^|\.)paypal\.com$/,
  /(^|\.)paypalobjects\.com$/,
  /(^|\.)kakao\.com$/,      // kauth.kakao.com, accounts.kakao.com (소셜 로그인)
  /(^|\.)supabase\.co$/,
  /(^|\.)vercel\.app$/,
  /(^|\.)vercel\.com$/,
  /^localhost$/,
];

const AI_HOST = [
  /(^|\.)chatgpt\.com$/, /(^|\.)openai\.com$/, /(^|\.)claude\.ai$/, /(^|\.)perplexity\.ai$/,
  /^gemini\.google\.com$/, /(^|\.)copilot\.microsoft\.com$/, /(^|\.)you\.com$/, /(^|\.)wrtn\.ai$/,
  /(^|\.)deepseek\.com$/, /(^|\.)grok\.com$/, /^cue\.search\.naver\.com$/,
];
const BLOG_HOST = [
  /^(m\.)?blog\.naver\.com$/, /^(m\.)?cafe\.naver\.com$/, /^(m\.)?post\.naver\.com$/,
  /(^|\.)tistory\.com$/, /^(m\.)?brunch\.co\.kr$/, /(^|\.)velog\.io$/, /(^|\.)medium\.com$/,
];
const SEARCH_HOST = [
  /(^|\.)google\.[a-z.]+$/, /(^|\.)naver\.com$/, /(^|\.)daum\.net$/, /(^|\.)bing\.com$/,
  /(^|\.)yahoo\.[a-z.]+$/, /(^|\.)duckduckgo\.com$/, /(^|\.)baidu\.com$/, /(^|\.)ecosia\.org$/,
  /(^|\.)zum\.com$/, /(^|\.)nate\.com$/,
];
const SOCIAL_HOST = [
  /(^|\.)instagram\.com$/, /(^|\.)facebook\.com$/, /^fb\.me$/, /(^|\.)threads\.(net|com)$/,
  /(^|\.)youtube\.com$/, /^youtu\.be$/, /^t\.co$/, /(^|\.)x\.com$/, /(^|\.)twitter\.com$/,
  /(^|\.)linkedin\.com$/, /^lnkd\.in$/, /(^|\.)pinterest\.[a-z.]+$/, /(^|\.)tiktok\.com$/,
  /^band\.us$/, /^story\.kakao\.com$/, /(^|\.)linktr\.ee$/,
];
const SOCIAL_SOURCE = /^(ig|instagram|fb|facebook|meta|threads|youtube|yt|tiktok|twitter|x|linkedin|kakao|kakaotalk|band|pinterest|linktree)$/;
const AI_SOURCE = /^(chatgpt|openai|claude|perplexity|gemini|copilot|wrtn|ai)$/;
const SEARCH_SOURCE = /^(google|naver|daum|bing|yahoo|duckduckgo|baidu|zum)$/;

const any = (list: RegExp[], h: string) => list.some((r) => r.test(h));

export function hostOf(referer: string | null | undefined): string | null {
  if (!referer) return null;
  try {
    return new URL(referer).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** 소스, 매체, 리퍼러 호스트로 채널을 분류한다. UTM 이 있으면 UTM 을 우선한다. */
export function classifyChannel(src: string, med: string, refHost: string | null, clickId?: "gclid" | "fbclid" | null): Channel {
  const s = src.toLowerCase();
  const m = med.toLowerCase();
  if (/^(email|e-mail|newsletter|mail)$/.test(m) || /^(newsletter|resend|email)$/.test(s)) return "email";
  if (/^(ai-assistant|ai|llm|chatbot)$/.test(m) || AI_SOURCE.test(s)) return "ai_assistant";
  const paid = /^(cpc|ppc|paid|paidsearch|paid_search|cpm|cpv|paid_social|paidsocial|paid-social|ad|ads|display|banner)$/.test(m);
  const socialish = SOCIAL_SOURCE.test(s) || /social|sns/.test(m) || (refHost ? any(SOCIAL_HOST, refHost) : false);
  if (paid) return socialish || /social/.test(m) ? "paid_social" : "paid_search";
  if (clickId === "gclid") return "paid_search";
  if (/social|sns/.test(m) || SOCIAL_SOURCE.test(s)) return "social";
  if (/^blog$/.test(m)) return "blog";
  if (m === "organic" || SEARCH_SOURCE.test(s) && m === "") return "organic_search";
  if (refHost) {
    if (any(AI_HOST, refHost)) return "ai_assistant";
    if (any(BLOG_HOST, refHost)) return "blog";
    if (any(SEARCH_HOST, refHost)) return "organic_search";
    if (any(SOCIAL_HOST, refHost)) return "social";
  }
  if (clickId === "fbclid") return "social";
  if (m === "referral" || refHost) return "referral";
  if (s === "(direct)" || (!s && !m)) return "direct";
  return "referral";
}

/**
 * 요청 1건에서 유입 정보를 뽑는다.
 * - UTM 또는 클릭 ID 가 있으면 그 값으로 Touch 를 만든다.
 * - 없으면 외부 리퍼러가 있을 때만 Touch 를 만든다.
 * - 둘 다 없으면 null (직접 유입 또는 사이트 내부 이동).
 * selfHost: 현재 요청 호스트. 같은 호스트에서 온 리퍼러는 내부 이동이므로 무시한다.
 */
export function extractTouch(url: URL, referer: string | null, selfHost: string | null, now = new Date()): Touch | null {
  const q = url.searchParams;
  const utmSource = clip(q.get("utm_source"));
  const utmMedium = clip(q.get("utm_medium"));
  const gclid = q.get("gclid") || q.get("gbraid") || q.get("wbraid");
  const fbclid = q.get("fbclid");
  const clickId = gclid ? "gclid" : fbclid ? "fbclid" : null;

  const self = (selfHost ?? "").toLowerCase().replace(/:\d+$/, "").replace(/^www\./, "");
  let refHost = hostOf(referer);
  if (refHost && (refHost === self || any(IGNORE_HOST, refHost))) refHost = null;

  const lp = url.pathname.slice(0, 200) || "/";
  const at = now.toISOString();

  if (utmSource || utmMedium || clickId) {
    const src = (utmSource ?? (gclid ? "google" : fbclid ? (refHost ?? "meta") : refHost ?? "(unknown)")).toLowerCase();
    const med = (utmMedium ?? (gclid ? "cpc" : "")).toLowerCase();
    const t: Touch = { ch: classifyChannel(src, med, refHost, clickId), src, med: med || "(none)", lp, at };
    const cmp = clip(q.get("utm_campaign")); if (cmp) t.cmp = cmp;
    const cnt = clip(q.get("utm_content")); if (cnt) t.cnt = cnt;
    const trm = clip(q.get("utm_term")); if (trm) t.trm = trm;
    if (refHost) t.ref = refHost;
    return t;
  }
  if (refHost) {
    const ch = classifyChannel(refHost, "", refHost, null);
    const med = ch === "organic_search" ? "organic" : ch === "ai_assistant" ? "ai-assistant" : ch === "social" ? "social" : ch === "blog" ? "blog" : "referral";
    return { ch, src: refHost, med, ref: refHost, lp, at };
  }
  return null;
}

export function directTouch(url: URL, now = new Date()): Touch {
  return { ch: "direct", src: "(direct)", med: "(none)", lp: url.pathname.slice(0, 200) || "/", at: now.toISOString() };
}

export function serializeTouch(t: Touch): string {
  return JSON.stringify(t);
}

const CHANNELS: Channel[] = ["direct", "organic_search", "paid_search", "social", "paid_social", "ai_assistant", "email", "blog", "referral"];

/** 쿠키 값을 Touch 로 복원한다. 형식이 틀리면 null. (위변조 값은 화이트리스트로 정규화) */
export function parseTouch(raw: string | null | undefined): Touch | null {
  if (!raw) return null;
  let o: any = null;
  try { o = JSON.parse(raw); } catch {
    try { o = JSON.parse(decodeURIComponent(raw)); } catch { return null; }
  }
  if (!o || typeof o !== "object") return null;
  const ch = CHANNELS.includes(o.ch) ? (o.ch as Channel) : null;
  const at = typeof o.at === "string" && !Number.isNaN(Date.parse(o.at)) ? o.at : null;
  if (!ch || !at) return null;
  const str = (v: unknown, n = MAX) => (typeof v === "string" ? clip(v, n) : undefined);
  const t: Touch = { ch, src: str(o.src) ?? "(unknown)", med: str(o.med) ?? "(none)", lp: str(o.lp, 200) ?? "/", at };
  const cmp = str(o.cmp); if (cmp) t.cmp = cmp;
  const cnt = str(o.cnt); if (cnt) t.cnt = cnt;
  const trm = str(o.trm); if (trm) t.trm = trm;
  const ref = str(o.ref); if (ref) t.ref = ref;
  return t;
}

export const CHANNEL_LABEL: Record<Channel, string> = {
  direct: "직접 방문",
  organic_search: "검색(자연)",
  paid_search: "검색 광고",
  social: "소셜",
  paid_social: "소셜 광고",
  ai_assistant: "AI 어시스턴트",
  email: "이메일",
  blog: "블로그, 카페",
  referral: "외부 링크",
};

export function channelLabel(ch: string | null | undefined): string {
  if (!ch) return "기록 없음";
  return (CHANNEL_LABEL as Record<string, string>)[ch] ?? ch;
}

/** 주문, 가입 시점에 저장할 유입 요약. 마지막 유입이 없으면 직접 방문으로 본다. */
export function attributionSnapshot(ft: Touch | null, lt: Touch | null) {
  return {
    first: ft,
    last: lt,
    channel: (lt?.ch ?? "direct") as Channel,
    firstChannel: (ft?.ch ?? null) as Channel | null,
  };
}
