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
