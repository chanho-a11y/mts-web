import type { Metadata } from "next";
import { EducationIndex, indexMetadata } from "./_lib";
import "./education.css";
import { getStorefrontContext } from "@/lib/storefront";

// 루트 레이아웃이 headers() 를 쓰므로 모든 라우트가 어차피 동적이다.
// metadata 를 상수로 두면 모듈 평가 시점(page data 수집)에 headers() 가 호출돼
// "`headers` was called outside a request scope" 로 빌드가 실패한다 → 함수형으로 둔다.
export const dynamic = "force-dynamic";

// 쿠키 locale=en 방문자는 같은 주소에서 영문판을 본다(메타는 /en/education 정본을 가리킴).
export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await getStorefrontContext();
  return indexMetadata(locale === "en" ? "en" : "ko");
}

export default async function Page() {
  const { locale } = await getStorefrontContext();
  return <EducationIndex locale={locale === "en" ? "en" : "ko"} />;
}
