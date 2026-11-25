// 제품 대표 썸네일(1080x1080) SVG. 영문 위주(D-175): 영문 제품명이 크게, 국문명은 작은 보조줄,
// 컵노트는 영문. 스튜디오 썸네일 탭과 일괄 교체 스크립트가 같은 함수를 쓴다.
// 밝은 키 컬러(상대 휘도 0.6 초과)는 흰 글자가 안 보이므로 잉크색(#3C352C)으로 쓴다.

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function luminance(hex: string): number {
  const m = hex.replace("#", "").match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return 0;
  const ch = [m[1], m[2], m[3]].map((h) => {
    const c = parseInt(h, 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

function wrapWords(s: string, perLine: number): string[] {
  const words = s.split(/\s+/).filter(Boolean);
  const out: string[] = [];
  let cur = "";
  for (const w of words) {
    if (cur && (cur + " " + w).length > perLine) { out.push(cur); cur = w; } else cur = cur ? cur + " " + w : w;
  }
  if (cur) out.push(cur);
  return out;
}

function titleCase(s: string): string {
  return s.split(/\s+/).map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w)).join(" ");
}

export function thumbSquare(accent: string, enName: string, koName: string, notesEn: string[]): string {
  const W = 1080, H = 1080;
  const light = luminance(accent) > 0.6;
  const fg = light ? "#3C352C" : "#FFFFFF";
  const name = (enName || koName || "Product").replace(/\[.*?\]\s*/g, "").trim();
  const ko = (koName || "").replace(/\[.*?\]\s*/g, "").trim();

  // 제목: 16자 기준 줄바꿈, 최대 3줄. 줄 수가 늘면 글자 크기를 줄인다.
  let lines = wrapWords(name, 16);
  if (lines.length > 3) lines = [lines[0], lines[1], lines.slice(2).join(" ")];
  const size = lines.length === 1 ? 108 : lines.length === 2 ? 96 : 84;
  const lh = Math.round(size * 1.08);

  // 컵노트: 최대 4개, 합쳐서 40자를 넘으면 3개
  const ns = notesEn.map((n) => titleCase(n.trim())).filter(Boolean);
  let picked = ns.slice(0, 4);
  if (picked.join(", ").length > 40) picked = ns.slice(0, 3);
  const notes = picked.join(", ");
  const notesSize = notes.length > 34 ? 40 : 46;

  // 세로 배치: 제목 묶음 + 국문줄 + 노트를 화면 중앙(540) 근처에 둔다.
  const block = lines.length * lh + (ko ? 64 : 0) + (notes ? 76 : 0);
  const top = 540 - block / 2 + size * 0.8;

  const sans = "Helvetica Neue, Pretendard, Arial, sans-serif";
  const mono = "IBM Plex Mono, monospace";
  let y = top;
  let body = "";
  for (const l of lines) {
    body += `<text x="${W / 2}" y="${y}" text-anchor="middle" fill="${fg}" font-family="${sans}" font-weight="800" font-size="${size}" letter-spacing="-1">${esc(l)}</text>`;
    y += lh;
  }
  y = y - lh + 70;
  if (ko) {
    body += `<text x="${W / 2}" y="${y}" text-anchor="middle" fill="${fg}" opacity="0.85" font-family="Pretendard, ${sans}" font-weight="500" font-size="32" letter-spacing="1">${esc(ko)}</text>`;
    y += 76;
  }
  if (notes) {
    body += `<text x="${W / 2}" y="${y}" text-anchor="middle" fill="${fg}" opacity="0.95" font-family="Spectral, serif" font-style="italic" font-size="${notesSize}">${esc(notes)}</text>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`
    + `<rect width="${W}" height="${H}" fill="${accent}"/>`
    + `<text x="64" y="100" fill="${fg}" opacity="0.85" font-family="${sans}" font-weight="800" font-size="30" letter-spacing="2">MTSPACE <tspan font-weight="300">COFFEE</tspan></text>`
    + `<circle cx="${W - 72}" cy="90" r="13" fill="${fg}" opacity="0.9"/>`
    + body
    + `<line x1="64" y1="980" x2="${W - 64}" y2="980" stroke="${fg}" stroke-opacity="0.35" stroke-width="1"/>`
    + `<text x="64" y="1028" fill="${fg}" opacity="0.8" font-family="${mono}" font-size="24">everyday excellence</text>`
    + `<text x="${W - 64}" y="1028" text-anchor="end" fill="${fg}" opacity="0.8" font-family="${mono}" font-size="24">@mtspacecoffee</text>`
    + `</svg>`;
}
