"use client";
import { useEffect, useMemo, useState } from "react";
import { type DesignedFields } from "@/lib/content-gen";
import { recipeDisplay, type RecipeData } from "@/lib/recipe";
import RichEditor from "@/components/rich-editor";
import ImageUpload from "@/components/image-upload";

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
  rcp_es: "", rcp_fil: "", rcp_milk: "", recipe: null, hash: "", key_color: "#B0764A", price: "" };

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

  // 지식베이스 + 온라인 리서치 큐레이션 키워드 로드(관리자 API)
  useEffect(() => {
    fetch("/api/studio/keywords").then((r) => r.ok ? r.json() : { keywords: [] }).then((j) => setKbKeywords(j.keywords ?? [])).catch(() => {});
  }, []);

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
    return Array.from(new Set([...fromProduct, ...(kbKeywords.length ? kbKeywords : fallback)]));
  }, [f, flavorArr, kbKeywords]);

  function copy(text: string) { navigator.clipboard?.writeText(text); }
  function downloadSVG(svg: string, name: string) {
    const blob = new Blob([svg], { type: "image/svg+xml" }); const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
  }
  async function exportRaster(svg: string, name: string, type: "png" | "jpeg", w = 1080, h = 1080) {
    const img = new Image();
    await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(); img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg); });
    const canvas = document.createElement("canvas"); canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    if (type === "jpeg") { ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, w, h); }
    ctx.drawImage(img, 0, 0, w, h);
    const a = document.createElement("a"); a.href = canvas.toDataURL("image/" + type, 0.95); a.download = name; a.click();
  }

  function pushEditor(html: string, title?: string) {
    setBlogBody(html); if (title !== undefined) setBlogTitle(title);
    setEditorKey((k) => k + 1); setSeoReport(null);
  }

  // md 가이드 구조의 초안 생성(TL;DR·정의문·표·번호목록·FAQ·CTA)
  function mdGuideBlog(name: string, keywords: string[]): string {
    const kw = keywords.filter(Boolean);
    const notes = flavorArr.length ? flavorArr.join(", ") : "밸런스 좋은 풍미";
    const lead = `${name}은(는) ${notes}의 향미를 지닌 MTSPACE COFFEE의 커피입니다. ${f.story || "매주 월·화 로스팅해 화·수 신선하게 출고합니다."}`;
    const tableRows = ([["로스팅", f.roast], ["원산지", f.country], ["품종", f.variety], ["가공", f.process]] as [string, string | undefined][])
      .filter(([, v]) => v).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v as string)}</td></tr>`).join("");
    return [
      `<p>${esc(lead)}</p>`,
      `<h2>${esc(name)}란</h2>`,
      `<p>${esc(name)}는 ${esc(notes)}를 중심으로 설계한 커피입니다.${kw.length ? ` 핵심 키워드: ${esc(kw.slice(0, 3).join(", "))}.` : ""}</p>`,
      tableRows ? `<h2>기본 정보</h2><table><tbody>${tableRows}</tbody></table>` : "",
      `<h2>추천 추출</h2>`,
      `<ol>${(rcp.length ? rcp : ([["기본", "에스프레소·핸드드립·콜드브루"]] as [string, string][])).map(([k, v]) => `<li><strong>${esc(k)}</strong> ${esc(v)}</li>`).join("")}</ol>`,
      `<h2>자주 묻는 질문</h2>`,
      `<p><strong>Q. ${esc(name)}의 향미는 어떤가요?</strong><br/>${esc(notes)}의 노트를 느낄 수 있습니다.</p>`,
      `<p><strong>Q. 언제 로스팅·배송되나요?</strong><br/>매주 월·화 로스팅, 화·수 출고로 신선하게 배송됩니다.</p>`,
      `<h2>구매 안내</h2>`,
      `<p><a href="https://mtspace.coffee">mtspace.coffee</a>에서 ${esc(name)}을(를) 만나보세요.</p>`,
    ].filter(Boolean).join("\n");
  }

  function loadProduct(slug: string) {
    const p = items.find((i) => i.slug === slug);
    setF(p ? { ...EMPTY, ...p } : EMPTY);
    if (p && blogMode === "product") {
      const fa = (p.flavor || "").split(/[,·]/).map((s) => s.trim()).filter(Boolean);
      pushEditor(mdGuideBlog(p.ko || slug, fa), `${p.ko || slug} — ${fa.slice(0, 2).join(", ") || "스페셜티 커피"} | MTSPACE COFFEE`);
    }
  }

  function applyBlogMode(m: BlogMode) {
    setBlogMode(m); setSeoReport(null);
    if (m === "blank") pushEditor("<p></p>", "");
    else if (m === "keyword") { setKwSel([]); setKwOpen(true); }
    else if (f.slug) loadProduct(f.slug);
    else pushEditor("<p></p>", "");
  }
  function toggleKw(k: string) { setKwSel((prev) => prev.includes(k) ? prev.filter((x) => x !== k) : prev.length >= 3 ? prev : [...prev, k]); }
  function confirmKeywords() {
    const sel = kwSel.slice(0, 3);
    pushEditor(mdGuideBlog(sel[0] || (f.ko || "MTSPACE COFFEE"), sel), sel[0] ? `${sel[0]} — MTSPACE COFFEE` : "새 글");
    setKwOpen(false);
  }

  // AIEO/SEO 점검 + 자동 다듬기(휴리스틱, 블로그 가이드 기준)
  function checkSeo() {
    const r: string[] = [];
    const text = blogBody.replace(/<[^>]+>/g, " ");
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    r.push(`${blogTitle.length >= 15 && blogTitle.length <= 60 ? "✓" : "△"} 제목 길이 ${blogTitle.length}자 (15–60 권장)`);
    r.push(`${/<h2/i.test(blogBody) ? "✓" : "△"} H2 소제목 ${/<h2/i.test(blogBody) ? "있음" : "없음(구조화 권장)"}`);
    r.push(`${/<table/i.test(blogBody) ? "✓" : "△"} 표 (인용률↑)`);
    r.push(`${/<ol|<ul/i.test(blogBody) ? "✓" : "△"} 번호/불릿 목록`);
    r.push(`${words >= 800 ? "✓" : "△"} 본문 ${words}단어 (800+ 권장)`);
    r.push(`${/자주 묻는|faq/i.test(blogBody) ? "✓" : "△"} FAQ 섹션`);
    r.push(`${/<img/i.test(blogBody) ? "✓" : "△"} 이미지 ${/<img/i.test(blogBody) ? "있음" : "없음"}`);
    r.push(`${flavorArr.length && flavorArr.some((n) => blogBody.includes(n)) ? "✓" : "△"} 플레이버 키워드 포함`);
    setSeoReport(r);
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
  async function saveBlog(status: "draft" | "published") {
    if (!blogTitle.trim()) { setBlogStatus("제목을 입력하세요"); return; }
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
    } catch { setBlogStatus("실패"); }
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
            <p className="text-sm text-neutral-500">상세페이지는 실제 제품 상세와 <b>동일한 레이아웃</b>으로, 화면이 좁으니 <b>새 창</b>에서 엽니다. 표시되는 정보는 제품 등록 정보 그대로입니다.</p>
            <button
              disabled={!f.slug}
              onClick={() => openNewWindow(`/products/${f.slug}`)}
              className="rounded-full bg-ink px-5 py-2.5 text-sm text-oat disabled:opacity-40"
            >새 창에서 상세페이지 열기 ↗</button>
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
              <span className="text-[11px] text-neutral-400">가이드라인(블로그 작성 가이드) 구조로 초안이 생성됩니다.</span>
            </div>
            <input value={blogTitle} onChange={(e) => setBlogTitle(e.target.value)} placeholder="제목" className="w-full rounded border px-3 py-2 text-sm font-medium" />
            <ImageUpload name="studio_cover" defaultValue={blogCover} folder="blog-cover" label="커버 이미지 첨부" />
            <RichEditor key={editorKey} name="studio_body" defaultValue={blogBody} minWords={800} onChange={setBlogBody} />
            <div className="flex flex-wrap gap-2">
              <button onClick={checkSeo} className="rounded border px-3 py-1 text-xs">AIEO/SEO 점검</button>
              <button onClick={autoOptimize} className="rounded-full bg-clayDeep px-3 py-1 text-xs text-white">자동 다듬기</button>
              <span className="flex-1" />
              <button onClick={() => saveBlog("draft")} className="rounded-full border px-4 py-1.5 text-xs">보관(초안)</button>
              <button onClick={() => saveBlog("published")} className="rounded-full bg-ink px-4 py-1.5 text-xs text-oat">게시(홈 노출)</button>
            </div>
            {blogStatus && <p className="text-xs text-neutral-600">{blogStatus}</p>}
            {seoReport && <ul className="rounded-lg border bg-neutral-50 p-3 text-xs">{seoReport.map((r, i) => <li key={i}>{r}</li>)}</ul>}
            <p className="text-[11px] text-neutral-400">보관/게시한 글은 <a href="/admin/blog" className="underline">블로그 관리</a>에서 다시 수정할 수 있습니다.</p>

            {/* 키워드 선택 팝업 — 제품 정보 + 지식베이스에서 산출, 1~3개 선택 */}
            {kwOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4" onClick={() => setKwOpen(false)}>
                <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-card" onClick={(e) => e.stopPropagation()}>
                  <h3 className="text-sm font-bold">키워드 선택 <span className="font-normal text-neutral-400">(1~3개 · 제품 정보 + 지식베이스)</span></h3>
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
              <button onClick={() => openNewWindow("/tools/instagram-cardnews.html")} className="rounded-full bg-ink px-4 py-1.5 text-xs text-oat">새 창에서 열기 ↗</button>
            </div>
            <iframe src="/tools/instagram-cardnews.html" title="Instagram Card News" className="h-[78vh] w-full rounded-lg border" />

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
              <button onClick={() => openNewWindow("/tools/label-studio.html")} className="rounded-full bg-ink px-4 py-1.5 text-xs text-oat">새 창에서 열기 ↗</button>
            </div>
            <iframe src="/tools/label-studio.html" title="Label Studio" className="h-[78vh] w-full rounded-lg border" />
          </div>
        )}

        {tab === "thumbnail" && (
          <div className="mx-auto max-w-sm space-y-2">
            <p className="text-xs text-neutral-400">인스타 비율(1:1) · 제품 키컬러 배경 + 제품명 + 플레이버 노트</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={svgURI(thumb)} alt="썸네일 미리보기" className="w-full rounded-lg border" />
            <div className="flex justify-center gap-2">
              <button onClick={() => exportRaster(thumb, `${f.slug || "thumbnail"}.png`, "png", 1080, 1080)} className="rounded border px-3 py-1 text-xs">PNG 다운로드</button>
              <button onClick={() => exportRaster(thumb, `${f.slug || "thumbnail"}.jpg`, "jpeg", 1080, 1080)} className="rounded border px-3 py-1 text-xs">JPG 다운로드</button>
              <button onClick={() => downloadSVG(thumb, `${f.slug || "thumbnail"}.svg`)} className="rounded border px-3 py-1 text-xs">SVG</button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
