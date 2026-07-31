import type { Metadata } from "next";
import { ChapterView, chapterMetadata } from "../_lib";
import "../education.css";

// generateStaticParams 는 두지 않는다 — 루트 레이아웃이 headers() 를 쓰므로
// 어차피 정적 생성되지 않고, 정적 파라미터와 동적 렌더가 섞이면 빌드가 흔들린다.
export const dynamic = "force-dynamic";

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  return chapterMetadata("ko", params.slug);
}

export default function Page({ params }: { params: { slug: string } }) {
  return <ChapterView locale="ko" slug={params.slug} />;
}
