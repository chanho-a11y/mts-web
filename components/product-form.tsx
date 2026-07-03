"use client";
import { useState } from "react";
import { upsertProductAction } from "@/app/admin/products/actions";
import { type ReportPreset, normReportNo } from "@/lib/report-no";
import { EXPANDED_PALETTE } from "@/lib/point-color";
import { RECIPE_ROWS, RECIPE_MODE_LABEL, type RecipeMode, type RecipeData } from "@/lib/recipe";
import { EVIDENCE_FIELDS, type EvidenceData } from "@/lib/evidence";

export interface ProductFormData {
  slug?: string; brand?: string; title_ko?: string; title_en?: string; one_liner?: string; one_liner_en?: string;
  status?: string; is_b2b_only?: boolean;
  roast_level?: string; roast_level_en?: string; flavor_notes?: string[]; flavor_notes_en?: string[];
  origin_country?: string; origin_country_en?: string;
  variety?: string; variety_en?: string; process?: string; process_en?: string;
  weight_g?: number | null; key_color?: string;
  sku?: string; base_price?: number; category?: string;
  report_no?: string; material?: string; story?: string; story_en?: string; cost?: number | null;
  recipe?: RecipeData | null;
  evidence?: EvidenceData | null;
}

export interface CategoryOption { slug: string; name: string }

// 한/영 두 칸을 한 줄에 (라벨 + KO + EN)
function BilingualField({ label, nameKo, nameEn, ko, en, textarea, placeholder }: {
  label: string; nameKo: string; nameEn: string; ko?: string; en?: string; textarea?: boolean; placeholder?: string;
}) {
  const input = "mt-1 w-full rounded border px-3 py-2 text-sm";
  return (
    <div className="text-sm">
      <div className="font-medium">{label}</div>
      <div className="mt-1 grid grid-cols-2 gap-2">
        {textarea ? (
          <><textarea name={nameKo} defaultValue={ko} rows={3} placeholder={`${placeholder ?? ""} (한글)`} className={input} />
          <textarea name={nameEn} defaultValue={en} rows={3} placeholder={`${placeholder ?? ""} (English)`} className={input} /></>
        ) : (
          <><input name={nameKo} defaultValue={ko} placeholder="한글" className={input} />
          <input name={nameEn} defaultValue={en} placeholder="English" className={input} /></>
        )}
      </div>
    </div>
  );
}

export default function ProductForm({
  initial = {}, categories, reportPresets = [],
}: { initial?: ProductFormData; categories: CategoryOption[]; reportPresets?: ReportPreset[] }) {
  const i = initial;
  const input = "mt-1 w-full rounded border px-3 py-2 text-sm";
  const isNew = !i.slug;

  // 품목보고번호 → 원재료명 자동 세트 (DB 마스터 = report_no). 구 공백포맷 대비 정규화 매칭.
  const reportMaterial: Record<string, string> = Object.fromEntries(reportPresets.map((p) => [p.reportNo, p.material]));
  const presetHit = reportPresets.find((p) => normReportNo(p.reportNo) === normReportNo(i.report_no ?? ""));
  const [reportSel, setReportSel] = useState<string>(presetHit ? presetHit.reportNo : (i.report_no ? "__custom__" : ""));
  const [reportNo, setReportNo] = useState<string>(i.report_no ?? "");
  const [material, setMaterial] = useState<string>(i.material ?? "");
  const [keyColor, setKeyColor] = useState<string>(i.key_color ?? "");

  function onReportChange(v: string) {
    setReportSel(v);
    if (v === "__custom__") { setReportNo(""); return; }
    if (v === "") { setReportNo(""); return; }
    setReportNo(v);
    if (reportMaterial[v]) setMaterial(reportMaterial[v]);
  }

  const statusInit = i.status === "draft" ? "draft" : "published";
  const rc = i.recipe ?? {};
  const rv = (mode: RecipeMode, key: string) => ((rc as Record<string, Record<string, string> | undefined>)[mode]?.[key]) ?? "";

  return (
    <form action={upsertProductAction} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <label className="block text-sm">슬러그(URL) *<input name="slug" defaultValue={i.slug} required readOnly={!isNew} className={input} /></label>
        <label className="block text-sm">브랜드
          <select name="brand" defaultValue={i.brand ?? "mtspace"} className={input}><option value="mtspace">MTSPACE</option><option value="normcore">NORMCORE</option></select>
        </label>
      </div>

      <p className="text-xs text-neutral-400">※ 노출 텍스트는 한/영 모두 입력합니다(왼쪽 한글 · 오른쪽 English). 디자인 시 각 언어를 다르게 사용합니다.</p>

      <BilingualField label="제품명 *" nameKo="title_ko" nameEn="title_en" ko={i.title_ko} en={i.title_en} placeholder="제품명" />
      <BilingualField label="한 줄 키워드" nameKo="one_liner" nameEn="one_liner_en" ko={i.one_liner} en={i.one_liner_en} placeholder="한 줄 키워드" />

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

      <BilingualField label="로스팅" nameKo="roast_level" nameEn="roast_level_en" ko={i.roast_level} en={i.roast_level_en} placeholder="라이트/미디움/다크" />
      <BilingualField label="원산지" nameKo="origin_country" nameEn="origin_country_en" ko={i.origin_country} en={i.origin_country_en} placeholder="원산지" />
      <div className="grid grid-cols-2 gap-4">
        <label className="block text-sm">중량(g)<input type="number" name="weight_g" defaultValue={i.weight_g ?? ""} className={input} /></label>
      </div>
      <BilingualField label="품종" nameKo="variety" nameEn="variety_en" ko={i.variety} en={i.variety_en} placeholder="품종" />
      <BilingualField label="가공" nameKo="process" nameEn="process_en" ko={i.process} en={i.process_en} placeholder="가공방식" />
      <BilingualField label="플레이버 노트 (쉼표 구분)" nameKo="flavor_notes" nameEn="flavor_notes_en" ko={(i.flavor_notes ?? []).join(", ")} en={(i.flavor_notes_en ?? []).join(", ")} placeholder="예: 다크초콜릿, 캐러멜" />
      <BilingualField label="커피 스토리 (상세·카드뉴스 스토리요약 소스)" nameKo="story" nameEn="story_en" ko={i.story} en={i.story_en} textarea placeholder="이 커피의 이야기" />

      {/* 추출 레시피 — 필터 / 에스프레소 / 밀크 */}
      <fieldset className="rounded-card border border-line p-4">
        <legend className="px-1 text-sm font-semibold">추출 레시피 <span className="font-normal text-neutral-400">(상세 커피정보 · 스튜디오 소스)</span></legend>
        <div className="space-y-4">
          {(Object.keys(RECIPE_ROWS) as RecipeMode[]).map((mode) => (
            <div key={mode}>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">{RECIPE_MODE_LABEL[mode].ko} · {RECIPE_MODE_LABEL[mode].en}</div>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                {RECIPE_ROWS[mode].map((r) => (
                  <div key={r.key}>
                    <label className="block text-xs text-neutral-500">{r.ko}{r.unit ? ` (${r.unit})` : ""}
                      <input name={`rcp_${mode}_${r.key}`} defaultValue={rv(mode, r.key)} className="mt-0.5 w-full rounded border px-2 py-1.5 text-sm" />
                    </label>
                    {r.bilingual && (
                      <input name={`rcp_${mode}_${r.key}_en`} defaultValue={rv(mode, `${r.key}_en`)} placeholder={`${r.en} (EN)`} className="mt-1 w-full rounded border px-2 py-1.5 text-xs" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </fieldset>

      {/* 자사 1차 데이터 — 블로그 근거(자사 실측/기록). 신뢰의 핵심 소스, 날조 위험 0. */}
      <fieldset className="rounded-card border border-line p-4">
        <legend className="px-1 text-sm font-semibold">자사 1차 데이터 <span className="font-normal text-neutral-400">(블로그 근거 · 자사 실측/기록 — 통계·주장의 출처가 됩니다)</span></legend>
        <p className="mb-2 text-xs text-neutral-400">여기 입력한 값은 블로그 초안에 <b>‘자사 실측/기록’ 출처로 태깅</b>되어 삽입됩니다. 경쟁사가 복제할 수 없는 1차 경험이 신뢰·AI 인용을 가장 크게 올립니다. 빈 칸은 넣지 않습니다.</p>
        <div className="space-y-2">
          {EVIDENCE_FIELDS.map((f) => (
            <label key={f.key} className="block text-sm">
              <span className="text-xs font-medium text-neutral-600">{f.ko}</span>
              <input name={`ev_${f.key}`} defaultValue={(i.evidence ?? {})[f.key] ?? ""} placeholder={f.hint} className={input} />
            </label>
          ))}
        </div>
      </fieldset>

      {/* 라벨 표시정보 — 품목보고번호 드롭다운 → 원재료명 자동 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="text-sm">
          품목보고번호(라벨)
          <select value={reportSel} onChange={(e) => onReportChange(e.target.value)} className={input}>
            <option value="">— 선택 —</option>
            {reportPresets.map((p) => <option key={p.reportNo} value={p.reportNo}>{p.reportNo} · {p.name}</option>)}
            <option value="__custom__">직접 입력…</option>
          </select>
          {reportSel === "__custom__" && (
            <input value={reportNo} onChange={(e) => setReportNo(e.target.value)} placeholder="20220264913101" className={`${input} mt-2`} />
          )}
          <p className="mt-1 text-[11px] text-neutral-400">목록은 <b>품목보고번호 관리</b>에서 추가·변경합니다.</p>
          <input type="hidden" name="report_no" value={reportNo} />
        </div>
        <label className="block text-sm">원재료명(라벨) <span className="text-neutral-400">(보고번호 선택 시 자동)</span>
          <input name="material" value={material} onChange={(e) => setMaterial(e.target.value)} placeholder="커피원두 100% (에티오피아 100%)" className={input} /></label>
      </div>

      {/* 키 컬러 — 자유 색상 선택 + 확장 팔레트(12 flavor × 3 roast) + 자동 */}
      <div className="text-sm">
        <div className="font-medium">키 컬러 <span className="font-normal text-neutral-400">(자유 선택 또는 팔레트 · 자동 = flavor×roast 매트릭스)</span></div>

        {/* 모드: 자동 / 자유 색상 */}
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => setKeyColor("")}
            className={`rounded-full border px-3 py-1.5 text-xs ${keyColor === "" ? "border-ink bg-ink text-oat" : "hover:bg-neutral-100"}`}>자동</button>
          <label className="flex items-center gap-2 rounded-full border px-3 py-1 text-xs">
            <span className="text-neutral-500">자유 색상</span>
            <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(keyColor) ? keyColor : "#C68D62"}
              onChange={(e) => setKeyColor(e.target.value)} className="h-6 w-8 cursor-pointer rounded border-0 bg-transparent p-0" />
            <input value={keyColor} onChange={(e) => setKeyColor(e.target.value)} placeholder="#C68D62"
              className="w-24 rounded border px-2 py-1 font-mono text-[11px]" />
          </label>
          {keyColor !== "" && (
            <span className="flex items-center gap-1 text-[11px] text-neutral-500">
              <span className="inline-block h-4 w-4 rounded-full border" style={{ background: /^#[0-9a-fA-F]{6}$/.test(keyColor) ? keyColor : "transparent" }} />
              선택됨
            </span>
          )}
        </div>

        {/* 확장 팔레트 — 플레이버 행 × 로스팅(Light/Medium/Dark) */}
        <div className="mt-3 space-y-1.5 rounded-card border border-line p-3">
          <div className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-wide text-neutral-400">
            <span className="w-14">Flavor</span><span className="w-10 text-center">Light</span><span className="w-10 text-center">Medium</span><span className="w-10 text-center">Dark</span>
          </div>
          {EXPANDED_PALETTE.map((fS) => (
            <div key={fS.flavor} className="flex items-center gap-2">
              <span className="w-14 text-[11px] text-neutral-600">{fS.ko}</span>
              {(["light", "medium", "dark"] as const).map((r) => {
                const hex = fS[r];
                const active = keyColor.toLowerCase() === hex.toLowerCase();
                return (
                  <button key={r} type="button" title={`${fS.ko} · ${r} ${hex}`} onClick={() => setKeyColor(hex)}
                    className={`h-6 w-10 rounded ${active ? "ring-2 ring-ink ring-offset-1" : "hover:opacity-80"}`}
                    style={{ background: hex }} />
                );
              })}
            </div>
          ))}
        </div>
        <input type="hidden" name="key_color" value={keyColor} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <label className="block text-sm">SKU<input name="sku" defaultValue={i.sku} className={input} /></label>
        <label className="block text-sm">소비자가(원)<input type="number" name="base_price" defaultValue={i.base_price ?? ""} className={input} /></label>
        <label className="block text-sm">제조원가(원) <span className="text-neutral-400">(gross profit)</span><input type="number" name="cost" defaultValue={i.cost ?? ""} className={input} /></label>
      </div>

      <div className="flex gap-6 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" name="is_b2b_only" defaultChecked={i.is_b2b_only} /> 사업자 전용(도매)</label>
      </div>
      <p className="text-xs text-neutral-400">※ 상세·카드뉴스·레이블·썸네일 등 디자인 자산은 <a href="/admin/studio" className="underline">통합 스튜디오</a>에서 이 정보를 불러와 작업합니다.</p>
      <button className="rounded-card bg-ink px-6 py-2.5 text-sm font-semibold text-oat">{isNew ? "등록" : "저장"}</button>
    </form>
  );
}
