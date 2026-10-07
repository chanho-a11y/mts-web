/**
 * 사진 패널 렌더 — 단일 이미지 게시물용 (D-139).
 *
 * 사진을 화면 가득 깔고 그 위에 paper 색 패널을 얹는다. 패널 안의 글자 배치는
 * feed-portrait 와 같은 순서(키 룰 → 소개줄 → 헤드라인 → 본문 → 모노 라벨)를 그대로 따른다.
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
import { assertCovered, h, loadFonts, mix, pickHex, type El } from "./render";
import { PHOTO_H, PHOTO_W, type PhotoPanelDesign } from "./photo-design";

export {
  PHOTO_H, PHOTO_SERIES, PHOTO_SERIES_LABEL, PHOTO_W, parsePhotoDesign, photoDesignTexts,
  type PhotoPanelDesign, type PhotoPanelRow, type PhotoSeries,
} from "./photo-design";

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

  const inset = 44;
  const padX = 56;
  const isScene = design.series === "scene";
  const h1Size = big ? 40 : isScene ? 48 : headline.length > 22 ? 52 : 58;

  const block: El[] = [];

  // 머리줄: 워드마크(좌) + 시리즈 라벨(우)
  block.push(
    h("div", { display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center", width: "100%" }, [
      h("div", { display: "flex", flexDirection: "row", fontSize: 22, color: text }, [
        h("div", { fontFamily: "Pretendard", fontWeight: 800 }, wmBold),
        wmLight ? h("div", { fontFamily: "Pretendard", fontWeight: 200, marginLeft: 6 }, wmLight) : h("div", { display: "flex" }),
      ]),
      label
        ? h("div", { fontFamily: "PlexMono", fontWeight: 400, fontSize: 17, letterSpacing: "4px", color: textMuted }, label)
        : h("div", { display: "flex" }),
    ]),
  );

  // 키 룰 + 포인트 컬러 점
  block.push(
    h("div", { display: "flex", flexDirection: "row", alignItems: "center", marginTop: 34, marginBottom: 24 }, [
      h("div", { width: 60, height: 5, backgroundColor: key, borderRadius: 3 }),
      design.accent
        ? h("div", { width: 14, height: 14, borderRadius: 7, backgroundColor: design.accent, marginLeft: 14 })
        : h("div", { display: "flex" }),
    ]),
  );

  if (eyebrow) {
    block.push(h("div", { fontFamily: "Pretendard", fontWeight: 500, fontSize: 26, color: textMuted, marginBottom: 16 }, eyebrow));
  }
  if (big) {
    block.push(
      h(
        "div",
        { fontFamily: "NotoSerifKR", fontWeight: 700, fontSize: 150, lineHeight: 1.05, letterSpacing: "-3px", color: text, marginBottom: 14 },
        big,
      ),
    );
  }
  block.push(
    h(
      "div",
      { fontFamily: "NotoSerifKR", fontWeight: 700, fontSize: h1Size, lineHeight: 1.3, letterSpacing: "-0.8px", color: text, whiteSpace: "pre-wrap" },
      headline,
    ),
  );
  if (body) {
    block.push(
      h(
        "div",
        { fontFamily: "Pretendard", fontWeight: 500, fontSize: 28, lineHeight: 1.55, color: mix(text, bg, 0.15), marginTop: 22, whiteSpace: "pre-wrap" },
        body,
      ),
    );
  }
  if (rows.length) {
    block.push(
      h(
        "div",
        { display: "flex", flexDirection: "column", width: "100%", marginTop: 26, borderBottom: `1px solid ${border}` },
        rows.map((r) =>
          h(
            "div",
            {
              display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center",
              width: "100%", paddingTop: 15, paddingBottom: 15, borderTop: `1px solid ${border}`,
            },
            [
              h("div", { fontFamily: "Pretendard", fontWeight: 500, fontSize: 27, color: textMuted }, r.k),
              h("div", { fontFamily: "PlexMono, Pretendard", fontWeight: 400, fontSize: 30, color: text }, r.v),
            ],
          ),
        ),
      ),
    );
  }
  if (notes) {
    block.push(
      h("div", { fontFamily: "PlexMono, Pretendard", fontWeight: 400, fontSize: 17, letterSpacing: "3.4px", color: textMuted, marginTop: 28 }, notes),
    );
  }

  const panelPos = design.panel_pos === "top" ? { top: inset } : { bottom: inset };

  const root = h("div", { display: "flex", position: "relative", width: PHOTO_W, height: PHOTO_H, backgroundColor: text, overflow: "hidden" }, [
    h("img", { position: "absolute", left, top, width: dw, height: dh }, undefined, { src: photoUri, width: dw, height: dh }),
    h(
      "div",
      {
        display: "flex", flexDirection: "column", alignItems: "flex-start", position: "absolute",
        left: inset, width: PHOTO_W - inset * 2, ...panelPos,
        backgroundColor: paper, borderRadius: 4,
        paddingTop: 44, paddingBottom: 48, paddingLeft: padX, paddingRight: padX,
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
