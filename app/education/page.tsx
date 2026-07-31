import type { Metadata } from "next";
import { EducationIndex, indexMetadata } from "./_lib";
import "./education.css";

// 루트 레이아웃이 headers() 를 쓰므로 모든 라우트가 어차피 동적이다.
// metadata 를 상수로 두면 모듈 평가 시점(page data 수집)에 headers() 가 호출돼
// "`headers` was called outside a request scope" 로 빌드가 실패한다 → 함수형으로 둔다.
export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  return indexMetadata("ko");
}

export default function Page() {
  return <EducationIndex locale="ko" />;
}
