import type { Metadata } from "next";
import { getStorefrontContext } from "@/lib/storefront";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import PromoBanner from "@/components/promo-banner";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const { brand } = await getStorefrontContext();
  return {
    title: { default: `${brand.name} — everyday excellence`, template: `%s · ${brand.name}` },
    description: brand.philosophy.ko,
    openGraph: { siteName: brand.name, title: brand.name, description: brand.philosophy.ko },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { brand, locale } = await getStorefrontContext();
  return (
    <html lang={locale}>
      <body>
        <PromoBanner message={null} />
        <SiteHeader brand={brand} locale={locale} />
        {children}
        <SiteFooter brand={brand} />
      </body>
    </html>
  );
}
