import { createClient } from "@/lib/supabase/server";
import { type ReportPreset } from "@/lib/report-no";

// 품목보고번호 마스터(DB: report_no) 서버 조회. 서버 컴포넌트/라우트 전용.
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
