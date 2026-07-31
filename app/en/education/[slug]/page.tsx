import type { Metadata } from "next";
import { ChapterView, chapterMetadata } from "@/app/education/_lib";
import "@/app/education/education.css";

export const dynamic = "force-dynamic";

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  return chapterMetadata("en", params.slug);
}

export default function Page({ params }: { params: { slug: string } }) {
  return <ChapterView locale="en" slug={params.slug} />;
}
