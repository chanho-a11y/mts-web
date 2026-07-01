"use client";
import { useMemo, useState } from "react";
import { buildDesignedDetailHtml, generateDrafts, type DesignedFields } from "@/lib/content-gen";

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
const EMPTY: StudioItem = { slug: "", ko: "", en: "", country: "", region: "", farm: "", farmer: "",
  variety: "", process: "", altitude: "", roast: "", flavor: "", weight: "", story: "",
  rcp_es: "", rcp_fil: "", rcp_milk: "", hash: "", key_color: "#B0764A", price: "" };

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

export default function UnifiedStudio({ items }: { items: StudioItem[] }) {
  const [f, setF] = useState<StudioItem>(EMPTY);
  const [tab, setTab] = useState<Tab>("detail");
  const [saved, setSaved] = useState<string | null>(null);

  // 블로그 편집 상태
  const [blogMode, setBlogMode] = useState<BlogMode>("product");
  const [blogTitle, setBlogTitle] = useState("");
  const [blogBody, setBlogBody] = useState("");
  const [blogKeywords, setBlogKeywords] = useState("");
  const [seoReport, setSeoReport] = useState<string[] | null>(null);

  function loadProduct(slug: string) {
    const p = items.find((i) => i.slug === slug);
    const next = p ? { ...EMPTY, ...p } : EMPTY;
    setF(next); setSaved(null);
    // 제품 모드 블로그 자동 생성
    if (p) {
      const flavorArr = (p.flavor || "").split(/[,·]/).map((s) => s.trim()).filter(Boolean);
      const d = generateDrafts({ title_ko: p.ko, one_liner: p.story, flavor_notes: flavorArr, roast_level: p.roast, origin: { country: p.country }, variety: p.variety, process: p.process, weight_g: p.weight ? Number(p.weight) : null, body_html: null });
      const b = d.find((x) => x.type === "blog");
      if (b) { setBlogTitle(b.title); setBlogBody(b.body_html); setBlogMode("product"); }
    }
  }

  const flavorArr = useMemo(() => (f.flavor || "").split(/[,·]/).map((s) => s.trim()).filter(Boolean), [f.flavor]);
  const detailHtml = useMemo(() => buildDesignedDetailHtml(f, f.key_color), [f]);
  const accent = f.key_color || "#B0764A";

  const thumb = useMemo(() => thumbSquare(accent, f.ko || "(제품명)", f.en, flavorArr), [accent, f.ko, f.en, flavorArr]);
  const rcp = useMemo(() => ([["ESPRESSO", f.rcp_es], ["FILTER", f.rcp_fil], ["MILK", f.rcp_milk]] as [string, string][]).filter(([, v]) => v), [f]);
  const slides = useMemo(() => [1, 2, 3, 4, 5].map((i) => slide(i, accent, { ko: f.ko || "(제품명)", en: f.en, flavor: flavorArr, story: f.story, rcp })), [accent, f, flavorArr, rcp]);

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

  // 블로그 모드 전환
  function applyBlogMode(m: BlogMode) {
    setBlogMode(m); setSeoReport(null);
    if (m === "blank") { setBlogTitle(""); setBlogBody("<p></p>"); }
    else if (m === "keyword") {
      const kws = blogKeywords.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
      setBlogTitle(kws[0] ? `${kws[0]} — MTSPACE COFFEE` : "새 글");
      setBlogBody(`<h2>${esc(kws[0] || "제목")}</h2>\n<p>${kws.slice(1).map(esc).join(", ")}에 대한 내용을 작성하세요.</p>`);
    } else if (f.slug) { loadProduct(f.slug); }
  }
  function insertAtBody(html: string) { setBlogBody((b) => b + "\n" + html); }
  function insertImage() { const u = prompt("이미지 URL"); if (u) insertAtBody(`<img src="${u}" alt="${esc(f.ko || "이미지")}" style="max-width:100%;border-radius:8px" />`); }
  function insertLink() { const t = prompt("링크 텍스트"); if (!t) return; const u = prompt("URL"); if (u) insertAtBody(`<a href="${u}">${esc(t)}</a>`); }

  // AIEO/SEO 점검 + 자동 다듬기(휴리스틱)
  function checkSeo() {
    const r: string[] = [];
    const text = blogBody.replace(/<[^>]+>/g, " ");
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    r.push(`${blogTitle.length >= 15 && blogTitle.length <= 60 ? "✓" : "△"} 제목 길이 ${blogTitle.length}자 (15–60 권장)`);
    r.push(`${/<h2/i.test(blogBody) ? "✓" : "△"} H2 소제목 ${/<h2/i.test(blogBody) ? "있음" : "없음(구조화 권장)"}`);
    r.push(`${words >= 300 ? "✓" : "△"} 본문 ${words}단어 (300+ 권장)`);
    r.push(`${/<img/i.test(blogBody) ? "✓" : "△"} 이미지 ${/<img/i.test(blogBody) ? "있음" : "없음"}`);
    r.push(`${/alt=/.test(blogBody) || !/<img/i.test(blogBody) ? "✓" : "△"} 이미지 alt 텍스트`);
    r.push(`${flavorArr.length && flavorArr.some((n) => blogBody.includes(n)) ? "✓" : "△"} 플레이버 키워드 포함`);
    setSeoReport(r);
  }
  function autoOptimize() {
    let body = blogBody;
    const name = f.ko || blogTitle || "MTSPACE COFFEE";
    // 1) 리드 문단(메타 디스크립션 소스) — 첫 문단이 짧으면 요약 삽입
    const firstP = (body.match(/<p>([\s\S]*?)<\/p>/i)?.[1] ?? "").replace(/<[^>]+>/g, "").trim();
    if (firstP.length < 60) {
      const lead = `${name}${flavorArr.length ? ` — ${flavorArr.slice(0, 3).join(", ")}` : ""}. ${f.story || "매주 로스팅한 스페셜티 커피"}.`;
      body = `<p>${esc(lead)}</p>\n` + body;
    }
    // 2) H2 구조 보강
    if (!/<h2/i.test(body)) body = `<h2>${esc(name)}</h2>\n` + body;
    // 3) 이미지 alt 보강
    body = body.replace(/<img((?![^>]*\balt=)[^>]*)>/gi, `<img$1 alt="${esc(name)}">`);
    // 4) 플레이버 키워드
    if (flavorArr.length && !flavorArr.some((n) => body.includes(n))) {
      body += `\n<p><strong>플레이버 노트:</strong> ${flavorArr.join(" · ")}</p>`;
    }
    // 5) AIEO 친화 FAQ 블록(질문형 — 생성형 검색 대응)
    if (!/자주 묻는|faq/i.test(body)) {
      body += `\n<h2>자주 묻는 질문</h2>`
        + `\n<p><strong>Q. ${esc(name)}의 플레이버는 어떤가요?</strong><br/>${flavorArr.length ? esc(flavorArr.join(", ")) : "밸런스 좋은 풍미"}의 노트를 느낄 수 있습니다.</p>`
        + `\n<p><strong>Q. 언제 로스팅하고 배송되나요?</strong><br/>매주 월·화 로스팅, 화·수 출고로 신선하게 배송됩니다.</p>`;
    }
    // 6) 구매 CTA
    if (!/mtspace\.coffee/i.test(body)) {
      body += `\n<h2>구매 안내</h2>\n<p><a href="https://mtspace.coffee">mtspace.coffee</a>에서 ${esc(name)}을(를) 만나보세요.</p>`;
    }
    setBlogBody(body);
    if (!blogTitle || blogTitle.length < 15) setBlogTitle(`${name} — ${flavorArr.slice(0, 2).join(", ") || "스페셜티 커피"} | MTSPACE COFFEE`);
    checkSeo();
  }

  async function save() {
    if (!f.slug && blogMode === "product") { setSaved("제품을 선택하면 상세·블로그가 해당 제품에 저장됩니다."); return; }
    setSaved("저장 중…");
    try {
      const { slug, price, image, ...fields } = f; void price; void image;
      const res = await fetch("/api/studio/save", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, fields, blog_title: blogTitle, blog_body: blogBody }),
      });
      const j = await res.json().catch(() => ({}));
      setSaved(res.ok ? `저장됨 ✓ (${(j.saved ?? []).join(", ")})` : `저장 실패: ${j.error ?? res.status}`);
    } catch { setSaved("저장 실패"); }
  }

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
            <label className="block text-sm">국가<input readOnly className={ro} value={f.country ?? ""} /></label>
            <label className="block text-sm">로스팅<input readOnly className={ro} value={f.roast ?? ""} /></label>
            <label className="col-span-2 block text-sm">플레이버<input readOnly className={ro} value={f.flavor ?? ""} /></label>
            <label className="col-span-2 block text-sm">스토리<textarea readOnly rows={2} className={ro} value={f.story ?? ""} /></label>
            <label className="block text-sm">포인트 컬러
              <div className="mt-1 flex items-center gap-2"><span className="inline-block h-6 w-6 rounded border" style={{ background: accent }} /><span className="text-xs text-neutral-500">{accent}</span></div>
            </label>
          </div>
        ) : <p className="rounded border border-dashed p-4 text-center text-xs text-neutral-400">제품을 선택하세요.</p>}
        <button onClick={save} className="w-full rounded-full bg-ink py-2 text-sm text-oat">저장(상세·블로그)</button>
        {saved && <p className="text-center text-xs text-neutral-500">{saved}</p>}
      </aside>

      {/* 우: 탭 */}
      <section className="min-w-0">
        <div className="mb-4 flex flex-wrap gap-2 border-b pb-2">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`rounded-full px-4 py-1.5 text-sm ${tab === t.id ? "bg-ink text-oat" : "border hover:bg-neutral-50"}`}>{t.label}</button>
          ))}
        </div>

        {tab === "detail" && (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs text-neutral-400">정보는 제품 수정에서 입력됨 · 여기서는 레이아웃/이미지 위주</p>
              <button onClick={() => copy(detailHtml)} className="rounded border px-3 py-1 text-xs">HTML 복사</button>
            </div>
            <div className="rounded-xl border p-5" dangerouslySetInnerHTML={{ __html: detailHtml }} />
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
              {blogMode === "keyword" && <input value={blogKeywords} onChange={(e) => setBlogKeywords(e.target.value)} placeholder="키워드(쉼표)" className="rounded border px-2 py-1 text-xs" />}
            </div>
            <input value={blogTitle} onChange={(e) => setBlogTitle(e.target.value)} placeholder="제목" className="w-full rounded border px-3 py-2 text-sm font-medium" />
            <div className="flex flex-wrap gap-2">
              <button onClick={insertImage} className="rounded border px-3 py-1 text-xs">🖼 이미지 삽입</button>
              <button onClick={insertLink} className="rounded border px-3 py-1 text-xs">🔗 링크 삽입</button>
              <button onClick={checkSeo} className="rounded border px-3 py-1 text-xs">AIEO/SEO 점검</button>
              <button onClick={autoOptimize} className="rounded-full bg-clayDeep px-3 py-1 text-xs text-white">자동 다듬기</button>
              <button onClick={() => copy(blogBody)} className="rounded border px-3 py-1 text-xs">HTML 복사</button>
            </div>
            {seoReport && <ul className="rounded-lg border bg-neutral-50 p-3 text-xs">{seoReport.map((r, i) => <li key={i}>{r}</li>)}</ul>}
            <div className="grid gap-3 md:grid-cols-2">
              <textarea value={blogBody} onChange={(e) => setBlogBody(e.target.value)} rows={18} className="w-full rounded-xl border p-3 font-mono text-xs" placeholder="<p>본문 (HTML) …</p>" />
              <div className="prose max-w-none rounded-xl border p-4 text-sm" dangerouslySetInnerHTML={{ __html: blogBody }} />
            </div>
          </div>
        )}

        {tab === "cardnews" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-neutral-400">5장 구조: 제품명 · 플레이버 · 스토리요약 · 레시피 · 구매 CTA (1080×1350)</p>
              <div className="flex gap-2">
                <button onClick={() => slides.forEach((s, i) => exportRaster(s, `${f.slug || "cardnews"}-0${i + 1}.png`, "png", 1080, 1350))} className="rounded border px-3 py-1 text-xs">전체 PNG</button>
                <button onClick={() => slides.forEach((s, i) => exportRaster(s, `${f.slug || "cardnews"}-0${i + 1}.jpg`, "jpeg", 1080, 1350))} className="rounded border px-3 py-1 text-xs">전체 JPG</button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
          </div>
        )}

        {tab === "label" && (
          <div>
            <p className="mb-2 text-sm text-neutral-500">180×130mm 정밀 레이블 편집기(현행 버전). 상단 ‘내부 제품 연동’에서 위에서 선택한 제품을 불러올 수 있습니다.</p>
            <iframe src="/tools/label-studio.html" title="Label Studio" className="h-[70vh] w-full rounded-lg border" />
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
