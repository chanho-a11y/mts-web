import { createClient } from "@/lib/supabase/server";

// 품목보고번호 마스터(식약처 PRDLST 정본) — DB(report_no) 단일 소스.
// 제품 등록/수정 폼과 레이블 스튜디오가 이 값을 공유한다.
export interface ReportPreset {
  reportNo: string;   // 품목보고번호(공백 제거 포맷)
  name: string;       // 표시용 제품명(참고)
  material: string;   // 원재료명(선택 시 자동 세트)
}

// 매칭 보정용: 공백 제거 정규화(구 데이터가 "2022026 4913101" 처럼 공백 포함 저장된 경우 대비)
export function normReportNo(v: string): string {
  return (v ?? "").replace(/\s+/g, "").trim();
}

export async function getReportPresets(): Promise<ReportPreset[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("report_no")
    .select("report_no,product_name,material,position")
    .order("position", { ascending: true });
  return (data ?? []).map((r: any) => ({
    reportNo: String(r.report_no ?? ""),
    name: String(r.product_name ?? ""),
    material: String(r.material ?? "커피원두(100%)"),
  }));
}
