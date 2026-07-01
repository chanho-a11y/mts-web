"use client";
import { useRef, useState } from "react";
import { bulkUpsertProductsAction } from "@/app/admin/products/actions";

// 일괄 등록 컬럼 정의 — 단건 폼 필드와 1:1. (양식 세부는 추후 확정)
const COLUMNS: { key: string; label: string; required?: boolean; hint?: string }[] = [
  { key: "slug", label: "슬러그(URL)", required: true, hint: "영문/하이픈, 고유" },
  { key: "brand", label: "브랜드", hint: "mtspace 또는 normcore (기본 mtspace)" },
  { key: "title_ko", label: "제품명", required: true },
  { key: "one_liner", label: "한줄키워드" },
  { key: "category", label: "카테고리", hint: "blends/single-origins/wholesale/normcore (유형=카테고리 통합)" },
  { key: "status", label: "상태", hint: "published/draft" },
  { key: "roast_level", label: "로스팅" },
  { key: "origin_country", label: "원산지" },
  { key: "weight_g", label: "중량(g)" },
  { key: "variety", label: "품종" },
  { key: "process", label: "가공" },
  { key: "flavor_notes", label: "플레이버노트", hint: "쉼표 구분" },
  { key: "report_no", label: "품목보고번호" },
  { key: "material", label: "원재료명" },
  { key: "key_color", label: "키컬러(HEX)" },
  { key: "sku", label: "SKU" },
  { key: "base_price", label: "가격(원)" },
  { key: "is_b2b_only", label: "사업자전용", hint: "Y/N" },
  { key: "cost", label: "제조원가(원)" },
  { key: "story", label: "커피스토리" },
];

// 한글 라벨 → key 역매핑(양식이 한글 헤더여도 인식)
const LABEL_TO_KEY: Record<string, string> = Object.fromEntries(
  COLUMNS.flatMap((c) => [[c.key.toLowerCase(), c.key], [c.label.toLowerCase(), c.key]]),
);

const SHEETJS_SRC = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/package/dist/xlsx.full.min.js";

function loadSheetJS(): Promise<any> {
  return new Promise((resolve, reject) => {
    const w = window as any;
    if (w.XLSX) return resolve(w.XLSX);
    const s = document.createElement("script");
    s.src = SHEETJS_SRC;
    s.onload = () => resolve((window as any).XLSX);
    s.onerror = () => reject(new Error("엑셀 라이브러리 로드 실패"));
    document.head.appendChild(s);
  });
}

type Row = Record<string, string>;
type Checked = { row: Row; index: number; errors: string[] };

export default function BulkProductUpload() {
  const [rows, setRows] = useState<Checked[]>([]);
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const validRows = rows.filter((r) => r.errors.length === 0);

  async function downloadTemplate() {
    try {
      const XLSX = await loadSheetJS();
      const header = COLUMNS.map((c) => c.label);
      const example = [
        "ethiopia-yirgacheffe", "mtspace", "에티오피아 예가체프", "플로럴·시트러스",
        "싱글 오리진", "single-origins", "미디엄", "에티오피아", "200", "Heirloom",
        "워시드", "자스민, 베르가못, 복숭아", "", "커피원두 100% (에티오피아 100%)",
        "#D2A84E", "MTS-ETH-YIRGA-200", "18000", "N", "N",
      ];
      const guide = COLUMNS.map((c) => (c.required ? "필수 · " : "") + (c.hint ?? ""));
      const ws = XLSX.utils.aoa_to_sheet([header, guide, example]);
      ws["!cols"] = COLUMNS.map(() => ({ wch: 16 }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "products");
      XLSX.writeFile(wb, "MTSPACE_제품일괄등록_양식.xlsx");
    } catch (e: any) {
      setMsg(e?.message ?? "양식 생성 실패");
    }
  }

  function validate(r: Row): string[] {
    const errs: string[] = [];
    if (!String(r.slug || "").trim()) errs.push("슬러그 필수");
    else if (!/^[a-z0-9-]+$/i.test(String(r.slug).trim())) errs.push("슬러그 형식(영문/숫자/하이픈)");
    if (!String(r.title_ko || "").trim()) errs.push("제품명 필수");
    const brand = String(r.brand || "mtspace").trim().toLowerCase();
    if (brand && !["mtspace", "normcore"].includes(brand)) errs.push("브랜드(mtspace/normcore)");
    if (r.base_price && !/^\d+$/.test(String(r.base_price).replace(/[,\s]/g, ""))) errs.push("가격 숫자");
    if (r.weight_g && !/^\d+$/.test(String(r.weight_g).replace(/[,\s]/g, ""))) errs.push("중량 숫자");
    if (r.key_color && !/^#?[0-9a-f]{6}$/i.test(String(r.key_color).trim())) errs.push("키컬러 HEX");
    return errs;
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setMsg("");
    try {
      const XLSX = await loadSheetJS();
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: "" });
      if (raw.length < 2) { setMsg("데이터 행이 없습니다."); setRows([]); return; }

      const headerKeys = (raw[0] as any[]).map((h) => LABEL_TO_KEY[String(h).trim().toLowerCase()] ?? null);
      // 안내(가이드) 행 자동 스킵: 첫 데이터 셀이 '필수·' 등 가이드 텍스트면 건너뜀
      const dataRows = raw.slice(1).filter((arr) => {
        const first = String(arr[0] ?? "").trim();
        return first && !first.startsWith("필수") && !/^(영문|쉼표|mtspace 또는)/.test(first);
      });

      const parsed: Checked[] = dataRows.map((arr, i) => {
        const row: Row = {};
        headerKeys.forEach((k, ci) => { if (k) row[k] = String(arr[ci] ?? "").trim(); });
        return { row, index: i + 1, errors: validate(row) };
      });
      setRows(parsed);
      if (parsed.length === 0) setMsg("인식된 데이터 행이 없습니다. 헤더가 양식과 일치하는지 확인하세요.");
    } catch (err: any) {
      setMsg(err?.message ?? "파일 파싱 실패");
      setRows([]);
    }
  }

  function reset() {
    setRows([]); setFileName(""); setMsg("");
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3 rounded-card border border-line bg-paper p-4">
        <button onClick={downloadTemplate} className="rounded-full border px-4 py-2 text-sm hover:bg-neutral-100">⬇ 엑셀 양식 다운로드</button>
        <label className="cursor-pointer rounded-full bg-black px-4 py-2 text-sm text-white hover:opacity-90">
          ⬆ 엑셀 업로드
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={onFile} className="hidden" />
        </label>
        {fileName && <span className="text-sm text-neutral-500">{fileName}</span>}
        {rows.length > 0 && <button onClick={reset} className="text-sm text-neutral-400 hover:underline">초기화</button>}
      </div>

      {msg && <p className="rounded-card border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">{msg}</p>}

      {rows.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-neutral-600">
              총 <b>{rows.length}</b>행 · 등록 가능 <b className="text-green-700">{validRows.length}</b> · 오류 <b className="text-red-600">{rows.length - validRows.length}</b>
            </p>
          </div>
          <div className="max-h-[480px] overflow-auto rounded-card border border-line">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-sand text-left">
                <tr>
                  <th className="px-2 py-2">#</th>
                  <th className="px-2 py-2">상태</th>
                  <th className="px-2 py-2">슬러그</th>
                  <th className="px-2 py-2">제품명</th>
                  <th className="px-2 py-2">브랜드</th>
                  <th className="px-2 py-2">유형</th>
                  <th className="px-2 py-2">SKU·가격</th>
                  <th className="px-2 py-2">비고</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.index} className={`border-t align-top ${r.errors.length ? "bg-red-50/60" : ""}`}>
                    <td className="px-2 py-1.5 text-neutral-400">{r.index}</td>
                    <td className="px-2 py-1.5">{r.errors.length ? <span className="text-red-600">오류</span> : <span className="text-green-700">정상</span>}</td>
                    <td className="px-2 py-1.5 font-mono">{r.row.slug}</td>
                    <td className="px-2 py-1.5">{r.row.title_ko}</td>
                    <td className="px-2 py-1.5">{r.row.brand || "mtspace"}</td>
                    <td className="px-2 py-1.5">{r.row.product_type}</td>
                    <td className="px-2 py-1.5">{[r.row.sku, r.row.base_price && `₩${r.row.base_price}`].filter(Boolean).join(" · ")}</td>
                    <td className="px-2 py-1.5 text-red-600">{r.errors.join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <form action={bulkUpsertProductsAction} onSubmit={() => setBusy(true)} className="flex items-center gap-3">
            <input type="hidden" name="rows" value={JSON.stringify(validRows.map((r) => r.row))} />
            <button
              disabled={validRows.length === 0 || busy}
              className="rounded-card bg-ink px-6 py-2.5 text-sm font-semibold text-bg disabled:opacity-40"
            >
              {busy ? "등록 중…" : `정상 ${validRows.length}건 일괄 등록`}
            </button>
            {rows.length - validRows.length > 0 && (
              <span className="text-xs text-neutral-500">오류 행은 제외하고 등록됩니다.</span>
            )}
          </form>
        </>
      )}
    </div>
  );
}
