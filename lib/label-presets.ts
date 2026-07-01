// 품목보고번호 마스터 — 선택 시 원재료명이 세트로 따라옵니다.
// (public/tools/label-studio.html PRESETS 에서 이관. 신규 제품 등록 시 여기에 추가)
export interface ReportPreset {
  reportNo: string;
  name: string;       // 표시용 제품명(참고)
  material: string;   // 원재료명 (자동 세트)
}

export const REPORT_PRESETS: ReportPreset[] = [
  { reportNo: "2022026 4913101", name: "댐굳 damn good", material: "커피원두 100% (에티오피아 100%)" },
  { reportNo: "2022026 4913103", name: "스팟라이트 spotlight", material: "커피원두 100% (에티오피아 100%)" },
  { reportNo: "2022026 491312", name: "에티오피아 싱글오리진", material: "커피원두 100% (에티오피아 100%)" },
];

export const REPORT_MATERIAL: Record<string, string> = Object.fromEntries(
  REPORT_PRESETS.map((p) => [p.reportNo, p.material]),
);
