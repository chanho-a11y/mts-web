// 품목보고번호 마스터 — 클라이언트 안전 타입/유틸(서버 전용 import 없음).
// 서버 조회 함수는 lib/report-no-server.ts 에 분리(클라이언트 컴포넌트 오염 방지).
export interface ReportPreset {
  reportNo: string;   // 품목보고번호(공백 제거 포맷)
  name: string;       // 표시용 제품명(참고)
  material: string;   // 원재료명(선택 시 자동 세트)
}

// 매칭 보정용: 공백 제거 정규화(구 데이터가 "2022026 4913101" 처럼 공백 포함 저장된 경우 대비)
export function normReportNo(v: string): string {
  return (v ?? "").replace(/\s+/g, "").trim();
}
