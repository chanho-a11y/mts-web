/**
 * 서버측 커버 렌더 — 텍스트를 받아 브랜드 커버를 그린다 (D-108).
 *
 * 왜 서버에서 그리는가(D-107 실측):
 *   base64 전달은 커버 한 장에 약 6천 토큰이 들고, 반복 구간이 많은 이미지는
 *   전송 중 변형된다. 텍스트만 받으면 토큰 비용이 0이고 변형될 바이트가 없다.
 *   색·워드마크·태그라인은 코드가 아니라 site_setting 의 brand.* 토큰에서 오므로
 *   브랜드 편차도 구조적으로 0이다. 렌더 결과는 기존 파이프라인
 *   (해시 경로 → 검증 → 대장 → 스토리지)을 그대로 탄다.
 *
 * 경계 주의:
 *   next/og 에 의존한다 — 이 파일만은 Next 런타임 결합이다. 패키지 추출 시
 *   렌더러 어댑터(ToolContext.render)만 다른 구현으로 갈아끼우면 된다.
 *   그래서 index.ts 가 이 파일을 동적 import 한다(스모크 하네스는 가짜 렌더러를
 *   주입하므로 next 없이 돈다).
 *
 * 폰트:
 *   mcp/fonts/ 의 서브셋(woff)을 쓴다. 한글은 KS X 1001 완성형 2350자 —
 *   집합 밖 음절은 렌더 전에 명확히 거부한다(coverage.ts). satori 는 woff2 를
 *   읽지 못하므로 woff 로 서브셋했다. Vercel 번들에 포함시키려면
 *   next.config 의 outputFileTracingIncludes 가 필요하다.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { COVERED_SYLLABLES } from "./fonts/coverage";
import type { CoverFields } from "./types";

const W = 1200;
const H = 800;

/* ── 색 유틸 ── */

function pickHex(raw: string | undefined): string | null {
  const m = /#[0-9a-fA-F]{6}/.exec(raw ?? "");
  return m ? m[0].toUpperCase() : null;
}

function rgbOf(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function rgba(hex: string, a: number): string {
  const [r, g, b] = rgbOf(hex);
  return `rgba(${r},${g},${b},${a})`;
}

/** two hex 를 t(0..1) 비율로 섞는다. 파생색은 전부 여기서 나온다 — 상수를 새로 두지 않는다. */
function mix(hexA: string, hexB: string, t: number): string {
  const a = rgbOf(hexA);
  const b = rgbOf(hexB);
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * t));
  return `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/* ── 폰트 ── */

interface FontSpec {
  name: string;
  file: string;
  weight: 200 | 400 | 500 | 700 | 800;
}

const FONT_SPECS: FontSpec[] = [
  { name: "NotoSerifKR", file: "NotoSerifKR-700.woff", weight: 700 },
  { name: "Pretendard", file: "Pretendard-500.woff", weight: 500 },
  { name: "Pretendard", file: "Pretendard-800.woff", weight: 800 },
  { name: "Pretendard", file: "Pretendard-200.woff", weight: 200 },
  { name: "PlexMono", file: "PlexMono-400.woff", weight: 400 },
];

let fontsPromise: Promise<{ name: string; data: ArrayBuffer; weight: FontSpec["weight"]; style: "normal" }[]> | null = null;

function loadFonts() {
  if (!fontsPromise) {
    const dir = join(process.cwd(), "mcp", "fonts");
    fontsPromise = Promise.all(
      FONT_SPECS.map(async (s) => {
        const buf = await readFile(join(dir, s.file));
        return {
          name: s.name,
          data: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer,
          weight: s.weight,
          style: "normal" as const,
        };
      }),
    ).catch((e) => {
      fontsPromise = null; // 다음 호출이 다시 시도할 수 있게 한다
      throw new Error(
        `커버 폰트를 읽지 못했습니다: ${e instanceof Error ? e.message : String(e)}. ` +
          "mcp/fonts/ 배포 포함 여부(next.config outputFileTracingIncludes)를 확인하세요.",
      );
    });
  }
  return fontsPromise;
}

/** 서브셋 밖 한글 음절을 렌더 전에 잡는다. 빈 글자로 그려 놓고 통과시키는 것이 최악이다. */
function assertCovered(label: string, text: string): void {
  const missing = [...new Set(text)].filter(
    (ch) => ch >= "가" && ch <= "힣" && !COVERED_SYLLABLES.has(ch),
  );
  if (missing.length) {
    throw new Error(
      `${label}에 커버 폰트가 지원하지 않는 글자가 있습니다: ${missing.join(" ")} — ` +
        "다른 표현으로 바꾸거나 직접 만든 이미지를 data_base64 로 올리세요.",
    );
  }
}

/* ── 배경 아트 (thumb.html 의 SVG 기하를 그대로 가져왔다) ── */

interface ArtPalette {
  ringA: string; ringB: string; ringC: string;
  l1: string; f1: string; l2: string; f2: string; l3: string;
  l4: string; f4: string; dot: string; path: string;
}

function artSvg(p: ArtPalette): string {
  const petals = [0, 60, 120, 180, 240, 300]
    .map((r) => `<ellipse cx="0" cy="-44" rx="20" ry="46" transform="rotate(${r})"/>`)
    .join("");
  const spokes = [0, 45, 90, 135, 180, 225, 270, 315]
    .map((r) => `<line x1="0" y1="-66" x2="0" y2="-11" transform="rotate(${r})"/>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <circle cx="860" cy="380" r="470" fill="none" stroke="${p.ringC}" stroke-width="1"/>
  <circle cx="860" cy="380" r="330" fill="none" stroke="${p.ringB}" stroke-width="1" stroke-dasharray="1 9" stroke-linecap="round"/>
  <circle cx="860" cy="380" r="230" fill="none" stroke="${p.ringA}" stroke-width="1"/>
  <circle cx="860" cy="380" r="138" fill="none" stroke="${p.ringB}" stroke-width="1"/>
  <path d="M 745,181 Q 1030,190 1068,283 Q 1058,450 1014,551" fill="none" stroke="${p.path}" stroke-width="1.2" stroke-dasharray="2 9" stroke-linecap="round"/>
  <path d="M 745,181 Q 640,390 718,561" fill="none" stroke="${p.path}" stroke-width="1.2" stroke-dasharray="2 9" stroke-linecap="round"/>
  <g transform="translate(745,181)">
    <g stroke="${p.l1}" stroke-width="1.7" fill="${p.f1}">${petals}</g>
    <circle cx="0" cy="0" r="8" fill="${p.dot}"/>
  </g>
  <g transform="translate(1068,283)">
    <circle r="88" fill="${p.f2}" stroke="${p.l2}" stroke-width="1.7"/>
    <circle r="68" fill="none" stroke="${p.l2}" stroke-width="1"/>
    <g stroke="${p.l2}" stroke-width="1.2" stroke-linecap="round">${spokes}</g>
    <circle r="6.5" fill="${p.dot}"/>
  </g>
  <g transform="translate(718,561)">
    <path d="M 0,0 m 0,-8 a 8,8 0 1,1 -8,8 a 21,21 0 1,0 21,-21 a 35,35 0 1,1 -35,35 a 49,49 0 1,0 49,-49 a 63,63 0 1,1 -63,63" fill="none" stroke="${p.l3}" stroke-width="7.5" stroke-linecap="round"/>
  </g>
  <g transform="translate(1014,551)">
    <circle r="64" fill="${p.f4}" stroke="${p.l4}" stroke-width="1.7"/>
    <ellipse cx="0" cy="2" rx="20" ry="27" fill="none" stroke="${p.l4}" stroke-width="1.4" transform="rotate(-12)"/>
    <path d="M -3,-64 C -14,-38 -14,34 -3,64" fill="none" stroke="${p.l4}" stroke-width="1.2" stroke-linecap="round"/>
  </g>
</svg>`;
}

/* ── 엘리먼트 헬퍼 (JSX 없이 satori 트리를 만든다) ── */

type El = { type: string; props: Record<string, unknown> };

function h(type: string, style: Record<string, unknown>, children?: unknown, extra?: Record<string, unknown>): El {
  return { type, props: { ...extra, style, children } };
}

/* ── 본체 ── */

export async function renderCover(fields: CoverFields, tokens: Record<string, string>): Promise<Buffer> {
  // 브랜드 토큰 — 없으면 임의 기본값 대신 명확히 실패한다(패키지 원칙).
  const need = (key: string): string => {
    const hex = pickHex(tokens[key]);
    if (!hex) {
      throw new Error(`브랜드 토큰 ${key} 이 없거나 색상값이 아닙니다. site_setting 을 확인하세요.`);
    }
    return hex;
  };
  const bg = need("brand.color.bg");
  const surface = need("brand.color.surface");
  const text = need("brand.color.text");
  const textMuted = need("brand.color.text_muted");
  const key = need("brand.color.key");
  const keyDeep = pickHex(tokens["brand.color.key_deep"]) ?? mix(key, "#000000", 0.15);

  const brandName = (tokens["brand.identity.name"] ?? "").trim();
  if (!brandName) {
    throw new Error("브랜드 토큰 brand.identity.name 이 없습니다. site_setting 을 확인하세요.");
  }
  const [wmBold, ...wmRest] = brandName.split(" ");
  const wmLight = wmRest.join(" ");
  const tagline = (tokens["brand.identity.tagline"] ?? "").trim();

  const headline = fields.headline.trim();
  const eyebrow = (fields.eyebrow ?? "").trim();
  const notes = (fields.notes ?? "").trim().toUpperCase();
  const variant = fields.variant ?? "light";

  assertCovered("headline", headline);
  assertCovered("eyebrow", eyebrow);

  const dark = variant === "dark";
  const pal: ArtPalette = dark
    ? {
        ringA: rgba(surface, 0.16), ringB: rgba(surface, 0.13), ringC: rgba(surface, 0.07),
        l1: rgba(bg, 0.55), f1: rgba(bg, 0.035),
        l2: rgba(key, 0.8), f2: rgba(key, 0.1), l3: rgba(key, 0.6),
        l4: rgba(surface, 0.55), f4: rgba(surface, 0.09),
        dot: rgba(key, 0.95), path: rgba(surface, 0.22),
      }
    : {
        ringA: rgba(text, 0.14), ringB: rgba(text, 0.11), ringC: rgba(text, 0.07),
        l1: rgba(keyDeep, 0.55), f1: rgba(key, 0.05),
        l2: rgba(keyDeep, 0.85), f2: rgba(key, 0.14), l3: rgba(key, 0.85),
        l4: rgba(text, 0.42), f4: rgba(key, 0.12),
        dot: key, path: rgba(text, 0.18),
      };

  const background = dark
    ? `radial-gradient(circle at 78% 38%, ${mix(text, "#FFFFFF", 0.07)} 0%, ${text} 42%, ${mix(text, "#000000", 0.18)} 100%)`
    : `radial-gradient(circle at 78% 38%, ${mix(bg, "#FFFFFF", 0.35)} 0%, ${bg} 45%, ${mix(bg, surface, 0.6)} 100%)`;

  const cWm = dark ? bg : text;
  const cTag = dark ? rgba(surface, 0.55) : textMuted;
  const cEyebrow = dark ? rgba(surface, 0.78) : textMuted;
  const cH1 = dark ? mix(bg, "#FFFFFF", 0.4) : text;
  const cNotes = dark ? rgba(surface, 0.72) : textMuted;

  const artUri = `data:image/svg+xml;base64,${Buffer.from(artSvg(pal), "utf8").toString("base64")}`;

  const blockChildren: El[] = [
    h("div", { width: 56, height: 4, backgroundColor: key, borderRadius: 2, marginBottom: 22 }),
  ];
  if (eyebrow) {
    blockChildren.push(
      h("div", { fontFamily: "Pretendard", fontWeight: 500, fontSize: 19, color: cEyebrow, marginBottom: 20 }, eyebrow),
    );
  }
  blockChildren.push(
    h(
      "div",
      {
        fontFamily: "NotoSerifKR", fontWeight: 700, fontSize: 50, lineHeight: 1.3,
        letterSpacing: "-0.7px", color: cH1, whiteSpace: "pre-wrap",
      },
      headline,
    ),
  );
  if (notes) {
    blockChildren.push(
      h("div", { fontFamily: "PlexMono", fontWeight: 400, fontSize: 14, letterSpacing: "3.4px", color: cNotes, marginTop: 26 }, notes),
    );
  }

  const root = h(
    "div",
    { display: "flex", position: "relative", width: W, height: H, backgroundImage: background },
    [
      h("img", { position: "absolute", top: 0, left: 0, width: W, height: H }, undefined, {
        src: artUri, width: W, height: H,
      }),
      h(
        "div",
        { display: "flex", flexDirection: "row", position: "absolute", left: 64, top: 56, fontSize: 23, color: cWm },
        [
          h("div", { fontFamily: "Pretendard", fontWeight: 800 }, wmBold),
          wmLight ? h("div", { fontFamily: "Pretendard", fontWeight: 200, marginLeft: 7 }, wmLight) : "",
        ],
      ),
      tagline
        ? h(
            "div",
            { position: "absolute", right: 64, top: 58, fontFamily: "PlexMono", fontWeight: 400, fontSize: 12, letterSpacing: "5px", color: cTag },
            tagline.toUpperCase(),
          )
        : h("div", { display: "flex" }),
      h(
        "div",
        { display: "flex", flexDirection: "column", position: "absolute", left: 64, bottom: 70, width: 600, alignItems: "flex-start" },
        blockChildren,
      ),
    ],
  );

  const res = new ImageResponse(root as unknown as React.ReactElement, {
    width: W,
    height: H,
    fonts: await loadFonts(),
  });
  return Buffer.from(await res.arrayBuffer());
}
