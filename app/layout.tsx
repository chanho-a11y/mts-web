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
  return {
    title: { default: `${brand.name} — everyday excellence`, template: `%s · ${brand.name}` },
    description: brand.philosophy.ko,
    openGraph: { siteName: brand.name, title: brand.name, description: brand.philosophy.ko },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { brand, locale } = await getStorefrontContext();

  let promo: string | null = null;
  let signedIn = false;
  let role: string | null = null;
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
  } catch {}

  return (
    <html lang={locale}>
      <body>
        <CartProvider>
          <PromoBanner message={promo} />
          <SiteHeader brand={brand} locale={locale} signedIn={signedIn} role={role} />
          {children}
          <SiteFooter brand={brand} />
        </CartProvider>
      </body>
    </html>
  );
}
