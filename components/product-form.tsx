"use client";
import { useState } from "react";
import { upsertProductAction } from "@/app/admin/products/actions";
import { REPORT_PRESETS, REPORT_MATERIAL } from "@/lib/label-presets";

export interface ProductFormData {
  slug?: string; brand?: string; title_ko?: string; one_liner?: string;
  status?: string; is_b2b_only?: boolean;
  roast_level?: string; flavor_notes?: string[]; origin_country?: string;
  variety?: string; process?: string; weight_g?: number | null; key_color?: string;
  sku?: string; base_price?: number; category?: string;
  report_no?: string; material?: string; story?: string; cost?: number | null;
}

export interface CategoryOption { slug: string; name: string }

export default function ProductForm({
  initial = {}, categories,
}: { initial?: ProductFormData; categories: CategoryOption[] }) {
  const i = initial;
  const input = "mt-1 w-full rounded border px-3 py-2 text-sm";
  const isNew = !i.slug;

  // 품목보고번호 → 원재료명 자동 세트
  const presetHit = REPORT_PRESETS.find((p) => p.reportNo === i.report_no);
  const [reportSel, setReportSel] = useState<string>(presetHit ? i.report_no! : (i.report_no ? "__custom__" : ""));
  const [reportNo, setReportNo] = useState<string>(i.report_no ?? "");
  const [material, setMaterial] = useState<string>(i.material ?? "");

  function onReportChange(v: string) {
    setReportSel(v);
    if (v === "__custom__") { setReportNo(""); return; }
    if (v === "") { setReportNo(""); return; }
    setReportNo(v);
    if (REPORT_MATERIAL[v]) setMaterial(REPORT_MATERIAL[v]);
  }

  // published(active) ↔ draft
  const statusInit = i.status === "draft" ? "draft" : "published";

  return (
    <form action={upsertProductAction} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <label className="block text-sm">슬러그(URL) *<input name="slug" defaultValue={i.slug} required readOnly={!isNew} className={input} /></label>
        <label className="block text-sm">브랜드
          <select name="brand" defaultValue={i.brand ?? "mtspace"} className={input}><option value="mtspace">MTSPACE</option><option value="normcore">NORMCORE</option></select>
        </label>
      </div>
      <label className="block text-sm">제품명 *<input name="title_ko" defaultValue={i.title_ko} required className={input} /></label>
      <label className="block text-sm">한 줄 키워드<input name="one_liner" defaultValue={i.one_liner} className={input} /></label>

      <div className="grid grid-cols-2 gap-4">
        <label className="block text-sm">카테고리 <span className="text-neutral-400">(쇼핑 카테고리와 동일)</span>
          <select name="category" defaultValue={i.category ?? categories[0]?.slug ?? "blends"} className={input}>
            {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
          </select>
        </label>
        <label className="block text-sm">상태
          <select name="status" defaultValue={statusInit} className={input}>
            <option value="published">발행 (published)</option>
            <option value="draft">초안 (draft)</option>
          </select>
        </label>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <label className="block text-sm">로스팅<input name="roast_level" defaultValue={i.roast_level} placeholder="라이트/미디움/다크" className={input} /></label>
        <label className="block text-sm">원산지<input name="origin_country" defaultValue={i.origin_country} className={input} /></label>
        <label className="block text-sm">중량(g)<input type="number" name="weight_g" defaultValue={i.weight_g ?? ""} className={input} /></label>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <label className="block text-sm">품종<input name="variety" defaultValue={i.variety} className={input} /></label>
        <label className="block text-sm">가공<input name="process" defaultValue={i.process} className={input} /></label>
      </div>
      <label className="block text-sm">플레이버 노트 (쉼표 구분)<input name="flavor_notes" defaultValue={(i.flavor_notes ?? []).join(", ")} className={input} /></label>

      {/* 커피 스토리 */}
      <label className="block text-sm">커피 스토리 (상세·카드뉴스 스토리요약 소스)
        <textarea name="story" defaultValue={i.story} rows={4} className={input} placeholder="이 커피의 이야기를 입력하세요." /></label>

      {/* 라벨 표시정보 — 품목보고번호 드롭다운 → 원재료명 자동 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="text-sm">
          품목보고번호(라벨)
          <select value={reportSel} onChange={(e) => onReportChange(e.target.value)} className={input}>
            <option value="">— 선택 —</option>
            {REPORT_PRESETS.map((p) => <option key={p.reportNo} value={p.reportNo}>{p.reportNo} · {p.name}</option>)}
            <option value="__custom__">직접 입력…</option>
          </select>
          {reportSel === "__custom__" && (
            <input value={reportNo} onChange={(e) => setReportNo(e.target.value)} placeholder="2022026 4913101" className={`${input} mt-2`} />
          )}
          <input type="hidden" name="report_no" value={reportNo} />
        </div>
        <label className="block text-sm">원재료명(라벨) <span className="text-neutral-400">(보고번호 선택 시 자동)</span>
          <input name="material" value={material} onChange={(e) => setMaterial(e.target.value)} placeholder="커피원두 100% (에티오피아 100%)" className={input} /></label>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <label className="block text-sm">키 컬러(HEX) <span className="text-neutral-400">(비우면 매트릭스 자동)</span><input name="key_color" defaultValue={i.key_color} placeholder="비우면 flavor×roast 자동" className={input} /></label>
        <label className="block text-sm">SKU<input name="sku" defaultValue={i.sku} className={input} /></label>
        <label className="block text-sm">소비자가(원)<input type="number" name="base_price" defaultValue={i.base_price ?? ""} className={input} /></label>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <label className="block text-sm">제조원가(원) <span className="text-neutral-400">(gross profit 계산)</span><input type="number" name="cost" defaultValue={i.cost ?? ""} className={input} /></label>
      </div>

      <div className="flex gap-6 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" name="is_b2b_only" defaultChecked={i.is_b2b_only} /> 사업자 전용(도매)</label>
      </div>
      <p className="text-xs text-neutral-400">※ 상세·카드뉴스·레이블·썸네일 등 디자인 자산은 <a href="/admin/studio" className="underline">통합 스튜디오</a>에서 이 정보를 불러와 작업합니다.</p>
      <button className="rounded-card bg-ink px-6 py-2.5 text-sm font-semibold text-oat">{isNew ? "등록" : "저장"}</button>
    </form>
  );
}
