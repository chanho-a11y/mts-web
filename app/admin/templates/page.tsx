import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// '양식 관리' 메뉴는 제거되었습니다(2026-07). 자산 강조색·폰트 설정은 '사이트 관리자'로 통합.
export default function RemovedTemplatesPage() {
  redirect("/admin/content");
}
