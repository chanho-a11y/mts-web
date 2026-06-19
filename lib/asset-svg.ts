// 제품 데이터 → 브랜드 자산 SVG (Brand Redesign v2: oat/clay/ink · Helvetica/Spectral/Plex Mono).
export interface AssetProduct {
  title_ko: string;
  title_en?: string | null;
  one_liner?: string | null;
  flavor_notes?: string[] | null;
  roast_level?: string | null;
  key_color?: string | null;
  minPrice?: number;
}
export interface AssetBrand { name: string; instagram: string }
export interface AssetTemplate { accent?: string | null; font?: string | null }

// 브랜드 팔레트
const OAT = "#F6F1E7", INK = "#3C352C", INK_SOFT = "#8A8173", CLAY_DEEP = "#B0764A", LINE = "#E3DAC8", GRID = "#ECE0CB";
const SANS = `"Helvetica Neue", Pretendard, Arial, sans-serif`;
const SERIF = `Spectral, "Noto Serif KR", Georgia, serif`;
const MONO = `"IBM Plex Mono", monospace`;

function esc(s: string): string {
  return (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function wrap(s: string, perLine: number, maxLines: number): string[] {
  const out: string[] = [];
  let cur = "";
  for (const ch of (s ?? "")) {
    if ([...cur].length >= perLine) { out.push(cur); cur = ""; if (out.length >= maxLines) break; }
    cur += ch;
  }
  if (cur && out.length < maxLines) out.push(cur);
  return out;
}
function gridPattern(id: string, size: number): string {
  return `<pattern id="${id}" width="${size}" height="${size}" patternUnits="userSpaceOnUse">
<path d="M ${size} 0 L 0 0 0 ${size}" fill="none" stroke="${GRID}" stroke-width="1"/></pattern>`;
}

export function thumbnailSVG(p: AssetProduct, b: AssetBrand, tpl?: AssetTemplate): string {
  const point = tpl?.accent || p.key_color || CLAY_DEEP;
  const sans = tpl?.font || SANS;
  const title = p.title_ko.replace(/\[.*?\]\s*/g, "");
  const titleLines = wrap(title, 11, 3);
  const notes = (p.flavor_notes ?? []).slice(0, 3).join(" · ");
  const baseY = 600 - (titleLines.length - 1) * 46;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">
<defs>${gridPattern("g", 32)}</defs>
<rect width="1080" height="1080" fill="${OAT}"/>
<rect width="1080" height="1080" fill="url(#g)"/>
<text x="64" y="92" font-family='${MONO}' font-size="22" letter-spacing="2" fill="${INK_SOFT}">MTSPACE COFFEE</text>
<circle cx="1016" cy="84" r="11" fill="${point}"/>
<line x1="64" y1="120" x2="180" y2="120" stroke="${point}" stroke-width="3"/>
${titleLines.map((l, i) => `<text x="540" y="${baseY + i * 92}" text-anchor="middle" font-family='${sans}' font-size="78" font-weight="800" fill="${INK}">${esc(l)}</text>`).join("")}
<text x="540" y="${baseY + titleLines.length * 92 + 16}" text-anchor="middle" font-family='${SERIF}' font-style="italic" font-size="34" fill="${CLAY_DEEP}">${esc(notes)}</text>
<line x1="64" y1="980" x2="1016" y2="980" stroke="${LINE}" stroke-width="1"/>
<text x="64" y="1028" font-family='${MONO}' font-size="22" letter-spacing="1" fill="${INK_SOFT}">SINGLE ORIGIN</text>
<text x="1016" y="1028" text-anchor="end" font-family='${MONO}' font-size="22" fill="${INK}">${p.minPrice ? "KRW " + p.minPrice.toLocaleString() : esc(b.instagram)}</text>
</svg>`;
}

export function cardnewsSVG(p: AssetProduct, b: AssetBrand, tpl?: AssetTemplate): string {
  const point = tpl?.accent || p.key_color || CLAY_DEEP;
  const sans = tpl?.font || SANS;
  const title = p.title_ko.replace(/\[.*?\]\s*/g, "");
  const titleLines = wrap(title, 12, 3);
  const oneLiner = wrap(p.one_liner ?? "", 24, 2);
  const notes = (p.flavor_notes ?? []).slice(0, 4).join("  ·  ");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">
<defs>${gridPattern("g", 48)}</defs>
<rect width="1080" height="1350" fill="${OAT}"/>
<rect width="1080" height="1350" fill="url(#g)"/>
<text x="80" y="120" font-family='${MONO}' font-size="24" letter-spacing="3" fill="${INK_SOFT}">MTSPACE COFFEE</text>
<circle cx="1000" cy="112" r="13" fill="${point}"/>
<line x1="80" y1="150" x2="220" y2="150" stroke="${point}" stroke-width="4"/>
${titleLines.map((l, i) => `<text x="80" y="${560 + i * 96}" font-family='${sans}' font-size="84" font-weight="800" fill="${INK}">${esc(l)}</text>`).join("")}
${oneLiner.map((l, i) => `<text x="80" y="${560 + titleLines.length * 96 + 56 + i * 50}" font-family='${SERIF}' font-style="italic" font-size="40" fill="${CLAY_DEEP}">${esc(l)}</text>`).join("")}
<line x1="80" y1="1180" x2="1000" y2="1180" stroke="${LINE}" stroke-width="1"/>
<text x="80" y="1240" font-family='${MONO}' font-size="30" fill="${INK}">${esc(notes)}</text>
<text x="80" y="1295" font-family='${MONO}' font-size="22" letter-spacing="2" fill="${INK_SOFT}">${esc(b.instagram)} · EVERYDAY EXCELLENCE</text>
</svg>`;
}
