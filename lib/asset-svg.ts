// 제품 데이터 → 브랜드 자산 SVG (key_color 테마). 디자인 스튜디오 이미지 절반(벡터).
// 추후 PNG 래스터화(Satori/Playwright)로 확장.
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

function lum(hex: string): number {
  const h = hex.replace("#", "");
  if (h.length < 6) return 0;
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}
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
const FONT = `-apple-system, "Helvetica Neue", "Apple SD Gothic Neo", "Noto Sans KR", Pretendard, sans-serif`;

export function thumbnailSVG(p: AssetProduct, b: AssetBrand): string {
  const key = p.key_color || "#1A1A1A";
  const light = lum(key) > 0.6;
  const fg = light ? "#1A1A1A" : "#FFFFFF";
  const titleLines = wrap(p.title_ko.replace(/\[.*?\]\s*/g, ""), 11, 3);
  const notes = (p.flavor_notes ?? []).slice(0, 3).join(" · ");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="${key}"/><stop offset="1" stop-color="${key}" stop-opacity="0.78"/></linearGradient></defs>
<rect width="1080" height="1080" fill="url(#g)"/>
<text x="64" y="96" font-family='${FONT}' font-size="30" font-weight="700" letter-spacing="2" fill="${fg}">${esc(b.name)}</text>
<text x="64" y="132" font-family='${FONT}' font-size="20" fill="${fg}" opacity="0.7">${esc(p.roast_level ?? "")}</text>
${titleLines.map((l, i) => `<text x="64" y="${560 + i * 92}" font-family='${FONT}' font-size="76" font-weight="700" fill="${fg}">${esc(l)}</text>`).join("")}
<text x="64" y="${560 + titleLines.length * 92 + 30}" font-family='${FONT}' font-size="34" fill="${fg}" opacity="0.9">${esc(notes)}</text>
<text x="64" y="1010" font-family='${FONT}' font-size="26" fill="${fg}" opacity="0.85">${p.minPrice ? "₩" + p.minPrice.toLocaleString() : ""}</text>
<text x="1016" y="1010" text-anchor="end" font-family='${FONT}' font-size="24" fill="${fg}" opacity="0.7">${esc(b.instagram)}</text>
</svg>`;
}

export function cardnewsSVG(p: AssetProduct, b: AssetBrand): string {
  const key = p.key_color || "#1A1A1A";
  const light = lum(key) > 0.6;
  const fg = light ? "#1A1A1A" : "#FFFFFF";
  const titleLines = wrap(p.title_ko.replace(/\[.*?\]\s*/g, ""), 12, 3);
  const oneLiner = wrap(p.one_liner ?? "", 22, 2);
  const notes = (p.flavor_notes ?? []).slice(0, 4).join("  ·  ");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">
<rect width="1080" height="1350" fill="${key}"/>
<text x="80" y="120" font-family='${FONT}' font-size="28" font-weight="700" letter-spacing="3" fill="${fg}">${esc(b.name)}</text>
<line x1="80" y1="150" x2="200" y2="150" stroke="${fg}" stroke-width="3"/>
${titleLines.map((l, i) => `<text x="80" y="${640 + i * 96}" font-family='${FONT}' font-size="82" font-weight="700" fill="${fg}">${esc(l)}</text>`).join("")}
${oneLiner.map((l, i) => `<text x="80" y="${640 + titleLines.length * 96 + 50 + i * 44}" font-family='${FONT}' font-size="34" fill="${fg}" opacity="0.9">${esc(l)}</text>`).join("")}
<text x="80" y="1240" font-family='${FONT}' font-size="32" fill="${fg}" opacity="0.95">${esc(notes)}</text>
<text x="80" y="1300" font-family='${FONT}' font-size="24" fill="${fg}" opacity="0.65">${esc(b.instagram)} · everyday excellence</text>
</svg>`;
}
