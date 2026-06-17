// 제품 데이터 → 콘텐츠 초안 자동 생성 (템플릿 기반; AIEO/SEO 텍스트).
// 이미지 자산(라벨·카드뉴스 래스터화)은 디자인 스튜디오 포팅 단계에서 추가.
export interface ProductLike {
  title_ko: string;
  one_liner?: string | null;
  flavor_notes?: string[] | null;
  roast_level?: string | null;
  origin?: { country?: string } | null;
  variety?: string | null;
  process?: string | null;
  weight_g?: number | null;
  body_html?: string | null;
}

export interface DraftOut {
  type: "detail" | "blog";
  title: string;
  body_html: string;
  keywords: string[];
  seo_title: string;
  seo_description: string;
}

// 디자인된 "텍스트" 상세 박스 HTML (이미지 X → AIEO/SEO 친화). key 컬러로 박스 배경/액센트.
export interface DesignedFields {
  ko: string; en?: string; country?: string; region?: string; farm?: string; farmer?: string;
  variety?: string; process?: string; altitude?: string; roast?: string; flavor?: string;
  weight?: string; story?: string; rcp_es?: string; rcp_fil?: string; rcp_milk?: string;
}
export function buildDesignedDetailHtml(f: DesignedFields, keyColor?: string): string {
  const key = keyColor || "#1A1A1A";
  const esc = (s?: string) => (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const flavorChips = (f.flavor || "").split(/[,·]/).map((s) => s.trim()).filter(Boolean)
    .map((n) => `<span style="display:inline-block;margin:0 6px 6px 0;padding:4px 12px;border-radius:999px;background:${key}1a;color:${key};font-size:13px">${esc(n)}</span>`).join("");
  const rows: [string, string | undefined][] = [
    ["원산지", [f.country, f.region].filter(Boolean).join(" ")], ["농장", f.farm], ["생산자", f.farmer],
    ["품종", f.variety], ["가공", f.process], ["고도", f.altitude], ["로스팅", f.roast], ["중량", f.weight ? `${f.weight}g` : ""],
  ];
  const factRows = rows.filter(([, v]) => v).map(([k, v]) =>
    `<div style="display:flex;gap:16px;padding:10px 0;border-bottom:1px solid #00000010"><dt style="width:96px;flex:none;color:#888;font-size:14px">${k}</dt><dd style="margin:0;font-size:15px">${esc(v)}</dd></div>`).join("");
  const recipes = [["에스프레소", f.rcp_es], ["필터/V60", f.rcp_fil], ["밀크", f.rcp_milk]]
    .filter(([, v]) => v).map(([k, v]) => `<p style="margin:6px 0;font-size:14px"><b style="color:${key}">${k}</b> · ${esc(v as string)}</p>`).join("");

  return [
    f.story ? `<section style="margin:0 0 18px;padding:28px 24px;border-radius:16px;background:${key};color:#fff"><p style="margin:0;font-size:20px;font-weight:700;line-height:1.5">${esc(f.story)}</p></section>` : "",
    flavorChips ? `<section style="margin:0 0 18px"><h2 style="font-size:15px;margin:0 0 10px;color:#888;text-transform:uppercase;letter-spacing:1px">Flavour</h2>${flavorChips}</section>` : "",
    factRows ? `<section style="margin:0 0 18px;padding:20px 22px;border-radius:16px;background:${key}0d"><h2 style="font-size:16px;margin:0 0 8px;border-left:4px solid ${key};padding-left:10px">커피 정보</h2><dl style="margin:0">${factRows}</dl></section>` : "",
    recipes ? `<section style="margin:0 0 18px;padding:20px 22px;border-radius:16px;border:1px solid ${key}33"><h2 style="font-size:16px;margin:0 0 8px;border-left:4px solid ${key};padding-left:10px">추천 추출</h2>${recipes}</section>` : "",
    `<section style="margin:0 0 4px;padding:18px 22px;border-radius:16px;background:#fafafa"><p style="margin:0;font-size:14px;color:#555">MTSPACE COFFEE는 경기도 가평 청평 로스터리에서 매주 월·화 로스팅하여 화·수 순차 출고합니다 — everyday excellence.</p></section>`,
  ].filter(Boolean).join("\n");
}

export function generateDrafts(p: ProductLike): DraftOut[] {
  const notes = (p.flavor_notes ?? []).join(", ");
  const country = p.origin?.country ?? "";
  const roast = p.roast_level ?? "";
  const kw = [...(p.flavor_notes ?? []), roast, country, "스페셜티 커피", "원두", p.title_ko]
    .filter(Boolean) as string[];

  const detail = `
<p>${p.one_liner ?? ""}</p>
<table><tbody>
<tr><th>원산지</th><td>${country || "-"}</td></tr>
<tr><th>품종</th><td>${p.variety ?? "-"}</td></tr>
<tr><th>가공 방식</th><td>${p.process ?? "-"}</td></tr>
<tr><th>플레이버 노트</th><td>${notes || "-"}</td></tr>
<tr><th>로스팅 레벨</th><td>${roast || "-"}</td></tr>
<tr><th>중량</th><td>${p.weight_g ? p.weight_g + "g" : "-"}</td></tr>
</tbody></table>
${p.body_html ?? ""}`.trim();

  const blog = `
<h2>${p.title_ko}, 어떻게 즐기면 좋을까</h2>
<p>${p.one_liner ?? ""}</p>
<h3>풍미</h3><p>${notes ? `${notes}의 향미가 특징입니다.` : "균형 잡힌 향미가 특징입니다."}</p>
<h3>추천 추출</h3><p>${roast ? `${roast} 로스트에 맞춰 ` : ""}에스프레소·핸드드립(V60)·콜드브루를 추천합니다.</p>
<h3>신선도</h3><p>MTSPACE COFFEE는 경기도 가평 자체 로스터리에서 매주 월·화 로스팅하여 화·수 출고합니다.</p>`.trim();

  const desc = (p.one_liner || notes || p.title_ko).slice(0, 150);
  return [
    { type: "detail", title: p.title_ko, body_html: detail, keywords: kw, seo_title: `${p.title_ko}${notes ? " | " + notes : ""}`, seo_description: desc },
    { type: "blog", title: `${p.title_ko} 이야기`, body_html: blog, keywords: kw, seo_title: `${p.title_ko} 추천 추출·풍미`, seo_description: desc },
  ];
}
