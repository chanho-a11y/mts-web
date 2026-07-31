import type { Metadata } from "next";
import { EducationIndex, indexMetadata } from "@/app/education/_lib";
import "@/app/education/education.css";

export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  return indexMetadata("en");
}

export default function Page() {
  return <EducationIndex locale="en" />;
}
