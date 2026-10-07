/**
 * 사진 패널 렌더 — 단일 이미지 게시물용 (D-139).
 *
 * 사진을 화면 가득 깔고 그 위에 paper 색 패널을 얹는다.
 * D-141: 패널 높이는 이미지 높이의 1/3 로 고정하고, 바탕은 반투명(panel_opacity)이다.
 * 패널 안은 2단이다. 왼쪽에 소개줄, 큰 숫자, 헤드라인을 두고 오른쪽에 표 또는 본문을 둔다.
 * 오른쪽에 둘 것이 없으면(현장 한 장) 한 단으로 쓴다. 칸을 많이 채워 넘치면 글자를 줄인다.
 * 숫자 한 장, 레시피 한 장, 용어 한 장, 컵 노트 한 장, 현장 한 장이 전부 이 템플릿 하나를 쓰고,
 * 어떤 칸을 채웠는지로만 모양이 갈린다. 그래서 관리자 수정 화면도 폼 하나로 끝난다.
 *
 * 디자인 데이터(PhotoPanelDesign)는 social_post.media[0].design 에 그대로 저장된다.
 * 관리자가 글자나 사진을 바꾸면 같은 데이터로 다시 그린다. 그린 결과는 PNG 이고
 * JPEG 변환과 저장은 호출부가 한다.
 *
 * 경계 주의: render.ts 와 같이 next/og 에 결합된다.
 */
import { ImageResponse } from "next/og";
import { assertCovered, h, loadFonts, mix, pickHex, rgba, type El } from "./render";
import { PANEL_H, PHOTO_H, PHOTO_W, panelOpacityOf, type PhotoPanelDesign } from "./photo-design";

export {
  PANEL_H, PANEL_OPACITY_DEFAULT, PANEL_OPACITY_MAX, PANEL_OPACITY_MIN, panelOpacityOf,
  PHOTO_H, PHOTO_SERIES, PHOTO_SERIES_LABEL, PHOTO_W, parsePhotoDesign, photoDesignTexts,
  type PhotoPanelDesign, type PhotoPanelRow, type PhotoSeries,
} from "./photo-design";

/* ── 글자 폭 어림 ── satori 에 맡기기 전에 줄 수와 글자 크기를 정하려고 쓴다. 단위는 em. */
function emWidth(line: string): number {
  let w = 0;
  for (const ch of line) {
    if (ch === " ") w += 0.3;
    else if (ch >= "\u1100") w += 1; // 한글과 전각
    else if (/[A-Z0-9]/.test(ch)) w += 0.64;
    else if (/[a-z]/.test(ch)) w += 0.54;
    else w += 0.34; // 쉼표, 마침표, 콜론 등
  }
  return w;
}

function wrapCount(line: string, fontSize: number, width: number): number {
  return Math.max(1, Math.ceil((emWidth(line) * fontSize) / width - 0.02));
}

function lineCount(text: string, fontSize: number, width: number): number {
  return text.split("\n").reduce((sum, line) => sum + wrapCount(line, fontSize, width), 0);
}

export interface PhotoSource {
  /** JPEG 또는 PNG 바이트 */
  bytes: Buffer;
  mime: "image/jpeg" | "image/png";
  width: number;
  height: number;
}

export async function renderPhotoPanel(
  design: PhotoPanelDesign,
  tokens: Record<string, string>,
  photo: PhotoSource,
): Promise<Buffer> {
  const need = (key: string): string => {
    const hex = pickHex(tokens[key]);
    if (!hex) throw new Error(`브랜드 토큰 ${key} 이 없거나 색상값이 아닙니다. site_setting 을 확인하세요.`);
    return hex;
  };
  const bg = need("brand.color.bg");
  const text = need("brand.color.text");
  const textMuted = need("brand.color.text_muted");
  const key = need("brand.color.key");
  const border = pickHex(tokens["brand.color.border"]) ?? mix(bg, text, 0.12);
  // paper 는 토큰에 없다. oat 를 흰색 쪽으로 당겨 만든다(카드뉴스 v2 의 paper 와 같은 계열).
  const paper = mix(bg, "#FFFFFF", 0.78);

  const brandName = (tokens["brand.identity.name"] ?? "").trim();
  if (!brandName) throw new Error("브랜드 토큰 brand.identity.name 이 없습니다. site_setting 을 확인하세요.");
  const [wmBold, ...wmRest] = brandName.split(" ");
  const wmLight = wmRest.join(" ");

  const label = (design.label ?? "").trim().toUpperCase();
  const eyebrow = (design.eyebrow ?? "").trim();
  const big = (design.big ?? "").trim();
  const headline = design.headline.trim();
  const body = (design.body ?? "").trim();
  const notes = (design.notes ?? "").trim().toUpperCase();
  const rows = design.rows ?? [];

  assertCovered("소개줄", eyebrow);
  assertCovered("헤드라인", headline);
  assertCovered("본문", body);
  assertCovered("큰 숫자", big);
  for (const r of rows) {
    assertCovered("표", r.k);
    assertCovered("표", r.v);
  }

  // ── 사진: 화면을 가득 채우도록 키우고, focus 로 보이는 부분을 고른다 ──
  const scale = Math.max(PHOTO_W / photo.width, PHOTO_H / photo.height);
  const dw = Math.ceil(photo.width * scale);
  const dh = Math.ceil(photo.height * scale);
  const fx = (design.focus_x ?? 50) / 100;
  const fy = (design.focus_y ?? 50) / 100;
  const left = -Math.round((dw - PHOTO_W) * fx);
  const top = -Math.round((dh - PHOTO_H) * fy);
  const photoUri = `data:${photo.mime};base64,${photo.bytes.toString("base64")}`;

  // ── 패널: 높이는 이미지의 1/3 로 고정, 바탕은 반투명 (D-141) ──
  const inset = 44;
  const padX = 52;
  const padY = 34;
  const panelW = PHOTO_W - inset * 2;
  const innerW = panelW - padX * 2;
  const innerH = PANEL_H - padY * 2;
  const opacity = panelOpacityOf(design.panel_opacity) / 100;

  const HEAD_H = 26; // 머리줄(워드마크와 시리즈 라벨)
  const RULE_MT = 20;
  const RULE_MB = 22;
  const RULE_H = 5;
  const NOTES_H = notes ? 38 : 0; // 하단 모노 라벨과 그 위 여백
  const mainH = innerH - HEAD_H - RULE_MT - RULE_H - RULE_MB - NOTES_H;

  // 오른쪽 단에는 표가 먼저, 표가 없으면 본문이 들어간다. 둘 다 없으면 한 단으로 쓴다.
  const rightKind: "rows" | "body" | null = rows.length ? "rows" : body ? "body" : null;
  const leftBody = rows.length && body ? body : "";
  const colGap = 40;
  const colW = rightKind ? Math.floor((innerW - colGap) / 2) : innerW;

  // 왼쪽 단: 소개줄 → 큰 숫자 → 헤드라인 (→ 표가 있을 때의 본문)
  const headLines = headline.split("\n");
  const headBase = big ? 32 : rightKind ? 46 : 52;
  const headLongest = Math.max(...headLines.map(emWidth));
  let headSize = Math.max(26, Math.min(headBase, Math.floor((colW * 0.96) / Math.max(headLongest, 1))));
  let eyebrowSize = 24;
  let bigSize = 96;
  let leftBodySize = 21;
  const leftHeight = () =>
    (eyebrow ? eyebrowSize * 1.3 + 10 : 0) +
    (big ? bigSize * 1.05 + 8 : 0) +
    headLines.reduce((sum, line) => sum + wrapCount(line, headSize, colW), 0) * headSize * 1.28 +
    (leftBody ? 12 + lineCount(leftBody, leftBodySize, colW) * leftBodySize * 1.5 : 0);
  const leftNeed = leftHeight();
  if (leftNeed > mainH) {
    // 칸을 많이 채워 넘치면 왼쪽 단 글자를 같은 비율로 줄인다. 패널 높이는 바꾸지 않는다.
    const f = Math.max(0.45, mainH / leftNeed);
    headSize = Math.floor(headSize * f);
    eyebrowSize = Math.floor(eyebrowSize * f);
    bigSize = Math.floor(bigSize * f);
    leftBodySize = Math.floor(leftBodySize * f);
  }

  // 오른쪽 단
  // 본문은 적어 준 줄바꿈대로 보이도록, 줄이 넘어가지 않는 크기까지 줄인다(하한 20). 그래도 높이를 넘으면 더 줄인다.
  let rightBodySize = 28;
  if (rightKind === "body") {
    const explicit = body.split("\n").length;
    while (rightBodySize > 20 && lineCount(body, rightBodySize, colW) > explicit) rightBodySize -= 1;
    while (rightBodySize > 16 && lineCount(body, rightBodySize, colW) * rightBodySize * 1.5 > mainH) rightBodySize -= 1;
  }
  const rowKeySize = 25;
  const rowValSize = 27;
  const rowPad = rows.length
    ? Math.max(4, Math.min(14, Math.floor(((mainH - 2) / rows.length - rowValSize * 1.25 - 1) / 2)))
    : 0;

  const leftCol: El[] = [];
  if (eyebrow) {
    leftCol.push(
      h("div", { fontFamily: "Pretendard", fontWeight: 500, fontSize: eyebrowSize, lineHeight: 1.3, color: textMuted, marginBottom: 10 }, eyebrow),
    );
  }
  if (big) {
    leftCol.push(
      h(
        "div",
        { fontFamily: "NotoSerifKR", fontWeight: 700, fontSize: bigSize, lineHeight: 1.05, letterSpacing: "-2px", color: text, marginBottom: 8 },
        big,
      ),
    );
  }
  leftCol.push(
    h(
      "div",
      { fontFamily: "NotoSerifKR", fontWeight: 700, fontSize: headSize, lineHeight: 1.28, letterSpacing: "-0.6px", color: text, whiteSpace: "pre-wrap" },
      headline,
    ),
  );
  if (leftBody) {
    leftCol.push(
      h(
        "div",
        { fontFamily: "Pretendard", fontWeight: 500, fontSize: leftBodySize, lineHeight: 1.5, color: text, marginTop: 12, whiteSpace: "pre-wrap" },
        leftBody,
      ),
    );
  }

  let rightCol: El | null = null;
  if (rightKind === "rows") {
    rightCol = h(
      "div",
      { display: "flex", flexDirection: "column", width: colW, borderBottom: `1px solid ${border}` },
      rows.map((r) =>
        h(
          "div",
          {
            display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center",
            width: "100%", paddingTop: rowPad, paddingBottom: rowPad, borderTop: `1px solid ${border}`,
          },
          [
            h("div", { fontFamily: "Pretendard", fontWeight: 500, fontSize: rowKeySize, color: textMuted }, r.k),
            h("div", { fontFamily: "PlexMono, Pretendard", fontWeight: 400, fontSize: rowValSize, color: text }, r.v),
          ],
        ),
      ),
    );
  } else if (rightKind === "body") {
    rightCol = h(
      "div",
      {
        display: "flex", width: colW, fontFamily: "Pretendard", fontWeight: 500, fontSize: rightBodySize, lineHeight: 1.5,
        color: text, whiteSpace: "pre-wrap",
      },
      body,
    );
  }

  const block: El[] = [];

  // 머리줄: 워드마크(좌) + 시리즈 라벨(우)
  block.push(
    h("div", { display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center", width: "100%", height: HEAD_H }, [
      h("div", { display: "flex", flexDirection: "row", fontSize: 21, color: text }, [
        h("div", { fontFamily: "Pretendard", fontWeight: 800 }, wmBold),
        wmLight ? h("div", { fontFamily: "Pretendard", fontWeight: 200, marginLeft: 6 }, wmLight) : h("div", { display: "flex" }),
      ]),
      label
        ? h("div", { fontFamily: "PlexMono", fontWeight: 400, fontSize: 16, letterSpacing: "4px", color: textMuted }, label)
        : h("div", { display: "flex" }),
    ]),
  );

  // 키 룰 + 포인트 컬러 점
  block.push(
    h("div", { display: "flex", flexDirection: "row", alignItems: "center", height: RULE_H, marginTop: RULE_MT, marginBottom: RULE_MB }, [
      h("div", { width: 60, height: RULE_H, backgroundColor: key, borderRadius: 3 }),
      design.accent
        ? h("div", { width: 14, height: 14, borderRadius: 7, backgroundColor: design.accent, marginLeft: 14 })
        : h("div", { display: "flex" }),
    ]),
  );

  // 본문 영역: 왼쪽 단과 오른쪽 단
  block.push(
    h(
      "div",
      { display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", width: "100%", height: mainH, overflow: "hidden" },
      [
        h("div", { display: "flex", flexDirection: "column", alignItems: "flex-start", width: colW }, leftCol),
        rightCol ?? h("div", { display: "flex" }),
      ],
    ),
  );

  if (notes) {
    block.push(
      h(
        "div",
        { display: "flex", alignItems: "flex-end", height: NOTES_H, fontFamily: "PlexMono, Pretendard", fontWeight: 400, fontSize: 16, letterSpacing: "3.2px", color: textMuted },
        notes,
      ),
    );
  }

  const panelPos = design.panel_pos === "top" ? { top: inset } : { bottom: inset };

  const root = h("div", { display: "flex", position: "relative", width: PHOTO_W, height: PHOTO_H, backgroundColor: text, overflow: "hidden" }, [
    h("img", { position: "absolute", left, top, width: dw, height: dh }, undefined, { src: photoUri, width: dw, height: dh }),
    h(
      "div",
      {
        display: "flex", flexDirection: "column", alignItems: "flex-start", position: "absolute",
        left: inset, width: panelW, height: PANEL_H, ...panelPos,
        backgroundColor: rgba(paper, opacity), borderRadius: 4, overflow: "hidden",
        paddingTop: padY, paddingBottom: padY, paddingLeft: padX, paddingRight: padX,
      },
      block,
    ),
  ]);

  const res = new ImageResponse(root as unknown as React.ReactElement, {
    width: PHOTO_W,
    height: PHOTO_H,
    fonts: await loadFonts(),
  });
  return Buffer.from(await res.arrayBuffer());
}
