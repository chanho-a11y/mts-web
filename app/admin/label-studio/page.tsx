import { redirect } from "next/navigation";

// 레이블 스튜디오는 '통합 스튜디오'로 통합됨 — 기존 링크는 통합 페이지로 이동.
export default function AdminLabelStudioPage() {
  redirect("/admin/studio");
}
