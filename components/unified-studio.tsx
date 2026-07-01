"use client";
import { useMemo, useState } from "react";
import { buildDesignedDetailHtml, generateDrafts, type DesignedFields } from "@/lib/content-gen";
import { cardnewsSVG, thumbnailSVG } from "@/lib/asset-svg";

// 통합 스튜디오: 한 번의 제품 정보 입력 → 레이블·상세페이지·블로그·카드뉴스·인스타 콘텐츠를 한 화면에서 생성.
// 기존 디자인 스튜디오 + 레이블 스튜디오를 하나의 진입점으로 통합.

export interface StudioItem extends DesignedFields {
  slug: string;
  en?: string;
  hash?: string;
  key_color?: string;
  price?: number | string;
  image?: string | null;
}

type Tab = "detail" | "blog" | "cardnews" | "instagram" | "label";
const TABS: { id: Tab; label: string }[] = [
  { id: "detail", label: "상세페이지" },
  { id: "blog", label: "블로그" },
  { id: "cardnews", label: "카드뉴스" },
  { id: "instagram", label: "인스타그램" },
  { id: "label", label: "레이블(정밀)" },
];

const BRAND = { name: "MTSPACE COFFEE", instagram: "@mtspacecoffee" };
const EMPTY: StudioItem = { slug: "", ko: "", en: "", country: "", region: "", farm: "", farmer: "",
  variety: "", process: "", altitude: "", roast: "", flavor: "", weight: "", story: "",
  rcp_es: "", rcp_fil: "", rcp_milk: "", hash: "", key_color: "#B0764A", price: "" };

export default function UnifiedStudio({ items }: { items: StudioItem[] }) {
  const [f, setF] = useState<StudioItem>(EMPTY);
  const [tab, setTab] = useState<Tab>("detail");
  const [saved, setSaved] = useState<string | null>(null);

  function loadProduct(slug: string) {
    const p = items.find((i) => i.slug === slug);
    if (p) { setF({ ...EMPTY, ...p }); setSaved(null); }
    else setF(EMPTY);
  }
  const set = (k: keyof StudioItem) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF((s) => ({ ...s, [k]: e.target.value }));

  // 공유 입력 → 각 산출물 파생 (한 번 입력, 여러 결과)
  const flavorArr = useMemo(() => (f.flavor || "").split(/[,·]/).map((s) => s.trim()).filter(Boolean), [f.flavor]);
  const detailHtml = useMemo(() => buildDesignedDetailHtml(f, f.key_color), [f]);
  const drafts = useMemo(() => generateDrafts({
    title_ko: f.ko || "(제품명)", one_liner: f.story, flavor_notes: flavorArr, roast_level: f.roast,
    origin: { country: f.country }, variety: f.variety, process: f.process,
    weight_g: f.weight ? Number(f.weight) : null, body_html: null,
  }), [f, flavorArr]);
  const blog = drafts.find((d) => d.type === "blog");
  const asset = useMemo(() => ({
    title_ko: f.ko || "(제품명)", title_en: f.en, one_liner: f.story, flavor_notes: flavorArr,
    roast_level: f.roast, key_color: f.key_color, minPrice: f.price ? Number(f.price) : undefined,
  }), [f, flavorArr]);
  const cardnews = useMemo(() => cardnewsSVG(asset, BRAND, { accent: f.key_color }), [asset, f.key_color]);
  const thumb = useMemo(() => thumbnailSVG(asset, BRAND, { accent: f.key_color }), [asset, f.key_color]);
  const igCaption = useMemo(() => {
    const tags = (f.hash || flavorArr.map((n) => "#" + n.replace(/\s+/g, "")).join(" ")).trim();
    return [f.ko, f.story, flavorArr.length ? `Flavour · ${flavorArr.join(" / ")}` : "",
      "매주 월·화 로스팅 · 화·수 출고 — everyday excellence.", tags].filter(Boolean).join("\n\n");
  }, [f, flavorArr]);

  async function save() {
    if (!f.slug) { setSaved("제품을 선택하면 상세·블로그가 해당 제품에 저장됩니다."); return; }
    setSaved("저장 중…");
    try {
      const { slug, price, image, ...fields } = f; // 스튜디오 필드만 전달
      void price; void image;
      const res = await fetch("/api/studio/save", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, fields, blog_title: blog?.title, blog_body: blog?.body_html }),
      });
      const j = await res.json().catch(() => ({}));
      setSaved(res.ok ? `저장됨 ✓ (${(j.saved ?? []).join(", ")})` : `저장 실패: ${j.error ?? res.status}`);
    } catch { setSaved("저장 실패"); }
  }

  function copy(text: string) { navigator.clipboard?.writeText(text); }
  function downloadSVG(svg: string, name: string) {
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  }

  const input = "mt-1 w-full rounded border px-2.5 py-1.5 text-sm";
  const svgURI = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      {/* 좌: 단일 입력 폼 (모든 산출물의 단일 소스) */}
      <aside className="space-y-3 rounded-xl border p-4">
        <div>
          <label className="text-xs font-bold uppercase text-neutral-400">제품 불러오기</label>
          <select className={input} value={f.slug} onChange={(e) => loadProduct(e.target.value)}>
            <option value="">— 새로 입력 / 제품 선택 —</option>
            {items.map((i) => <option key={i.slug} value={i.slug}>{i.ko || i.slug}</option>)}
          </select>
          <p className="mt-1 text-[11px] text-neutral-400">한 번 입력하면 우측 탭(레이블·상세·블로그·카드뉴스·인스타)에 동시 반영됩니다.</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-sm">제품명(KO)<input className={input} value={f.ko} onChange={set("ko")} /></label>
          <label className="block text-sm">제품명(EN)<input className={input} value={f.en ?? ""} onChange={set("en")} /></label>
          <label className="block text-sm">국가<input className={input} value={f.country ?? ""} onChange={set("country")} /></label>
          <label className="block text-sm">지역<input className={input} value={f.region ?? ""} onChange={set("region")} /></label>
          <label className="block text-sm">농장<input className={input} value={f.farm ?? ""} onChange={set("farm")} /></label>
          <label className="block text-sm">생산자<input className={input} value={f.farmer ?? ""} onChange={set("farmer")} /></label>
          <label className="block text-sm">품종<input className={input} value={f.variety ?? ""} onChange={set("variety")} /></label>
          <label className="block text-sm">가공<input className={input} value={f.process ?? ""} onChange={set("process")} /></label>
          <label className="block text-sm">고도<input className={input} value={f.altitude ?? ""} onChange={set("altitude")} /></label>
          <label className="block text-sm">로스팅<input className={input} value={f.roast ?? ""} onChange={set("roast")} /></label>
          <label className="block text-sm">중량(g)<input className={input} value={f.weight ?? ""} onChange={set("weight")} /></label>
          <label className="block text-sm">가격(원)<input className={input} value={String(f.price ?? "")} onChange={set("price")} /></label>
        </div>
        <label className="block text-sm">플레이버 노트(쉼표)<input className={input} value={f.flavor ?? ""} onChange={set("flavor")} placeholder="자두, 다크초콜릿, 캐러멜" /></label>
        <label className="block text-sm">한 줄 스토리<textarea rows={2} className={input} value={f.story ?? ""} onChange={set("story")} /></label>
        <div className="grid grid-cols-1 gap-2">
          <label className="block text-sm">레시피 · 에스프레소<input className={input} value={f.rcp_es ?? ""} onChange={set("rcp_es")} /></label>
          <label className="block text-sm">레시피 · 필터<input className={input} value={f.rcp_fil ?? ""} onChange={set("rcp_fil")} /></label>
          <label className="block text-sm">레시피 · 밀크<input className={input} value={f.rcp_milk ?? ""} onChange={set("rcp_milk")} /></label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-sm">포인트 컬러<input type="color" className="mt-1 h-9 w-full rounded border" value={f.key_color || "#B0764A"} onChange={set("key_color")} /></label>
          <label className="block text-sm">해시태그<input className={input} value={f.hash ?? ""} onChange={set("hash")} placeholder="#mtspacecoffee" /></label>
        </div>
        <button onClick={save} className="w-full rounded-full bg-ink py-2 text-sm text-oat">초안 저장(상세·블로그·캡션)</button>
        {saved && <p className="text-center text-xs text-neutral-500">{saved}</p>}
      </aside>

      {/* 우: 탭 산출물 */}
      <section className="min-w-0">
        <div className="mb-4 flex flex-wrap gap-2 border-b pb-2">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`rounded-full px-4 py-1.5 text-sm ${tab === t.id ? "bg-ink text-oat" : "border hover:bg-neutral-50"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === "detail" && (
          <div>
            <div className="mb-2 flex justify-end"><button onClick={() => copy(detailHtml)} className="rounded border px-3 py-1 text-xs">HTML 복사</button></div>
            <div className="rounded-xl border p-5" dangerouslySetInnerHTML={{ __html: detailHtml }} />
          </div>
        )}

        {tab === "blog" && blog && (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm text-neutral-500">SEO: {blog.seo_title}</p>
              <button onClick={() => copy(blog.body_html)} className="rounded border px-3 py-1 text-xs">HTML 복사</button>
            </div>
            <div className="prose max-w-none rounded-xl border p-5" dangerouslySetInnerHTML={{ __html: blog.body_html }} />
          </div>
        )}

        {tab === "cardnews" && (
          <div className="space-y-2">
            <div className="flex justify-end"><button onClick={() => downloadSVG(cardnews, `${f.slug || "cardnews"}.svg`)} className="rounded border px-3 py-1 text-xs">SVG 다운로드</button></div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={svgURI(cardnews)} alt="카드뉴스 미리보기" className="mx-auto w-full max-w-sm rounded-lg border" />
          </div>
        )}

        {tab === "instagram" && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex justify-end"><button onClick={() => downloadSVG(thumb, `${f.slug || "instagram"}.svg`)} className="rounded border px-3 py-1 text-xs">SVG 다운로드</button></div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={svgURI(thumb)} alt="인스타 이미지" className="w-full rounded-lg border" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between"><p className="text-sm font-medium">캡션</p><button onClick={() => copy(igCaption)} className="rounded border px-3 py-1 text-xs">캡션 복사</button></div>
              <pre className="whitespace-pre-wrap rounded-lg border p-4 text-sm">{igCaption}</pre>
            </div>
          </div>
        )}

        {tab === "label" && (
          <div>
            <p className="mb-2 text-sm text-neutral-500">180×130mm 정밀 레이블 편집기. 위에서 선택한 제품을 상단 ‘내부 제품 연동’에서 동일하게 불러올 수 있습니다.</p>
            <iframe src="/tools/label-studio.html" title="Label Studio" className="h-[70vh] w-full rounded-lg border" />
          </div>
        )}
      </section>
    </div>
  );
}
