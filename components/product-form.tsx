"use client";
import { useState } from "react";
import { upsertProductAction } from "@/app/admin/products/actions";
import { type ReportPreset, normReportNo } from "@/lib/report-no";
import { reportNoForCountry, standardRecipeFor, recipeFamily, estimateCost, suggestKeyColors } from "@/lib/product-standards";
import { EXPANDED_PALETTE } from "@/lib/point-color";
import { RECIPE_ROWS, RECIPE_MODE_LABEL, type RecipeMode, type RecipeData } from "@/lib/recipe";
import { EVIDENCE_FIELDS, type EvidenceData } from "@/lib/evidence";

export interface ProductFormData {
  slug?: string; brand?: string; title_ko?: string; title_en?: string; one_liner?: string; one_liner_en?: string;
  status?: string; is_b2b_only?: boolean;
  roast_level?: string; roast_level_en?: string; flavor_notes?: string[]; flavor_notes_en?: string[];
  origin_country?: string; origin_country_en?: string; origin_region?: string; origin_region_en?: string;
  variety?: string; variety_en?: string; process?: string; process_en?: string;
  weight_g?: number | null; key_color?: string;
  sku?: string; base_price?: number; category?: string;
  report_no?: string; material?: string; story?: string; story_en?: string; cost?: number | null;
  recipe?: RecipeData | null;
  evidence?: EvidenceData | null;
}

export interface CategoryOption { slug: string; name: string }

// 영어 제품명 → 슬러그 변환 (소문자·영숫자·하이픈만)
function slugify(s: string): string {
  return s.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// 한/영 두 칸을 한 줄에 (라벨 + KO + EN)
function BilingualField({ label, nameKo, nameEn, ko, en, textarea, placeholder, onEnInput, onKoInput }: {
  label: string; nameKo: string; nameEn: string; ko?: string; en?: string; textarea?: boolean; placeholder?: string;
  onEnInput?: (v: string) => void; onKoInput?: (v: string) => void;
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
          <><input name={nameKo} defaultValue={ko} onChange={onKoInput ? (e) => onKoInput(e.target.value) : undefined} placeholder="한글" className={input} />
          <input name={nameEn} defaultValue={en} onChange={onEnInput ? (e) => onEnInput(e.target.value) : undefined} placeholder="English" className={input} /></>
        )}
      </div>
    </div>
  );
}

export default function ProductForm({
  initial = {}, categories, reportPresets = [], takenColors = [],
}: { initial?: ProductFormData; categories: CategoryOption[]; reportPresets?: ReportPreset[]; takenColors?: string[] }) {
  const i = initial;
  const input = "mt-1 w-full rounded border px-3 py-2 text-sm";
  const isNew = !i.slug;
  const [slug, setSlug] = useState<string>(i.slug ?? "");

  // 품목보고번호(D-172): 원산지 국가로 자동 선택. 국가 매칭이 없을 때(블렌드 등)만 목록에서 고른다.
  const reportMaterial: Record<string, string> = Object.fromEntries(reportPresets.map((p) => [p.reportNo, p.material]));
  const [country, setCountry] = useState<string>(i.origin_country ?? "");
  const autoReport = reportNoForCountry(country, reportPresets);
  const initialAuto = reportNoForCountry(i.origin_country, reportPresets);
  const presetHit = reportPresets.find((p) => normReportNo(p.reportNo) === normReportNo(i.report_no ?? ""));
  // 기존 값이 자동 매칭과 다르면 수동 지정으로 존중한다(기존 제품 보호).
  const [reportManual, setReportManual] = useState<boolean>(
    !!i.report_no && !(initialAuto && normReportNo(initialAuto.reportNo) === normReportNo(i.report_no ?? "")),
  );
  const [reportSel, setReportSel] = useState<string>(presetHit ? presetHit.reportNo : (i.report_no ? "__custom__" : ""));
  const [manualReportNo, setManualReportNo] = useState<string>(i.report_no ?? "");
  const useAuto = !reportManual && !!autoReport;
  const reportNo = useAuto ? autoReport!.reportNo : manualReportNo;
  const [material, setMaterial] = useState<string>(i.material ?? "");
  const effectiveMaterial = useAuto && !material ? autoReport!.material : material;
  const [keyColor, setKeyColor] = useState<string>(i.key_color ?? "");

  function onReportChange(v: string) {
    setReportSel(v);
    if (v === "__custom__") { setManualReportNo(""); return; }
    if (v === "") { setManualReportNo(""); return; }
    setManualReportNo(v);
    if (reportMaterial[v]) setMaterial(reportMaterial[v]);
  }

  // 키 컬러 초안(D-172): 1차 플레이버 노트, 2차 다른 제품 색과 겹침 회피. 최종 선택은 대표.
  const [notesKo, setNotesKo] = useState<string>((i.flavor_notes ?? []).join(", "));
  const [roastKo, setRoastKo] = useState<string>(i.roast_level ?? "");
  const colorSuggestions = suggestKeyColors(
    notesKo.split(",").map((x) => x.trim()).filter(Boolean), roastKo,
    takenColors.filter((c) => c.toLowerCase() !== (i.key_color ?? "").toLowerCase()), 3,
  );

  // 기준 레시피(D-172): 워시드 = 코체레 다니초, 내추럴(허니, 무산소 포함) = 타데세 욘카.
  const [processKo, setProcessKo] = useState<string>(i.process ?? "");
  const [recipeSeed, setRecipeSeed] = useState<RecipeData>(i.recipe ?? {});
  const [recipeVer, setRecipeVer] = useState(0);
  const fam = recipeFamily(processKo);
  function fillStandardRecipe() {
    const r = standardRecipeFor(processKo);
    if (!r) return;
    setRecipeSeed(r); setRecipeVer((v) => v + 1);
  }

  // 제조원가(D-172): 생두 kg 단가 → (단가 x 1.2) / 1000 x 중량 + 1,000원
  const [cost, setCost] = useState<string>(i.cost != null ? String(i.cost) : "");
  const [greenPrice, setGreenPrice] = useState<string>("");
  const [weightStr, setWeightStr] = useState<string>(i.weight_g != null ? String(i.weight_g) : "");
  function onGreenPrice(v: string) {
    setGreenPrice(v);
    const c = estimateCost(parseInt(v.replace(/[^0-9]/g, ""), 10), parseInt(weightStr, 10) || 125);
    if (c) setCost(String(c));
  }

  const statusInit = i.status === "draft" ? "draft" : "published";
  const rc = recipeSeed ?? {};
  const rv = (mode: RecipeMode, key: string) => ((rc as Record<string, Record<string, string> | undefined>)[mode]?.[key]) ?? "";

  return (
    <form action={upsertProductAction} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <label className="block text-sm">슬러그(URL) *
          <input name="slug" value={slug} onChange={(e) => setSlug(e.target.value)} required className={input} placeholder="ethiopia-yirgacheffe" />
          {isNew
            ? <span className="mt-1 block text-[11px] text-neutral-400">영어 제품명 입력 시 자동 생성됩니다. 직접 수정도 가능합니다.</span>
            : <span className="mt-1 block text-[11px] text-amber-600">슬러그를 바꾸면 공개 URL·SKU가 변경되고, 예전 URL은 새 URL로 자동 리다이렉트됩니다.</span>}
        </label>
        <label className="block text-sm">브랜드
          <select name="brand" defaultValue={i.brand ?? "mtspace"} className={input}><option value="mtspace">MTSPACE</option><option value="normcore">NORMCORE</option></select>
        </label>
      </div>
      <input type="hidden" name="orig_slug" value={i.slug ?? ""} />

      <p className="text-xs text-neutral-400">※ 노출 텍스트는 한/영 모두 입력합니다(왼쪽 한글 · 오른쪽 English). 디자인 시 각 언어를 다르게 사용합니다.</p>

      <BilingualField label="제품명 *" nameKo="title_ko" nameEn="title_en" ko={i.title_ko} en={i.title_en} placeholder="제품명"
        onEnInput={isNew ? (v) => setSlug(slugify(v)) : undefined} />
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

      <BilingualField label="로스팅" nameKo="roast_level" nameEn="roast_level_en" ko={i.roast_level} en={i.roast_level_en} placeholder="라이트/미디움/다크" onKoInput={setRoastKo} />
      <BilingualField label="원산지" nameKo="origin_country" nameEn="origin_country_en" ko={i.origin_country} en={i.origin_country_en} placeholder="원산지 국가 (품목보고번호 자동 선택 기준)" onKoInput={setCountry} />
      <BilingualField label="지역 (REGION)" nameKo="origin_region" nameEn="origin_region_en" ko={i.origin_region} en={i.origin_region_en} placeholder="예: 예가체프 코체레 / Yirgacheffe Kochere" />
      <div className="grid grid-cols-2 gap-4">
        <label className="block text-sm">중량(g)<input type="number" name="weight_g" value={weightStr} onChange={(e) => setWeightStr(e.target.value)} className={input} /></label>
      </div>
      <BilingualField label="품종" nameKo="variety" nameEn="variety_en" ko={i.variety} en={i.variety_en} placeholder="품종" />
      <BilingualField label="가공" nameKo="process" nameEn="process_en" ko={i.process} en={i.process_en} placeholder="가공방식" onKoInput={setProcessKo} />
      <BilingualField label="플레이버 노트 (쉼표 구분)" nameKo="flavor_notes" nameEn="flavor_notes_en" ko={(i.flavor_notes ?? []).join(", ")} en={(i.flavor_notes_en ?? []).join(", ")} placeholder="예: 다크초콜릿, 캐러멜" onKoInput={setNotesKo} />
      <BilingualField label="커피 스토리 (상세·카드뉴스 스토리요약 소스)" nameKo="story" nameEn="story_en" ko={i.story} en={i.story_en} textarea placeholder="이 커피의 이야기" />

      {/* 추출 레시피 — 필터 / 에스프레소 / 밀크 */}
      <fieldset className="rounded-card border border-line p-4">
        <legend className="px-1 text-sm font-semibold">추출 레시피 <span className="font-normal text-neutral-400">(상세 커피정보 · 스튜디오 소스)</span></legend>
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
          <button type="button" onClick={fillStandardRecipe} disabled={!fam}
            className="rounded-full border px-3 py-1.5 hover:bg-neutral-100 disabled:opacity-40">가공 방식 기준 레시피 채우기</button>
          <span className="text-neutral-500">
            {fam === "washed" && "워시드 계열 기준: 코체레 다니초"}
            {fam === "natural" && "내추럴 계열 기준: 타데세 욘카 (허니, 무산소 포함)"}
            {!fam && "가공 방식을 입력하면 기준 레시피를 고를 수 있습니다"}
          </span>
          <span className="text-neutral-400">비워 두고 저장하면 가공 방식 기준 레시피가 자동으로 들어갑니다.</span>
        </div>
        <div className="space-y-4">
          {(Object.keys(RECIPE_ROWS) as RecipeMode[]).map((mode) => (
            <div key={mode}>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">{RECIPE_MODE_LABEL[mode].ko} · {RECIPE_MODE_LABEL[mode].en}</div>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                {RECIPE_ROWS[mode].map((r) => (
                  <div key={r.key}>
                    <label className="block text-xs text-neutral-500">{r.ko}{r.unit ? ` (${r.unit})` : ""}
                      <input key={`${recipeVer}-${mode}-${r.key}`} name={`rcp_${mode}_${r.key}`} defaultValue={rv(mode, r.key)}
                        type={r.numeric ? "number" : "text"} inputMode={r.numeric ? "numeric" : undefined} min={r.numeric ? 0 : undefined}
                        placeholder={r.numeric ? `숫자만 (${r.unit ?? ""})` : undefined}
                        className="mt-0.5 w-full rounded border px-2 py-1.5 text-sm" />
                    </label>
                    {r.bilingual && (
                      <input key={`${recipeVer}-${mode}-${r.key}-en`} name={`rcp_${mode}_${r.key}_en`} defaultValue={rv(mode, `${r.key}_en`)} placeholder={`${r.en} (EN)`} className="mt-1 w-full rounded border px-2 py-1.5 text-xs" />
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
          품목보고번호(라벨) <span className="text-neutral-400">(원산지 국가로 자동)</span>
          {useAuto ? (
            <div className="mt-1 rounded border bg-neutral-50 px-3 py-2 text-sm">
              <span className="font-mono">{autoReport!.reportNo}</span> <span className="text-neutral-500">· {autoReport!.name}</span>
              <button type="button" onClick={() => { setReportManual(true); setManualReportNo(autoReport!.reportNo); setReportSel(autoReport!.reportNo); }}
                className="ml-2 text-[11px] text-neutral-400 underline">다른 번호 지정</button>
            </div>
          ) : (
            <>
              <select value={reportSel} onChange={(e) => onReportChange(e.target.value)} className={input}>
                <option value="">— 선택 —</option>
                {reportPresets.map((p) => <option key={p.reportNo} value={p.reportNo}>{p.reportNo} · {p.name}</option>)}
                <option value="__custom__">직접 입력…</option>
              </select>
              {reportSel === "__custom__" && (
                <input value={manualReportNo} onChange={(e) => setManualReportNo(e.target.value)} placeholder="20220264913101" className={`${input} mt-2`} />
              )}
              {autoReport && (
                <button type="button" onClick={() => setReportManual(false)} className="mt-1 text-[11px] text-neutral-500 underline">
                  원산지 자동 선택으로 돌아가기 ({autoReport.reportNo})</button>
              )}
              {!autoReport && <p className="mt-1 text-[11px] text-neutral-400">원산지 국가와 맞는 번호가 없어 직접 고릅니다(블렌드 등).</p>}
            </>
          )}
          <p className="mt-1 text-[11px] text-neutral-400">국가별 번호는 <b>품목보고번호 관리</b>의 원산지 칸으로 연결됩니다.</p>
          <input type="hidden" name="report_no" value={reportNo} />
        </div>
        <label className="block text-sm">원재료명(라벨) <span className="text-neutral-400">(보고번호 선택 시 자동)</span>
          <input name="material" value={effectiveMaterial} onChange={(e) => setMaterial(e.target.value)} placeholder="커피원두 100% (에티오피아 100%)" className={input} /></label>
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

        {/* 초안 추천(D-172) — 플레이버 노트 1차, 다른 제품 색과 겹침 회피 2차. 최종 선택은 직접 */}
        {colorSuggestions.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
            <span className="text-neutral-500">플레이버 노트 기준 초안</span>
            {colorSuggestions.map((c) => (
              <button key={c.hex} type="button" onClick={() => setKeyColor(c.hex)}
                title={`${c.note} → ${c.swatch} ${c.tone} · 가장 가까운 기존 색과 거리 ${c.nearest}`}
                className={`flex items-center gap-1 rounded-full border px-2 py-1 ${keyColor.toLowerCase() === c.hex.toLowerCase() ? "border-ink" : "hover:bg-neutral-100"}`}>
                <span className="inline-block h-4 w-4 rounded-full border" style={{ background: c.hex }} />
                <span className="font-mono">{c.hex}</span>
                <span className="text-neutral-400">{c.note}{c.nearest < 15 ? " · 겹침 주의" : ""}</span>
              </button>
            ))}
          </div>
        )}
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
        <label className="block text-sm">SKU <span className="text-neutral-400">(= 슬러그 자동)</span>
          <input value={slug} readOnly placeholder="슬러그와 동일하게 자동 생성" className={`${input} bg-neutral-50 text-neutral-500`} /></label>
        <label className="block text-sm">소비자가(원)<input type="number" name="base_price" defaultValue={i.base_price ?? ""} className={input} /></label>
        <div className="text-sm">
          <label className="block">제조원가(원) <span className="text-neutral-400">(gross profit)</span>
            <input type="number" name="cost" value={cost} onChange={(e) => setCost(e.target.value)} className={input} /></label>
          <label className="mt-2 block text-xs text-neutral-500">생두가(원/kg)로 계산
            <input type="number" value={greenPrice} onChange={(e) => onGreenPrice(e.target.value)} placeholder="예: 28000" className="mt-0.5 w-full rounded border px-2 py-1.5 text-sm" /></label>
          <p className="mt-1 text-[11px] text-neutral-400">(생두가 x 1.2) / 1000 x 중량 + 1,000원. 중량이 비면 125g 기준.</p>
        </div>
      </div>

      <div className="flex gap-6 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" name="is_b2b_only" defaultChecked={i.is_b2b_only} /> 사업자 전용(도매)</label>
      </div>
      <p className="text-xs text-neutral-400">※ 상세·카드뉴스·레이블·썸네일 등 디자인 자산은 <a href="/admin/studio" className="underline">통합 스튜디오</a>에서 이 정보를 불러와 작업합니다.</p>
      <button className="rounded-card bg-ink px-6 py-2.5 text-sm font-semibold text-oat">{isNew ? "등록" : "저장"}</button>
    </form>
  );
}
