// 공지 팝업(D-148) — 서버와 클라이언트가 함께 쓰는 순수 로직. DB/브라우저 API 의존 없음.

export type PopupKind = "regular" | "special";
export type PopupAudience = "all" | "business" | "consumer";
/** 방문자 구분: 승인된 사업자(관리자 포함) / 그 외 전부(비로그인, 개인, 승인 대기 사업자). */
export type PopupViewer = "business" | "consumer";

export const KIND_LABEL: Record<PopupKind, string> = { special: "특별 공지", regular: "상시 공지" };
export const AUDIENCE_LABEL: Record<PopupAudience, string> = {
  all: "전체",
  business: "사업자 회원만",
  consumer: "일반 고객만(비로그인, 개인)",
};
/** 순차 표시 순서: 특별 → 상시 */
export const KIND_ORDER: PopupKind[] = ["special", "regular"];

export interface PopupRow {
  id: string;
  brand_id: string;
  kind: PopupKind;
  title: string;
  body: string;
  title_en: string | null;
  body_en: string | null;
  image_url: string | null;
  cta_label: string | null;
  cta_label_en: string | null;
  cta_url: string | null;
  audience: PopupAudience;
  starts_at: string;
  ends_at: string | null;
  priority: number;
  is_active: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

/** 스토어프론트로 내려보내는 최소 필드(로케일 반영 완료). */
export interface PopupView {
  id: string;
  kind: PopupKind;
  title: string;
  body: string;
  imageUrl: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  /** 내용이 수정되면 바뀌는 값. "오늘 하루 보지 않기" 를 수정본에는 적용하지 않기 위함. */
  version: string;
}

/** 지금 노출 조건을 만족하는가(보관, 꺼짐, 기간). */
export function isLive(r: Pick<PopupRow, "archived_at" | "is_active" | "starts_at" | "ends_at">, now: Date): boolean {
  if (r.archived_at || !r.is_active) return false;
  const t = now.getTime();
  if (new Date(r.starts_at).getTime() > t) return false;
  if (r.ends_at && new Date(r.ends_at).getTime() <= t) return false;
  return true;
}

export function audienceMatches(a: PopupAudience, viewer: PopupViewer): boolean {
  return a === "all" || a === viewer;
}

/** 유형별 우선순위 1위만 남겨 [특별, 상시] 순서로 반환. 최대 2개. */
export function pickLive<T extends PopupRow>(rows: T[], viewer: PopupViewer, now: Date): T[] {
  const cand = rows
    .filter((r) => isLive(r, now) && audienceMatches(r.audience, viewer))
    .sort(
      (a, b) =>
        b.priority - a.priority ||
        new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime() ||
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  const out: T[] = [];
  for (const k of KIND_ORDER) {
    const w = cand.find((r) => r.kind === k);
    if (w) out.push(w);
  }
  return out;
}

/** 행 → 표시용. 영문 화면은 영문 제목이 있을 때만 노출(null 반환 = 미노출). */
export function toView(r: PopupRow, locale: "ko" | "en"): PopupView | null {
  const en = locale === "en";
  if (en && !r.title_en) return null;
  const ctaUrl = r.cta_url || null;
  const label = en ? r.cta_label_en || "Learn more" : r.cta_label || "자세히 보기";
  return {
    id: r.id,
    kind: r.kind,
    title: en ? r.title_en! : r.title,
    body: en ? r.body_en ?? "" : r.body,
    imageUrl: r.image_url || null,
    ctaLabel: ctaUrl ? label : null,
    ctaUrl,
    version: r.updated_at,
  };
}

// ---------------------------------------------------------------- 시간(KST)

const KST_PARTS = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function kstParts(d: Date): Record<string, string> {
  return Object.fromEntries(KST_PARTS.formatToParts(d).map((p) => [p.type, p.value]));
}

/** KST 기준 날짜 키 YYYY-MM-DD ("오늘 하루 보지 않기" 판정용). */
export function kstDateKey(d: Date = new Date()): string {
  const p = kstParts(d);
  return `${p.year}-${p.month}-${p.day}`;
}

/** ISO → datetime-local 입력값(KST) "YYYY-MM-DDTHH:mm". */
export function toKstInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = kstParts(d);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

/** datetime-local 입력값(KST로 해석) → ISO. 형식 불일치나 빈 값은 null. */
export function fromKstInput(v: string | null | undefined): string | null {
  const s = (v ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) return null;
  const d = new Date(`${s}:00+09:00`);
  if (Number.isNaN(d.getTime())) return null;
  // 2026-02-31 처럼 넘어가는 날짜 거부
  if (toKstInput(d.toISOString()) !== s) return null;
  return d.toISOString();
}

/** 관리자 목록 표시용 "2026.10.20 09:00" (KST). */
export function fmtKst(iso: string | null | undefined): string {
  if (!iso) return "";
  const p = kstParts(new Date(iso));
  return `${p.year}.${p.month}.${p.day} ${p.hour}:${p.minute}`;
}

// ---------------------------------------------------------------- 입력 검증

/** 버튼 링크: 내부 경로(/x, // 금지) 또는 https:// 만. 그 외 null. DB check 와 동일 규칙. */
export function safeCtaUrl(v: string | null | undefined): string | null {
  const s = (v ?? "").trim();
  if (!s) return null;
  if (/^\/($|[^/])/.test(s) && !/[\s<>"]/.test(s)) return s;
  if (/^https:\/\/[^\s<>"]+$/.test(s)) return s;
  return null;
}

export function safeImageUrl(v: string | null | undefined): string | null {
  const s = (v ?? "").trim();
  return /^https:\/\/[^\s<>"]+$/.test(s) ? s : null;
}
