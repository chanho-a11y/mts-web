import type { Metadata } from "next";
import { getStorefrontContext } from "@/lib/storefront";
import { createClient } from "@/lib/supabase/server";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import PromoBanner from "@/components/promo-banner";
import { CartProvider } from "@/components/cart-provider";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const { brand } = await getStorefrontContext();
  let favicon = "";
  try {
    const supabase = createClient();
    const { data: b } = await supabase.from("brand").select("id").eq("code", brand.code).maybeSingle();
    if (b) {
      const { data } = await supabase.from("site_setting").select("value").eq("brand_id", b.id).eq("key", "favicon_path").maybeSingle();
      favicon = data?.value ?? "";
    }
  } catch {}
  return {
    title: { default: `${brand.name} — everyday excellence`, template: `%s · ${brand.name}` },
    description: brand.philosophy.ko,
    openGraph: { siteName: brand.name, title: brand.name, description: brand.philosophy.ko },
    ...(favicon ? { icons: { icon: favicon } } : {}),
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { brand, locale } = await getStorefrontContext();

  let promo: string | null = null;
  let signedIn = false;
  let role: string | null = null;
  let cms: Record<string, string> = {};
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      signedIn = true;
      const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      role = prof?.role ?? "individual";
    }
    const { data } = await supabase
      .from("promotion")
      .select("banner_message,placements,is_active")
      .eq("is_active", true)
      .contains("placements", ["banner"])
      .not("banner_message", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    promo = data?.banner_message ?? null;

    const { data: b } = await supabase.from("brand").select("id").eq("code", brand.code).maybeSingle();
    if (b) {
      const { data: settings } = await supabase.from("site_setting").select("key,value").eq("brand_id", b.id);
      cms = Object.fromEntries((settings ?? []).map((r) => [r.key, r.value ?? ""]));
    }
  } catch {}

  // CMS 폰트/배경 → CSS 변수
  const cssVars: Record<string, string> = {};
  if (cms.font_family) cssVars["--font-family"] = cms.font_family;
  if (cms.letter_spacing) cssVars["--letter-spacing"] = `${cms.letter_spacing}px`;
  if (cms.line_height) cssVars["--line-height"] = String(Number(cms.line_height) / 100 || cms.line_height);
  if (cms.page_bg) cssVars["--page-bg"] = cms.page_bg;
  const bodyStyle: React.CSSProperties = {
    ...(cssVars as React.CSSProperties),
    fontFamily: cms.font_family || undefined,
    letterSpacing: cms.letter_spacing ? `${cms.letter_spacing}px` : undefined,
    lineHeight: cms.line_height ? Number(cms.line_height) / 100 : undefined,
    background: cms.page_bg || undefined,
  };

  return (
    <html lang={locale}>
      <body style={bodyStyle}>
        <CartProvider>
          <PromoBanner message={promo} />
          <SiteHeader brand={brand} locale={locale} signedIn={signedIn} role={role} bg={cms.header_bg || undefined} logo={cms.logo_path || undefined} />
          {children}
          <SiteFooter brand={brand} bg={cms.footer_bg || undefined} phone={cms.store_phone || undefined} email={cms.store_email || undefined} />
        </CartProvider>
      </body>
    </html>
  );
}
