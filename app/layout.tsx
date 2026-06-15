import type { Metadata } from "next";
import { headers } from "next/headers";
import { brandForHost } from "@/lib/brands";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const h = headers();
  const brand = brandForHost(h.get("host"));
  return {
    title: `${brand.name} — everyday excellence`,
    description:
      "매일의 커피는 우리의 삶을 만듭니다. 정교한 기술과 깊이 있는 탐구로, 일상 속 탁월한 순간을 완성합니다.",
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const h = headers();
  const locale = h.get("x-locale") ?? "ko";
  return (
    <html lang={locale}>
      <body>{children}</body>
    </html>
  );
}
