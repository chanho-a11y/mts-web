import type { Metadata } from "next";
import { ChapterView, chapterMetadata } from "../_lib";
import "../education.css";
import { getStorefrontContext } from "@/lib/storefront";

// generateStaticParams 는 두지 않는다 — 루트 레이아웃이 headers() 를 쓰므로
// 어차피 정적 생성되지 않고, 정적 파라미터와 동적 렌더가 섞이면 빌드가 흔들린다.
export const dynamic = "force-dynamic";

// 쿠키 locale=en 방문자는 같은 주소에서 영문판을 본다.
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const { locale } = await getStorefrontContext();
  return chapterMetadata(locale === "en" ? "en" : "ko", params.slug);
}

export default async function Page({ params }: { params: { slug: string } }) {
  const { locale } = await getStorefrontContext();
  return <ChapterView locale={locale === "en" ? "en" : "ko"} slug={params.slug} />;
}
