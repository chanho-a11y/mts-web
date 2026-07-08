"use client";
import { useEffect, useMemo, useState } from "react";
import { type DesignedFields } from "@/lib/content-gen";
import { recipeDisplay, type RecipeData } from "@/lib/recipe";
import { EVIDENCE_FIELDS, srcTag, findUnsourcedStats, type EvidenceData } from "@/lib/evidence";
import { shrinkImage, readUploadJson } from "@/lib/client-image";
import RichEditor from "@/components/rich-editor";
import ImageUpload from "@/components/image-upload";
import { adminToast } from "@/components/admin-toast";

// 통합 스튜디오: 제품 관리에서 입력한 정보를 '불러와' 상세·블로그·카드뉴스·레이블·썸네일을 작업.
// 스튜디오에서는 제품 정보를 입력하지 않는다(읽기전용). 텍스트 디테일(블로그 본문 등)만 편집.
// 제품 정보 수정은 '제품 관리 > 제품 수정'에서.

export interface StudioItem extends DesignedFields {
  slug: string;
  en?: string;
  hash?: string;
  key_color?: string;
  price?: number | string;
  image?: string | null;
  // 한/영 전체
  country_en?: string; producer_en?: string; variety_en?: string; process_en?: string;
  altitude_en?: string; roast_en?: string; flavor_en?: string;
  one_liner?: string; one_liner_en?: string; story_en?: string;
  recipe?: RecipeData | null;
  evidence?: EvidenceData | null;
}

type Tab = "detail" | "blog" | "cardnews" | "label" | "thumbnail";
const TABS: { id: Tab; label: string }[] = [
  { id: "detail", label: "상세페이지" },
  { id: "blog", label: "블로그" },
  { id: "cardnews", label: "카드뉴스" },
  { id: "label", label: "레이블(정밀)" },
  { id: "thumbnail", label: "썸네일" },
];

const BRAND = { name: "MTSPACE COFFEE", instagram: "@mtspacecoffee" };
const EMPTY: StudioItem = { slug: "", ko: "", en: "", country: "", country_en: "", region: "", farm: "", farmer: "", producer_en: "",
  variety: "", variety_en: "", process: "", process_en: "", altitude: "", altitude_en: "", roast: "", roast_en: "",
  flavor: "", flavor_en: "", weight: "", one_liner: "", one_liner_en: "", story: "", story_en: "",
  rcp_es: "", rcp_fil: "", rcp_milk: "", recipe: null, evidence: null, hash: "", key_color: "#B0764A", price: "" };

type BlogMode = "product" | "keyword" | "blank";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// 인스타 비율(1080×1350) 5장 카드뉴스 슬라이드 SVG 생성
function slide(idx: number, accent: string, data: { ko: string; en?: string; flavor: string[]; story?: string; rcp: [string, string][]; }): string {
  const W = 1080, H = 1350;
  const head = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`;
  const bg = `<rect width="${W}" height="${H}" fill="${accent}"/>`;
  const wm = `<text x="72" y="110" fill="#FFFFFF" opacity="0.85" font-family="Helvetica Neue, Arial" font-weight="800" font-size="34" letter-spacing="2">MTSPACE <tspan font-weight="300">COFFEE</tspan></text>`;
  const dot = `<circle cx="${W - 80}" cy="100" r="14" fill="#FFFFFF" opacity="0.9"/>`;
  const pageTag = `<text x="72" y="${H - 70}" fill="#FFFFFF" opacity="0.7" font-family="IBM Plex Mono, monospace" font-size="26">0${idx} / 05</text>`;
  let body = "";
  if (idx === 1) {
    body = `<text x="${W / 2}" y="640" text-anchor="middle" fill="#FFFFFF" font-family="Helvetica Neue, Arial" font-weight="800" font-size="96">${esc(data.ko)}</text>`
      + (data.en ? `<text x="${W / 2}" y="720" text-anchor="middle" fill="#FFFFFF" opacity="0.85" font-family="IBM Plex Mono, monospace" font-size="34" letter-spacing="3">${esc(data.en.toUpperCase())}</text>` : "");
  } else if (idx === 2) {
    const notes = data.flavor.slice(0, 6);
    body = `<text x="72" y="560" fill="#FFFFFF" opacity="0.75" font-family="IBM Plex Mono, monospace" font-size="30" letter-spacing="5">FLAVOUR NOTES</text>`
      + notes.map((n, i) => `<text x="72" y="${640 + i * 78}" fill="#FFFFFF" font-family="Spectral, serif" font-style="italic" font-size="58">· ${esc(n)}</text>`).join("");
  } else if (idx === 3) {
    const lines = wrapText(data.story || "", 20).slice(0, 8);
    body = `<text x="72" y="540" fill="#FFFFFF" opacity="0.75" font-family="IBM Plex Mono, monospace" font-size="30" letter-spacing="5">STORY</text>`
      + lines.map((l, i) => `<text x="72" y="${620 + i * 66}" fill="#FFFFFF" font-family="Spectral, serif" font-size="46">${esc(l)}</text>`).join("");
  } else if (idx === 4) {
    body = `<text x="72" y="540" fill="#FFFFFF" opacity="0.75" font-family="IBM Plex Mono, monospace" font-size="30" letter-spacing="5">RECIPE</text>`
      + data.rcp.map(([k, v], i) => `<text x="72" y="${640 + i * 110}" fill="#FFFFFF" font-family="Helvetica Neue, Arial" font-weight="700" font-size="38">${esc(k)}</text><text x="72" y="${688 + i * 110}" fill="#FFFFFF" opacity="0.85" font-family="IBM Plex Mono, monospace" font-size="30">${esc(v)}</text>`).join("");
  } else {
    body = `<text x="${W / 2}" y="600" text-anchor="middle" fill="#FFFFFF" font-family="Helvetica Neue, Arial" font-weight="800" font-size="72">지금 만나보기</text>`
      + `<text x="${W / 2}" y="700" text-anchor="middle" fill="#FFFFFF" opacity="0.9" font-family="IBM Plex Mono, monospace" font-size="34" letter-spacing="3">mtspace.coffee</text>`
      + `<text x="${W / 2}" y="770" text-anchor="middle" fill="#FFFFFF" opacity="0.8" font-family="IBM Plex Mono, monospace" font-size="30">@mtspacecoffee</text>`;
  }
  return head + bg + wm + dot + body + pageTag + `</svg>`;
}
// 썸네일(1080×1080) — 제품 키 컬러 배경 + 제품명 + 플레이버 노트
function thumbSquare(accent: string, ko: string, en: string | undefined, flavor: string[]): string {
  const W = 1080, H = 1080;
  const nameLines = wrapText(ko || "제품명", 11).slice(0, 2);
  const baseY = 520 - (nameLines.length - 1) * 60;
  const notes = flavor.slice(0, 4).join(" · ");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`
    + `<rect width="${W}" height="${H}" fill="${accent}"/>`
    + `<text x="64" y="100" fill="#FFFFFF" opacity="0.85" font-family="Helvetica Neue, Arial" font-weight="800" font-size="30" letter-spacing="2">MTSPACE <tspan font-weight="300">COFFEE</tspan></text>`
    + `<circle cx="${W - 72}" cy="90" r="13" fill="#FFFFFF" opacity="0.9"/>`
    + nameLines.map((l, i) => `<text x="${W / 2}" y="${baseY + i * 120}" text-anchor="middle" fill="#FFFFFF" font-family="Helvetica Neue, Arial" font-weight="800" font-size="104">${esc(l)}</text>`).join("")
    + (en ? `<text x="${W / 2}" y="${baseY + nameLines.length * 120 - 10}" text-anchor="middle" fill="#FFFFFF" opacity="0.85" font-family="IBM Plex Mono, monospace" font-size="30" letter-spacing="3">${esc(en.toUpperCase())}</text>` : "")
    + (notes ? `<text x="${W / 2}" y="${baseY + nameLines.length * 120 + 70}" text-anchor="middle" fill="#FFFFFF" opacity="0.95" font-family="Spectral, serif" font-style="italic" font-size="46">${esc(notes)}</text>` : "")
    + `<line x1="64" y1="980" x2="${W - 64}" y2="980" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="1"/>`
    + `<text x="64" y="1028" fill="#FFFFFF" opacity="0.8" font-family="IBM Plex Mono, monospace" font-size="24">everyday excellence</text>`
    + `<text x="${W - 64}" y="1028" text-anchor="end" fill="#FFFFFF" opacity="0.8" font-family="IBM Plex Mono, monospace" font-size="24">@mtspacecoffee</text>`
    + `</svg>`;
}
function wrapText(s: string, perLine: number): string[] {
  const words = s.split(/\s+/); const out: string[] = []; let cur = "";
  for (const w of words) { if ((cur + " " + w).trim().length > perLine) { out.push(cur.trim()); cur = w; } else cur += " " + w; }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

export default function UnifiedStudio({ items, initialTab }: { items: StudioItem[]; initialTab?: Tab }) {
  const [f, setF] = useState<StudioItem>(EMPTY);
  const [tab, setTab] = useState<Tab>(initialTab ?? "detail");

  // 블로그 편집 상태
  const [blogMode, setBlogMode] = useState<BlogMode>("product");
  const [blogTitle, setBlogTitle] = useState("");
  const [blogBody, setBlogBody] = useState("<p></p>");
  const [blogCover, setBlogCover] = useState("");
  const [editorKey, setEditorKey] = useState(0); // RichEditor 리마운트
  const [seoReport, setSeoReport] = useState<string[] | null>(null);
  const [kwOpen, setKwOpen] = useState(false);
  const [kwSel, setKwSel] = useState<string[]>([]);
  const [blogStatus, setBlogStatus] = useState<string | null>(null);
  const [kbKeywords, setKbKeywords] = useState<string[]>([]);

  // KB 정의 인용 팝업
  const [kbOpen, setKbOpen] = useState(false);
  const [kbFacts, setKbFacts] = useState<{ term: string; definition: string; category: string }[]>([]);
  const [kbFactQuery, setKbFactQuery] = useState("");

  // 네이버 실시간 리서치
  const [researchOn, setResearchOn] = useState(false);
  const [researchItems, setResearchItems] = useState<{ title: string; snippet: string; link: string; source: string }[]>([]);
  const [researchKw, setResearchKw] = useState<string[]>([]);
  const [researchBusy, setResearchBusy] = useState(false);
  const [researchMsg, setResearchMsg] = useState("");

  // 지식베이스 키워드 + 네이버 리서치 설정 여부 로드(관리자 API)
  useEffect(() => {
    reloadKbKeywords();
    fetch("/api/studio/research").then((r) => r.ok ? r.json() : { configured: false }).then((j) => setResearchOn(!!j.configured)).catch(() => {});
  }, []);

  async function reloadKbKeywords() {
    try {
      const j = await fetch("/api/studio/keywords", { cache: "no-store" }).then((r) => r.ok ? r.json() : { keywords: [] });
      setKbKeywords(j.keywords ?? []);
    } catch { /* keep prev */ }
  }

  const flavorArr = useMemo(() => (f.flavor || "").split(/[,·]/).map((s) => s.trim()).filter(Boolean), [f.flavor]);
  const accent = f.key_color || "#B0764A";

  // 구조화 레시피(있으면) → 카드뉴스/블로그, 없으면 구 rcp_*
  const rcp = useMemo<[string, string][]>(() => {
    const blocks = recipeDisplay(f.recipe ?? null, "ko");
    if (blocks.length) return blocks.flatMap((b) => b.rows.map((r) => [`${b.title} ${r.label}`, r.value] as [string, string]));
    return ([["ESPRESSO", f.rcp_es], ["FILTER", f.rcp_fil], ["MILK", f.rcp_milk]] as [string, string][]).filter(([, v]) => v);
  }, [f]);

  const thumb = useMemo(() => thumbSquare(accent, f.ko || "(제품명)", f.en, flavorArr), [accent, f.ko, f.en, flavorArr]);
  const slides = useMemo(() => [1, 2, 3, 4, 5].map((i) => slide(i, accent, { ko: f.ko || "(제품명)", en: f.en, flavor: flavorArr, story: f.story, rcp })), [accent, f, flavorArr, rcp]);

  // 키워드 풀 — 제품 정보(우선) + 지식베이스/온라인 리서치(API). 제품 선택 시 제품 키워드가 앞에.
  const keywordPool = useMemo(() => {
    const fromProduct = [f.ko, f.country, f.variety, f.process, f.roast, ...flavorArr].map((s) => (s || "").trim()).filter(Boolean);
    const fallback = ["스페셜티 커피", "싱글 오리진", "블렌드 로스팅", "핸드드립 레시피", "B2B 원두 도매", "홈카페", "라이트 로스트"];
    return Array.from(new Set([...fromProduct, ...researchKw, ...(kbKeywords.length ? kbKeywords : fallback)]));
  }, [f, flavorArr, kbKeywords, researchKw]);

  function copy(text: string) { navigator.clipboard?.writeText(text); }
  function downloadSVG(svg: string, name: string) {
    const blob = new Blob([svg], { type: "image/svg+xml" }); const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
  }
  async function svgToDataUrl(svg: string, type: "png" | "jpeg", w = 1080, h = 1080): Promise<string> {
    const img = new Image();
    await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(); img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg); });
    const canvas = document.createElement("canvas"); canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d"); if (!ctx) return "";
    if (type === "jpeg") { ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, w, h); }
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL("image/" + type, 0.95);
  }
  async function exportRaster(svg: string, name: string, type: "png" | "jpeg", w = 1080, h = 1080) {
    const url = await svgToDataUrl(svg, type, w, h);
    if (!url) return;
    const a = document.createElement("a"); a.href = url; a.download = name; a.click();
  }

  // 썸네일 → 제품 대표 이미지 적용
  const [thumbStatus, setThumbStatus] = useState<string>("");
  const [thumbBusy, setThumbBusy] = useState(false);
  async function applyThumbnailToProduct() {
    if (!f.slug) { setThumbStatus("먼저 제품을 선택하세요"); return; }
    setThumbBusy(true); setThumbStatus("제품에 적용 중…");
    try {
      const dataurl = await svgToDataUrl(thumb, "png", 1080, 1080);
      const r = await fetch("/api/studio/thumbnail-apply", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: f.slug, thumb_dataurl: dataurl }),
      });
      const j = await r.json().catch(() => ({}));
      setThumbStatus(r.ok ? "제품 대표 썸네일로 적용됨 ✓ (스튜디오 저장분 1개만 유지)" : `실패: ${j.error ?? r.status}`);
      if (r.ok) adminToast("저장되었습니다");
    } catch { setThumbStatus("실패"); }
    finally { setThumbBusy(false); }
  }

  // 추가 이미지(상세 갤러리) — 대표 썸네일과 별도. 스튜디오에서 업로드/삭제.
  const [extraImgs, setExtraImgs] = useState<{ id: string; storage_path: string; is_primary: boolean }[]>([]);
  const [imgBusy, setImgBusy] = useState(false);
  const [imgMsg, setImgMsg] = useState("");
  async function loadExtraImages(slug: string) {
    if (!slug) { setExtraImgs([]); return; }
    try {
      const j = await fetch(`/api/studio/product-images?slug=${encodeURIComponent(slug)}`, { cache: "no-store" }).then((r) => r.ok ? r.json() : { items: [] });
      setExtraImgs(j.items ?? []);
    } catch { setExtraImgs([]); }
  }
  async function uploadExtraImage(file: File) {
    if (!f.slug) { setImgMsg("먼저 제품을 선택하세요"); return; }
    setImgBusy(true); setImgMsg("업로드 중…");
    try {
      const shrunk = await shrinkImage(file); // 업로드 전 축소(4.5MB 한도 회피)
      const fd = new FormData(); fd.append("file", shrunk); fd.append("folder", "gallery");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const up = await readUploadJson(res);
      if (!res.ok || !up.url) throw new Error(up.error || "업로드 실패");
      const r = await fetch("/api/studio/product-images", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: f.slug, url: up.url }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "저장 실패");
      setImgMsg("추가 이미지 등록됨 ✓ (상세페이지 갤러리 반영)");
      adminToast("저장되었습니다");
      await loadExtraImages(f.slug);
    } catch (e) { setImgMsg(e instanceof Error ? e.message : "실패"); }
    finally { setImgBusy(false); }
  }
  async function deleteExtraImage(id: string) {
    if (!confirm("이 추가 이미지를 삭제할까요?")) return;
    setImgBusy(true);
    try {
      await fetch("/api/studio/product-images", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, slug: f.slug }) });
      await loadExtraImages(f.slug);
    } catch { /* noop */ }
    finally { setImgBusy(false); }
  }

  function pushEditor(html: string, title?: string) {
    setBlogBody(html); if (title !== undefined) setBlogTitle(title);
    setEditorKey((k) => k + 1); setSeoReport(null);
  }

  // 풍미 노트 → 감각적 설명(사실 주장 아님, 일반 감각 표현). 없으면 일반 문장으로 폴백.
  function noteDescribe(n: string): string {
    const key = n.replace(/\s+/g, "");
    const bank: Record<string, string> = {
      다크초콜릿: "카카오의 묵직한 단맛과 길게 남는 여운", 초콜릿: "부드러운 단맛과 고소한 무게감",
      카라멜: "졸인 설탕의 진한 단맛", 캐러멜: "졸인 설탕의 진한 단맛", 견과류: "고소하게 감기는 너티함",
      자두: "잘 익은 붉은 과일의 상큼한 산미", 베리: "베리류의 밝고 달콤한 산미", 산딸기: "톡 쏘는 붉은 베리의 산미",
      적포도: "포도의 즙 많은 단맛", 시트러스: "감귤 계열의 산뜻한 산미", 오렌지: "오렌지의 밝은 산미와 단맛",
      레몬: "레몬의 선명한 산미", 자스민: "재스민의 화사한 플로럴", 재스민: "재스민의 화사한 플로럴",
      플로럴: "은은하게 퍼지는 꽃 향", 복숭아: "백도의 부드러운 단맛", 백도: "백도의 부드러운 단맛",
      바닐라: "달콤하고 크리미한 잔향", 사과: "사과의 깔끔한 산미와 단맛", 헤이즐넛: "헤이즐넛의 고소한 단맛",
    };
    return bank[key] || `${n}의 개성 있는 풍미`;
  }

  // md 가이드 구조의 고품질 초안 생성(800자+ · TL;DR·표·목록·풍미분석·레시피·FAQ·CTA)
  function mdGuideBlog(name: string, keywords: string[]): string {
    const kw = Array.from(new Set([...keywords, ...researchKw, ...kbKeywords].filter(Boolean))).slice(0, 6);
    const notes = flavorArr.length ? flavorArr : [];
    const notesLine = notes.length ? notes.join(" · ") : "균형 잡힌 풍미";
    const roast = f.roast || "정성껏 로스팅한";
    const origin = f.country || "";
    const typeWord = origin ? `${origin} 원산지의 싱글 오리진 성격` : "블렌드";

    const lead = `${name}은(는) ${notesLine}의 향미를 지닌 ${roast} MTSPACE COFFEE의 커피입니다. ${f.story || `${name}은(는) 매주 월·화요일에 로스팅해 화·수요일에 갓 볶은 상태로 출고합니다.`} 이 글에서는 ${name}의 풍미 프로파일, 원산지 배경, 집에서 그대로 재현할 수 있는 추천 추출 레시피, 그리고 보관과 신선도 관리까지 한 번에 정리했습니다.`;

    const tldr = notes.slice(0, 3).map((n) => `<li>${esc(n)} — ${esc(noteDescribe(n))}</li>`).join("")
      + `<li>로스팅: ${esc(f.roast || "밸런스 로스팅")} · 신선도: 월·화 로스팅 / 화·수 출고</li>`;

    const tableRows = ([["로스팅", f.roast], ["원산지", f.country], ["품종", f.variety], ["가공", f.process], ["중량", f.weight ? `${f.weight}g` : ""]] as [string, string | undefined][])
      .filter(([, v]) => v).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v as string)}</td></tr>`).join("");

    const flavorDeep = notes.length
      ? `<p>${esc(name)}의 향미는 ${notes.slice(0, 3).map((n) => `<strong>${esc(n)}</strong>(${esc(noteDescribe(n))})`).join(", ").replace(/<strong>/g, "").replace(/<\/strong>/g, "")}가 층을 이루며 전개됩니다. 추출 온도와 분쇄도에 따라 산미와 단맛의 균형이 달라지므로, 취향에 맞춰 물 온도를 1~2도 조절해 보시길 권합니다.</p>`
      : `<p>${esc(name)}은(는) 특정 향미에 치우치지 않고 산미·단맛·바디가 고르게 균형을 이루도록 설계되었습니다.</p>`;

    const recipeList = (rcp.length ? rcp : ([["기본 추출", "에스프레소 · 핸드드립(V60) · 콜드브루에 두루 어울립니다"]] as [string, string][]))
      .map(([k, v]) => `<li><strong>${esc(k)}</strong> — ${esc(v)}</li>`).join("");

    const conceptLine = kw.length ? `<p><strong>관련 개념:</strong> ${esc(kw.join(", "))}. 이 커피를 이해할 때 함께 살펴보면 좋은 키워드입니다.</p>` : "";

    // 정보 이득(Information Gain) + 1차 경험(Experience) 슬롯 — 경쟁 글이 복제할 수 없는 우리 자산.
    // [홍찬호 대표 코멘트]는 발행 전 채우는 placeholder(휴먼화·점검기가 미작성 시 감지).
    const infoGain = `<h2>MTSPACE COFFEE의 방식</h2>`
      + `<p>${esc(name)}은(는) 경기도 가평 청평의 자체 로스터리에서 매주 월·화요일에 로스팅합니다. 우리는 대회에서 검증한 로스팅·추출 기준을 실무에 그대로 적용해, 누가 내려도 일정한 컵 퀄리티가 나오도록 프로파일을 다듬습니다. V60에서는 물줄기를 회전시키는 차노토네이도(Chanotonado) 방식으로 추출의 균일성을 관리합니다. <em>[홍찬호 대표 현장 코멘트: ${esc(name)}의 로스팅·추출에서 특히 신경 쓴 점을 한두 문장으로 채우세요]</em></p>`;

    // 자사 1차 데이터 → 출처 태깅(자사)해 본문에 삽입. 통계·수치의 출처가 되어 팩트체크 게이트를 통과.
    const ev = f.evidence ?? {};
    const evLines = EVIDENCE_FIELDS.map((fld) => {
      const v = (ev as Record<string, string | undefined>)[fld.key];
      return v ? `<li>${srcTag("자사", `${esc(fld.ko.replace(/\s*\(.*?\)\s*/, ""))} — ${esc(v)}`)}</li>` : "";
    }).filter(Boolean).join("");
    const evidenceHtml = evLines
      ? `<h2>자사 로스팅·추출 데이터</h2><ul>${evLines}</ul><p>위 수치는 MTSPACE COFFEE 로스터리의 자체 실측·기록입니다.</p>`
      : "";

    return [
      `<p>${esc(lead)}</p>`,

      `<h2>${esc(name)} 한눈에 보기 (TL;DR)</h2>`,
      `<ul>${tldr}</ul>`,

      `<h2>${esc(name)}란</h2>`,
      `<p>${esc(name)}는 ${esc(typeWord)}의 커피로, ${esc(notesLine)}를 중심으로 설계되었습니다. MTSPACE COFFEE는 로스팅 과정의 당화(sugar browning)로 향미를 덧입히기보다 원두 본연의 향미를 선명하게 드러내는 방향을 지향합니다. 그래서 ${esc(name)}는 갓 볶은 신선한 상태에서 그 개성이 가장 또렷하게 살아납니다.</p>`,
      conceptLine,

      tableRows ? `<h2>원산지와 가공 정보</h2><table><tbody>${tableRows}</tbody></table>` : "",

      `<h2>풍미 프로파일 깊이 읽기</h2>`,
      flavorDeep,

      infoGain,
      evidenceHtml,

      `<h2>추천 추출 레시피</h2>`,
      `<p>아래는 ${esc(name)}의 개성을 가장 잘 끌어내는 기준 레시피입니다. 원두 상태와 그라인더에 따라 미세하게 조정하세요.</p>`,
      `<ol>${recipeList}</ol>`,

      `<h2>보관과 신선도</h2>`,
      `<p>${esc(name)}은(는) 로스팅 후 평균 14~28일 구간에서 가장 이상적인 풍미를 냅니다. 개봉 후에는 밀폐하여 직사광선을 피해 상온에 보관하고, 2~3주 안에 소비하시길 권합니다. MTSPACE COFFEE는 매주 월·화요일에 로스팅하고 화·수요일에 출고하므로, 주문하신 원두는 늘 신선한 상태로 도착합니다.</p>`,

      `<h2>자주 묻는 질문</h2>`,
      `<p><strong>Q. ${esc(name)}의 향미는 어떤가요?</strong><br/>${esc(notesLine)}의 노트를 중심으로, ${esc(f.roast || "밸런스")} 로스팅의 균형 잡힌 컵을 경험하실 수 있습니다.</p>`,
      `<p><strong>Q. 어떤 추출에 잘 어울리나요?</strong><br/>${rcp.length ? esc(rcp.map(([k]) => k).join(" · ")) : "에스프레소 · 핸드드립 · 콜드브루"} 등 다양한 방식에 두루 어울립니다.</p>`,
      `<p><strong>Q. 언제 로스팅하고 배송되나요?</strong><br/>매주 월·화요일 로스팅, 화·수요일 출고로 신선하게 배송됩니다.</p>`,

      `<h2>구매 안내</h2>`,
      `<p><a href="https://mtspace.coffee">mtspace.coffee</a>에서 ${esc(name)}을(를) 만나보세요. 사업자 도매 문의도 함께 안내해 드립니다.</p>`,
    ].filter(Boolean).join("\n");
  }

  function loadProduct(slug: string) {
    const p = items.find((i) => i.slug === slug);
    setF(p ? { ...EMPTY, ...p } : EMPTY);
    loadExtraImages(slug);
    if (p && blogMode === "product") {
      const fa = (p.flavor || "").split(/[,·]/).map((s) => s.trim()).filter(Boolean);
      pushEditor(mdGuideBlog(p.ko || slug, fa), `${p.ko || slug} — ${fa.slice(0, 2).join(", ") || "스페셜티 커피"} | MTSPACE COFFEE`);
    }
  }

  function applyBlogMode(m: BlogMode) {
    setBlogMode(m); setSeoReport(null);
    if (m === "blank") pushEditor("<p></p>", "");
    else if (m === "keyword") { setKwSel([]); setKwOpen(true); refreshKeywordPool(); }
    else if (f.slug) loadProduct(f.slug);
    else pushEditor("<p></p>", "");
  }
  function toggleKw(k: string) { setKwSel((prev) => prev.includes(k) ? prev.filter((x) => x !== k) : prev.length >= 3 ? prev : [...prev, k]); }
  function confirmKeywords() {
    const sel = kwSel.slice(0, 3);
    pushEditor(mdGuideBlog(sel[0] || (f.ko || "MTSPACE COFFEE"), sel), sel[0] ? `${sel[0]} — MTSPACE COFFEE` : "새 글");
    setKwOpen(false);
  }

  // AIEO/SEO 점검 — 4축 루브릭(정보이득·인용가능성·검증/신선도·분량) 점수화 + 발행 가능선.
  // 기준: 블로그 개선 제안서(2026-07-03) §2·§3.7.
  const BANNED_WORDS = ["최고의", "유일한", "완벽한", "Dark Velvet", "Sweetheart", "Citrus Breeze"];
  function checkSeo() {
    const text = blogBody.replace(/<[^>]+>/g, " ");
    const chars = text.replace(/\s+/g, "").length;
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const has = (re: RegExp) => re.test(blogBody);
    const bannedHit = BANNED_WORDS.filter((w) => blogBody.includes(w));
    const items: { axis: string; ok: boolean; label: string }[] = [
      { axis: "정보이득", ok: /차노토네이도|찬호토네이도|가평|로스터리|팩토리|대회|거래처/.test(text), label: "1차 경험/정보 이득(차노토네이도·가평 로스터리·대회·거래처) 포함" },
      { axis: "경험/저자", ok: !/\[홍찬호 대표/.test(blogBody), label: "저자 코멘트 슬롯 작성(placeholder 제거)" },
      { axis: "인용가능성", ok: /(란|이란)\s*[^<]{0,60}(이다|입니다)/.test(text), label: "정의형 문장(‘X란 ~이다/입니다’)" },
      { axis: "인용가능성", ok: has(/<h2/i), label: "H2 소제목 구조화" },
      { axis: "인용가능성", ok: has(/<table/i), label: "표(인용률↑)" },
      { axis: "인용가능성", ok: has(/<ol|<ul/i), label: "번호/불릿 목록" },
      { axis: "인용가능성", ok: /자주 묻는|faq/i.test(blogBody), label: "FAQ 섹션(→ FAQPage 스키마)" },
      { axis: "검증/신선도", ok: /월·화|월,\s?화|로스팅/.test(text), label: "신선도 표기(월·화 로스팅 / 화·수 출고)" },
      { axis: "검증/신선도", ok: bannedHit.length === 0, label: bannedHit.length ? `금지표현 발견: ${bannedHit.join(", ")}` : "금지표현 0(최고의·유일한·완벽한·구 블렌드명)" },
      { axis: "검증/신선도", ok: findUnsourcedStats(blogBody).length === 0, label: (() => { const u = findUnsourcedStats(blogBody); return u.length ? `출처 없는 수치 ${u.length}건: ${u.slice(0, 5).join(", ")} (게시 잠금 대상)` : "모든 통계·수치에 출처(자사/KB/링크) 태깅됨"; })() },
      { axis: "분량", ok: chars >= 1200, label: `본문 ${chars}자 / ${words}단어 (발행 가능선 1,200자+)` },
      { axis: "제목", ok: blogTitle.length >= 15 && blogTitle.length <= 60, label: `제목 ${blogTitle.length}자 (15–60)` },
      { axis: "이미지", ok: has(/<img/i), label: "본문 이미지(alt 포함)" },
    ];
    const coreAxes = ["정보이득", "인용가능성", "검증/신선도", "분량"];
    const core = items.filter((i) => coreAxes.includes(i.axis));
    const corePass = core.every((i) => i.ok);
    const passed = items.filter((i) => i.ok).length;
    setSeoReport([
      `${corePass ? "✅ 발행 가능선 충족" : "⚠️ 발행 전 보완 필요"} · 통과 ${passed}/${items.length} · 핵심축 ${core.filter((i) => i.ok).length}/${core.length}`,
      ...items.map((i) => `${i.ok ? "✓" : "△"} [${i.axis}] ${i.label}`),
    ]);
  }

  // 휴먼화 패스 — AI 상투어·절대화·em대시 정리(규칙 기반, 제안서 §3.3). 의미 보존 위주의 안전 교정.
  function humanize() {
    let body = blogBody;
    body = body.replace(/—/g, ", ");
    body = body.replace(/결론적으로,?\s*/g, "");
    body = body.replace(/에 대해 알아보겠습니다/g, "를 살펴봅니다");
    body = body.replace(/게다가,?\s*/g, "").replace(/나아가,?\s*/g, "").replace(/(^|>)\s*또한,?\s*/g, "$1");
    body = body.replace(/가장\s*완벽한/g, "안정적인").replace(/완벽한/g, "안정적인").replace(/최고의/g, "좋은").replace(/유일한\s*/g, "");
    body = body.replace(/[ \t]{2,}/g, " ");
    pushEditor(body, blogTitle);
    setBlogStatus("휴먼화 적용됨 ✓ (AI 상투어·절대화·em대시 정리) · [홍찬호 대표 코멘트] 슬롯을 채워주세요.");
    setTimeout(checkSeo, 0);
  }
  function autoOptimize() {
    let body = blogBody;
    const name = f.ko || blogTitle || "MTSPACE COFFEE";
    const firstP = (body.match(/<p>([\s\S]*?)<\/p>/i)?.[1] ?? "").replace(/<[^>]+>/g, "").trim();
    if (firstP.length < 60) body = `<p>${esc(`${name}${flavorArr.length ? ` — ${flavorArr.slice(0, 3).join(", ")}` : ""}. ${f.story || "매주 로스팅한 스페셜티 커피"}.`)}</p>\n` + body;
    if (!/<h2/i.test(body)) body = `<h2>${esc(name)}</h2>\n` + body;
    body = body.replace(/<img((?![^>]*\balt=)[^>]*)>/gi, `<img$1 alt="${esc(name)}">`);
    body = body.replace(/\s—\s/g, ", ");
    if (flavorArr.length && !flavorArr.some((n) => body.includes(n))) body += `\n<p><strong>플레이버 노트:</strong> ${flavorArr.join(" · ")}</p>`;
    if (!/자주 묻는|faq/i.test(body)) body += `\n<h2>자주 묻는 질문</h2>\n<p><strong>Q. ${esc(name)}의 플레이버는 어떤가요?</strong><br/>${flavorArr.length ? esc(flavorArr.join(", ")) : "밸런스 좋은 풍미"}의 노트를 느낄 수 있습니다.</p>\n<p><strong>Q. 언제 로스팅하고 배송되나요?</strong><br/>매주 월·화 로스팅, 화·수 출고로 신선하게 배송됩니다.</p>`;
    if (!/mtspace\.coffee/i.test(body)) body += `\n<h2>구매 안내</h2>\n<p><a href="https://mtspace.coffee">mtspace.coffee</a>에서 ${esc(name)}을(를) 만나보세요.</p>`;
    const newTitle = (!blogTitle || blogTitle.length < 15) ? `${name} — ${flavorArr.slice(0, 2).join(", ") || "스페셜티 커피"} | MTSPACE COFFEE` : blogTitle;
    pushEditor(body, newTitle);
    setTimeout(checkSeo, 0);
  }

  // 보관(draft) / 게시(published) → content_post. 게시글은 홈 블로그 섹션 노출, 관리에서 수정.
  // 팩트체크 게이트(D-042): 게시 시 출처 없는 통계·수치가 있으면 잠금(보관은 허용).
  async function saveBlog(status: "draft" | "published") {
    if (!blogTitle.trim()) { setBlogStatus("제목을 입력하세요"); return; }
    if (status === "published") {
      const unsourced = findUnsourcedStats(blogBody);
      const banned = BANNED_WORDS.filter((w) => blogBody.includes(w));
      if (unsourced.length || banned.length) {
        setBlogStatus(`⛔ 게시 잠금 — ${unsourced.length ? `출처 없는 수치 ${unsourced.length}건(${unsourced.slice(0, 6).join(", ")})` : ""}${unsourced.length && banned.length ? " · " : ""}${banned.length ? `금지표현(${banned.join(", ")})` : ""}. ‘자사 근거 삽입’·‘KB 정의 인용’으로 출처를 붙이거나 ‘보관’으로 저장하세요.`);
        return;
      }
    }
    setBlogStatus(status === "published" ? "게시 중…" : "보관 중…");
    try {
      const res = await fetch("/api/studio/blog", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_slug: f.slug || null, title: blogTitle, body_html: blogBody, cover_image: blogCover, status }),
      });
      const j = await res.json().catch(() => ({}));
      setBlogStatus(res.ok
        ? (status === "published" ? `게시됨 ✓ 홈 블로그 노출 (슬러그 ${j.slug})` : "보관됨 ✓ 블로그 관리에서 수정 가능")
        : `실패: ${j.error ?? res.status}`);
      if (res.ok) adminToast(status === "published" ? "게시되었습니다" : "저장되었습니다");
    } catch { setBlogStatus("실패"); }
  }

  // 네이버 실시간 리서치 — 제품/키워드로 검색해 스니펫·키워드 확보
  async function runResearch() {
    setResearchBusy(true); setResearchMsg("네이버 검색 중…");
    const q = [f.ko, flavorArr[0] || "", "커피"].filter(Boolean).join(" ").trim() || (kwSel[0] || "스페셜티 커피 트렌드");
    try {
      const r = await fetch("/api/studio/research", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: q }) });
      const j = await r.json();
      if (!j.ok) { setResearchMsg(j.error || "리서치 실패"); return; }
      setResearchItems(j.items || []); setResearchKw(j.keywords || []);
      setResearchMsg(`“${q}” · ${(j.items || []).length}건 로드 · 키워드 ${(j.keywords || []).length}개 추가됨`);
    } catch { setResearchMsg("리서치 실패"); }
    finally { setResearchBusy(false); }
  }
  // 리서치 결과를 본문 하단에 '관련 동향·참고' 섹션으로 삽입(출처 링크 포함, 원문 확인 유도)
  function insertResearch() {
    if (!researchItems.length) return;
    const links = researchItems.slice(0, 6).map((it) => `<li>${srcTag("출처", `${esc(it.title)} — <a href="${esc(it.link)}" rel="noopener" target="_blank">출처</a>`)}</li>`).join("");
    const section = `\n<h2>관련 동향 · 참고 자료</h2>\n<p>${esc(f.ko || "이 주제")}와 관련해 최근 온라인에서 다뤄진 맥락입니다. 사실관계는 원문을 확인해 인용하세요.</p>\n<ul>${links}</ul>`;
    pushEditor(blogBody + section, blogTitle);
    setResearchMsg("본문 하단에 참고 자료 반영됨 ✓");
  }

  // 키워드 풀 최신화 — 지식베이스 재조회 + (설정 시) 네이버 리서치 재실행
  async function refreshKeywordPool() {
    setResearchMsg("키워드 최신화 중…");
    await reloadKbKeywords();
    if (researchOn) await runResearch();
    else setResearchMsg("지식베이스 키워드 최신화됨 ✓");
  }

  // 자사 1차 데이터 → 출처 태깅(자사)해 본문 하단 삽입
  function insertEvidence() {
    const ev = f.evidence ?? {};
    const lines = EVIDENCE_FIELDS.map((fld) => {
      const v = (ev as Record<string, string | undefined>)[fld.key];
      return v ? `<li>${srcTag("자사", `${esc(fld.ko.replace(/\s*\(.*?\)\s*/, ""))} — ${esc(v)}`)}</li>` : "";
    }).filter(Boolean).join("");
    if (!lines) { setBlogStatus("이 제품에 입력된 자사 1차 데이터가 없습니다. 제품 수정 > ‘자사 1차 데이터’에서 입력하세요."); return; }
    pushEditor(blogBody + `\n<h2>자사 로스팅·추출 데이터</h2>\n<ul>${lines}</ul>\n<p>위 수치는 MTSPACE COFFEE 로스터리의 자체 실측·기록입니다.</p>`, blogTitle);
    setBlogStatus("자사 1차 데이터를 출처 태깅해 삽입했습니다 ✓");
  }
  // KB 정의 인용 — 지식베이스(정본)에서 term/definition 삽입, data-src="KB:term" 태깅
  async function openKbFacts() {
    setKbOpen(true);
    try {
      const j = await fetch("/api/studio/kb-facts", { cache: "no-store" }).then((r) => r.ok ? r.json() : { items: [] });
      setKbFacts(j.items ?? []);
    } catch { setKbFacts([]); }
  }
  function insertKbFact(t: { term: string; definition: string }) {
    const html = srcTag(`KB:${t.term}`, `<strong>${esc(t.term)}</strong>란 ${esc(t.definition)}`);
    pushEditor(blogBody + `\n<p>${html}</p>`, blogTitle);
    setBlogStatus(`KB 정의 인용 삽입 ✓ (${t.term})`);
    setKbOpen(false);
  }

  function openNewWindow(url: string) { window.open(url, "_blank", "noopener,width=1200,height=900"); }

  const svgURI = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  const ro = "mt-1 w-full rounded border bg-neutral-50 px-2.5 py-1.5 text-sm text-neutral-600";

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      {/* 좌: 제품 불러오기 (읽기전용) */}
      <aside className="space-y-3 rounded-xl border p-4">
        <div>
          <label className="text-xs font-bold uppercase text-neutral-400">제품 불러오기</label>
          <select className="mt-1 w-full rounded border px-2.5 py-1.5 text-sm" value={f.slug} onChange={(e) => loadProduct(e.target.value)}>
            <option value="">— 제품 선택 —</option>
            {items.map((i) => <option key={i.slug} value={i.slug}>{i.ko || i.slug}</option>)}
          </select>
          <p className="mt-1 text-[11px] text-neutral-400">제품 정보는 <a href="/admin/products" className="underline">제품 수정</a>에서 입력합니다. 여기서는 <b>읽기전용</b>으로 불러와 레이아웃·이미지·텍스트 디테일을 작업합니다.</p>
        </div>
        {f.slug ? (
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-sm">제품명(KO)<input readOnly className={ro} value={f.ko} /></label>
            <label className="block text-sm">제품명(EN)<input readOnly className={ro} value={f.en ?? ""} /></label>
            <label className="block text-sm">한줄키워드(KO)<input readOnly className={ro} value={f.one_liner ?? ""} /></label>
            <label className="block text-sm">한줄키워드(EN)<input readOnly className={ro} value={f.one_liner_en ?? ""} /></label>
            <label className="block text-sm">국가(KO)<input readOnly className={ro} value={f.country ?? ""} /></label>
            <label className="block text-sm">국가(EN)<input readOnly className={ro} value={f.country_en ?? ""} /></label>
            <label className="block text-sm">로스팅(KO)<input readOnly className={ro} value={f.roast ?? ""} /></label>
            <label className="block text-sm">로스팅(EN)<input readOnly className={ro} value={f.roast_en ?? ""} /></label>
            <label className="block text-sm">품종(KO)<input readOnly className={ro} value={f.variety ?? ""} /></label>
            <label className="block text-sm">품종(EN)<input readOnly className={ro} value={f.variety_en ?? ""} /></label>
            <label className="block text-sm">가공(KO)<input readOnly className={ro} value={f.process ?? ""} /></label>
            <label className="block text-sm">가공(EN)<input readOnly className={ro} value={f.process_en ?? ""} /></label>
            <label className="col-span-2 block text-sm">플레이버(KO)<input readOnly className={ro} value={f.flavor ?? ""} /></label>
            <label className="col-span-2 block text-sm">플레이버(EN)<input readOnly className={ro} value={f.flavor_en ?? ""} /></label>
            <label className="col-span-2 block text-sm">스토리(KO)<textarea readOnly rows={2} className={ro} value={f.story ?? ""} /></label>
            <label className="col-span-2 block text-sm">스토리(EN)<textarea readOnly rows={2} className={ro} value={f.story_en ?? ""} /></label>
            <label className="col-span-2 block text-sm">포인트 컬러
              <div className="mt-1 flex items-center gap-2"><span className="inline-block h-6 w-6 rounded border" style={{ background: accent }} /><span className="text-xs text-neutral-500">{accent}</span></div>
            </label>
          </div>
        ) : <p className="rounded border border-dashed p-4 text-center text-xs text-neutral-400">제품을 선택하세요.</p>}
        <p className="text-center text-[11px] text-neutral-400">한/영 전체 텍스트가 로드됩니다. 정보 수정은 제품 수정에서.</p>
      </aside>

      {/* 우: 탭 */}
      <section className="min-w-0">
        <div className="mb-4 flex flex-wrap gap-2 border-b pb-2">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`rounded-full px-4 py-1.5 text-sm ${tab === t.id ? "bg-ink text-oat" : "border hover:bg-neutral-50"}`}>{t.label}</button>
          ))}
        </div>

        {tab === "detail" && (
          <div className="space-y-3">
            <p className="text-sm text-neutral-500">상세페이지는 실제 제품 상세와 <b>동일한 레이아웃(고정)</b>으로 <b>새 창</b>에서 열립니다. 새 창에서 텍스트·숫자를 <b>클릭해 직접 수정</b>하고 저장하면 상세페이지에 바로 반영됩니다. (EN 전체·레시피는 제품 수정에서)</p>
            <div className="flex flex-wrap gap-2">
              <button
                disabled={!f.slug}
                onClick={() => openNewWindow(`/admin/products/${f.slug}/detail-edit`)}
                className="rounded-full bg-ink px-5 py-2.5 text-sm text-oat disabled:opacity-40"
              >새 창에서 상세페이지 수정 ↗</button>
              <button
                disabled={!f.slug}
                onClick={() => openNewWindow(`/products/${f.slug}`)}
                className="rounded-full border px-5 py-2.5 text-sm disabled:opacity-40"
              >실제 상세 미리보기 ↗</button>
            </div>
            {!f.slug && <p className="text-xs text-neutral-400">먼저 제품을 선택하세요.</p>}
          </div>
        )}

        {tab === "blog" && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-neutral-400">모드:</span>
              {(["product", "keyword", "blank"] as BlogMode[]).map((m) => (
                <button key={m} onClick={() => applyBlogMode(m)} className={`rounded-full px-3 py-1 text-xs ${blogMode === m ? "bg-ink text-oat" : "border"}`}>
                  {m === "product" ? "제품정보" : m === "keyword" ? "키워드" : "빈 문서"}
                </button>
              ))}
              <span className="text-[11px] text-neutral-400">보도자료·논문급 기준(1,200자+·정의형·정보이득·인용/출처)으로 초안이 생성되며, 제품 정보 + 지식베이스 + 네이버 리서치 키워드를 반영합니다.</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-neutral-50 px-3 py-2">
              <button onClick={runResearch} disabled={!researchOn || researchBusy} className="rounded-full border bg-white px-3 py-1 text-xs disabled:opacity-40" title={researchOn ? "네이버 검색 API로 실시간 리서치" : "NAVER_CLIENT_ID/SECRET 환경변수 설정 필요"}>
                {researchBusy ? "검색 중…" : researchOn ? "온라인 리서치(네이버)" : "온라인 리서치(키 미설정)"}
              </button>
              {researchItems.length > 0 && <button onClick={insertResearch} className="rounded-full bg-clayDeep px-3 py-1 text-xs text-white">본문에 참고 반영</button>}
              <button onClick={refreshKeywordPool} disabled={researchBusy} className="rounded-full border bg-white px-3 py-1 text-xs disabled:opacity-40" title="지식베이스 + 리서치 키워드 재조회">↻ 키워드 최신화</button>
              <span className="mx-1 h-4 w-px bg-neutral-300" />
              <button onClick={insertEvidence} className="rounded-full border bg-white px-3 py-1 text-xs" title="제품의 자사 1차 데이터를 출처 태깅해 삽입(신뢰 핵심)">＋ 자사 근거 삽입</button>
              <button onClick={openKbFacts} className="rounded-full border bg-white px-3 py-1 text-xs" title="지식베이스 정의를 정본 인용으로 삽입">＋ KB 정의 인용</button>
              {researchMsg && <span className="text-[11px] text-neutral-500">{researchMsg}</span>}
              {!researchOn && <span className="text-[11px] text-neutral-400">네이버 개발자센터에서 앱 등록 후 키를 Vercel env에 추가하면 활성화됩니다(무료).</span>}
            </div>
            <input value={blogTitle} onChange={(e) => setBlogTitle(e.target.value)} placeholder="제목" className="w-full rounded border px-3 py-2 text-sm font-medium" />
            <ImageUpload name="studio_cover" defaultValue={blogCover} folder="blog-cover" label="커버 이미지 첨부" />
            <RichEditor key={editorKey} name="studio_body" defaultValue={blogBody} minWords={1200} onChange={setBlogBody} />
            <div className="flex flex-wrap gap-2">
              <button onClick={checkSeo} className="rounded border px-3 py-1 text-xs">AIEO/SEO 점검(루브릭)</button>
              <button onClick={autoOptimize} className="rounded-full border px-3 py-1 text-xs">자동 다듬기</button>
              <button onClick={humanize} className="rounded-full bg-clayDeep px-3 py-1 text-xs text-white" title="AI 상투어·절대화·em대시 정리">휴먼화</button>
              <span className="flex-1" />
              <button onClick={() => saveBlog("draft")} className="rounded-full border px-4 py-1.5 text-xs">보관(초안)</button>
              <button onClick={() => saveBlog("published")} className="rounded-full bg-ink px-4 py-1.5 text-xs text-oat">게시(홈 노출)</button>
            </div>
            {blogStatus && <p className="text-xs text-neutral-600">{blogStatus}</p>}
            {seoReport && <ul className="rounded-lg border bg-neutral-50 p-3 text-xs">{seoReport.map((r, i) => <li key={i}>{r}</li>)}</ul>}
            <p className="text-[11px] text-neutral-400">보관/게시한 글은 <a href="/admin/blog" className="underline">블로그 관리</a>에서 다시 수정할 수 있습니다.</p>

            {/* KB 정의 인용 팝업 — 지식베이스(정본) term/definition 삽입 */}
            {kbOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4" onClick={() => setKbOpen(false)}>
                <div className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-xl bg-white p-5 shadow-card" onClick={(e) => e.stopPropagation()}>
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-sm font-bold">KB 정의 인용 <span className="font-normal text-neutral-400">(지식베이스 정본 · 클릭하면 출처 태깅되어 삽입)</span></h3>
                    <button onClick={() => setKbOpen(false)} className="rounded-full border px-3 py-1 text-xs">닫기</button>
                  </div>
                  <input value={kbFactQuery} onChange={(e) => setKbFactQuery(e.target.value)} placeholder="용어·정의 검색…" className="mb-2 w-full rounded border px-3 py-1.5 text-sm" />
                  <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
                    {kbFacts.filter((t) => !kbFactQuery || (t.term + t.definition).toLowerCase().includes(kbFactQuery.toLowerCase())).slice(0, 60).map((t) => (
                      <button key={t.term} onClick={() => insertKbFact(t)} className="block w-full rounded border p-2 text-left text-xs hover:bg-neutral-50">
                        <span className="font-semibold">{t.term}</span>{t.category ? <span className="ml-1 text-neutral-400">· {t.category}</span> : null}
                        <span className="mt-0.5 block text-neutral-500">{t.definition.slice(0, 120)}{t.definition.length > 120 ? "…" : ""}</span>
                      </button>
                    ))}
                    {kbFacts.length === 0 && <p className="py-6 text-center text-xs text-neutral-400">불러오는 중이거나 KB 항목이 없습니다.</p>}
                  </div>
                </div>
              </div>
            )}

            {/* 키워드 선택 팝업 — 제품 정보 + 지식베이스에서 산출, 1~3개 선택 */}
            {kwOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4" onClick={() => setKwOpen(false)}>
                <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-card" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold">키워드 선택 <span className="font-normal text-neutral-400">(1~3개 · 제품 + 지식베이스 + 네이버 리서치)</span></h3>
                    <button onClick={refreshKeywordPool} disabled={researchBusy} className="rounded-full border px-3 py-1 text-xs hover:bg-neutral-50 disabled:opacity-40">↻ 최신화</button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {keywordPool.map((k) => (
                      <button key={k} onClick={() => toggleKw(k)}
                        className={`rounded-full border px-3 py-1 text-xs ${kwSel.includes(k) ? "border-ink bg-ink text-oat" : "hover:bg-neutral-100"}`}>{k}</button>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs text-neutral-400">선택: {kwSel.join(", ") || "없음"}</span>
                    <div className="flex gap-2">
                      <button onClick={() => setKwOpen(false)} className="rounded-full border px-4 py-1.5 text-xs">취소</button>
                      <button onClick={confirmKeywords} disabled={kwSel.length === 0} className="rounded-full bg-ink px-4 py-1.5 text-xs text-oat disabled:opacity-40">이 키워드로 작성</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "cardnews" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-neutral-500">카드뉴스 제작기(원본과 동일). 화면이 좁으면 새 창에서 여세요.</p>
              <button onClick={() => openNewWindow(`/tools/instagram-cardnews.html${f.slug ? `?slug=${encodeURIComponent(f.slug)}` : ""}`)} className="rounded-full bg-ink px-4 py-1.5 text-xs text-oat">새 창에서 열기 ↗</button>
            </div>
            <iframe key={f.slug || "cn"} src={`/tools/instagram-cardnews.html${f.slug ? `?slug=${encodeURIComponent(f.slug)}` : ""}`} title="Instagram Card News" className="h-[78vh] w-full rounded-lg border" />

            <details className="rounded-lg border p-3">
              <summary className="cursor-pointer text-xs text-neutral-500">빠른 자동 생성(참고) — 선택 제품으로 5장 즉시 생성</summary>
              <div className="mt-3 flex justify-end gap-2">
                <button onClick={() => slides.forEach((s, i) => exportRaster(s, `${f.slug || "cardnews"}-0${i + 1}.png`, "png", 1080, 1350))} className="rounded border px-3 py-1 text-xs">전체 PNG</button>
                <button onClick={() => slides.forEach((s, i) => exportRaster(s, `${f.slug || "cardnews"}-0${i + 1}.jpg`, "jpeg", 1080, 1350))} className="rounded border px-3 py-1 text-xs">전체 JPG</button>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {slides.map((s, i) => (
                  <figure key={i} className="space-y-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={svgURI(s)} alt={`슬라이드 ${i + 1}`} className="w-full rounded-lg border" />
                    <figcaption className="flex justify-between text-[10px] text-neutral-400">
                      <span>0{i + 1}</span>
                      <span className="flex gap-1">
                        <button onClick={() => exportRaster(s, `${f.slug || "cardnews"}-0${i + 1}.png`, "png", 1080, 1350)} className="underline">PNG</button>
                        <button onClick={() => exportRaster(s, `${f.slug || "cardnews"}-0${i + 1}.jpg`, "jpeg", 1080, 1350)} className="underline">JPG</button>
                      </span>
                    </figcaption>
                  </figure>
                ))}
              </div>
            </details>
          </div>
        )}

        {tab === "label" && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-neutral-500">180×130mm 정밀 레이블 편집기. 화면이 좁으니 새 창에서 여세요.</p>
              <button onClick={() => openNewWindow(`/tools/label-studio.html${f.slug ? `?slug=${encodeURIComponent(f.slug)}` : ""}`)} className="rounded-full bg-ink px-4 py-1.5 text-xs text-oat">새 창에서 열기 ↗</button>
            </div>
            <iframe key={f.slug || "lb"} src={`/tools/label-studio.html${f.slug ? `?slug=${encodeURIComponent(f.slug)}` : ""}`} title="Label Studio" className="h-[78vh] w-full rounded-lg border" />
          </div>
        )}

        {tab === "thumbnail" && (
          <div className="mx-auto max-w-sm space-y-2">
            <p className="text-xs text-neutral-400">인스타 비율(1:1) · 제품 키컬러 배경 + 제품명 + 플레이버 노트</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={svgURI(thumb)} alt="썸네일 미리보기" className="w-full rounded-lg border" />
            <div className="flex flex-wrap justify-center gap-2">
              <button onClick={() => exportRaster(thumb, `${f.slug || "thumbnail"}.png`, "png", 1080, 1080)} className="rounded border px-3 py-1 text-xs">PNG 다운로드</button>
              <button onClick={() => exportRaster(thumb, `${f.slug || "thumbnail"}.jpg`, "jpeg", 1080, 1080)} className="rounded border px-3 py-1 text-xs">JPG 다운로드</button>
              <button onClick={() => downloadSVG(thumb, `${f.slug || "thumbnail"}.svg`)} className="rounded border px-3 py-1 text-xs">SVG</button>
            </div>
            <div className="flex flex-col items-center gap-1 pt-1">
              <button onClick={applyThumbnailToProduct} disabled={!f.slug || thumbBusy} className="rounded-full bg-ink px-5 py-2 text-xs text-oat disabled:opacity-40">제품에 적용 (대표 썸네일 · 1개)</button>
              {thumbStatus && <p className="text-[11px] text-neutral-600">{thumbStatus}</p>}
            </div>

            {/* 추가 이미지 — 상세페이지 갤러리(대표 썸네일과 별도) */}
            <div className="mt-5 border-t pt-3 text-left">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold">추가 이미지 <span className="font-normal text-neutral-400">(상세 갤러리 · 대표 썸네일과 별도)</span></p>
                <label className={`cursor-pointer rounded-full border px-3 py-1 text-xs hover:bg-neutral-100 ${(!f.slug || imgBusy) ? "pointer-events-none opacity-40" : ""}`}>
                  {imgBusy ? "처리 중…" : "＋ 이미지 추가"}
                  <input type="file" accept="image/*" className="hidden" disabled={imgBusy || !f.slug}
                    onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadExtraImage(file); e.currentTarget.value = ""; }} />
                </label>
              </div>
              {imgMsg && <p className="mt-1 text-[11px] text-neutral-500">{imgMsg}</p>}
              <div className="mt-2 grid grid-cols-3 gap-2">
                {extraImgs.filter((im) => !im.is_primary).map((im) => (
                  <div key={im.id} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={im.storage_path} alt="" className="aspect-square w-full rounded border object-cover" />
                    <button onClick={() => deleteExtraImage(im.id)} className="absolute right-1 top-1 rounded-full bg-black/60 px-1.5 text-[11px] leading-tight text-white">×</button>
                  </div>
                ))}
                {extraImgs.filter((im) => !im.is_primary).length === 0 && <p className="col-span-3 py-3 text-center text-[11px] text-neutral-400">{f.slug ? "추가 이미지가 없습니다." : "제품을 선택하세요."}</p>}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
