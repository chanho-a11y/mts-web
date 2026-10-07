/**
 * 사진 패널 디자인 데이터 — 타입과 검증 (D-139).
 *
 * 렌더(render-photo.ts)와 달리 next/og 에 의존하지 않는다. 관리자 화면과 일괄 등록이
 * 렌더러를 끌어오지 않고 타입과 검증만 쓸 수 있게 따로 둔다.
 * 디자인 데이터는 social_post.media[0].design 에 그대로 저장된다.
 */

function pickHex(raw: string | undefined): string | null {
  const m = /#[0-9a-fA-F]{6}/.exec(raw ?? "");
  return m ? m[0].toUpperCase() : null;
}

export const PHOTO_SERIES = ["number", "recipe", "term", "cupnote", "scene"] as const;
export type PhotoSeries = (typeof PHOTO_SERIES)[number];

export const PHOTO_SERIES_LABEL: Record<PhotoSeries, string> = {
  number: "숫자 한 장",
  recipe: "레시피 한 장",
  term: "용어 한 장",
  cupnote: "컵 노트 한 장",
  scene: "현장 한 장",
};

export interface PhotoPanelRow {
  k: string;
  v: string;
}

export interface PhotoPanelDesign {
  v: 1;
  template: "photo-panel";
  series: PhotoSeries;
  /** 사진 라이브러리의 이름(확장자 없음). 스토리지 social/photos/full/<이름>.jpg */
  photo: string;
  /** 사진에서 보여줄 중심. 0~100, 기본 50 */
  focus_x?: number;
  focus_y?: number;
  /** 패널 위치. 피사체가 아래쪽에 있으면 top 으로 올린다 */
  panel_pos?: "bottom" | "top";
  /** 패널 우상단 모노 라벨(영문 대문자) */
  label?: string;
  eyebrow?: string;
  /** 큰 숫자(예: 7:3). 있으면 헤드라인이 한 단계 작아진다 */
  big?: string;
  headline: string;
  body?: string;
  rows?: PhotoPanelRow[];
  /** 하단 모노 라벨 */
  notes?: string;
  /** 제품 포인트 컬러. 작은 점 하나에만 쓴다 */
  accent?: string;
}

export const PHOTO_W = 1080;
export const PHOTO_H = 1350;

const NAME_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;

function clampNum(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(100, Math.max(0, Math.round(n)));
}

function str(v: unknown, max: number, label: string): string {
  const s = typeof v === "string" ? v.replace(/\r\n?/g, "\n").trim() : "";
  if (s.length > max) throw new Error(`${label} 은(는) ${max}자 이하로 적어 주세요(현재 ${s.length}자).`);
  return s;
}

/** 외부 입력(폼, JSON)을 검증해 디자인 데이터로 만든다. 틀리면 사람이 읽을 수 있는 오류를 던진다. */
export function parsePhotoDesign(input: unknown): PhotoPanelDesign {
  const o = (input ?? {}) as Record<string, unknown>;
  const series = String(o.series ?? "") as PhotoSeries;
  if (!PHOTO_SERIES.includes(series)) throw new Error("시리즈 값이 올바르지 않습니다.");
  const photo = String(o.photo ?? "").trim();
  if (!NAME_RE.test(photo)) throw new Error("배경 사진을 선택해 주세요.");
  const headline = str(o.headline, 60, "헤드라인");
  if (headline.length < 2) throw new Error("헤드라인을 적어 주세요.");
  if (headline.split("\n").length > 3) throw new Error("헤드라인은 3줄 이하로 적어 주세요.");

  const rowsIn = Array.isArray(o.rows) ? o.rows : [];
  if (rowsIn.length > 5) throw new Error("표는 5줄 이하로 적어 주세요.");
  const rows: PhotoPanelRow[] = rowsIn
    .map((r) => {
      const rr = (r ?? {}) as Record<string, unknown>;
      return { k: str(rr.k, 16, "표의 항목 이름"), v: str(rr.v, 28, "표의 값") };
    })
    .filter((r) => r.k && r.v);

  const accentRaw = String(o.accent ?? "").trim();
  const accent = accentRaw ? pickHex(accentRaw) : null;
  if (accentRaw && !accent) throw new Error("포인트 컬러는 #RRGGBB 형식으로 적어 주세요.");

  const body = str(o.body, 150, "본문");
  if (body.split("\n").length > 4) throw new Error("본문은 4줄 이하로 적어 주세요.");

  const d: PhotoPanelDesign = {
    v: 1,
    template: "photo-panel",
    series,
    photo,
    focus_x: clampNum(o.focus_x, 50),
    focus_y: clampNum(o.focus_y, 50),
    panel_pos: o.panel_pos === "top" ? "top" : "bottom",
    headline,
  };
  const label = str(o.label, 24, "우상단 라벨");
  const eyebrow = str(o.eyebrow, 40, "소개줄");
  const big = str(o.big, 8, "큰 숫자");
  const notes = str(o.notes, 60, "하단 라벨");
  if (label) d.label = label;
  if (eyebrow) d.eyebrow = eyebrow;
  if (big) d.big = big;
  if (body) d.body = body;
  if (rows.length) d.rows = rows;
  if (notes) d.notes = notes;
  if (accent) d.accent = accent;
  return d;
}

/** 디자인에 들어간 사람이 읽는 글자 전부. 금지 표현 검사에 쓴다. */
export function photoDesignTexts(d: PhotoPanelDesign): string[] {
  return [d.label, d.eyebrow, d.big, d.headline, d.body, d.notes, ...(d.rows ?? []).flatMap((r) => [r.k, r.v])].filter(
    (s): s is string => !!s,
  );
}
