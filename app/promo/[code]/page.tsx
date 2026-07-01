import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStorefrontContext } from "@/lib/storefront";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function PromoLanding({ params }: { params: { code: string } }) {
  const { locale } = await getStorefrontContext();
  const tt = t(locale);
  const supabase = createClient();
  const { data: promo } = await supabase
    .from("promotion")
    .select("title,kind,discount_type,value,banner_message,code,is_active")
    .eq("code", params.code)
    .maybeSingle();
  if (!promo || !promo.is_active) notFound();
  const disc = promo.discount_type === "percent" ? `${promo.value}%` : (locale === "en" ? `₩${promo.value.toLocaleString()}` : `${promo.value.toLocaleString()}원`);
  return (
    <main className="mx-auto max-w-2xl px-4 py-20 text-center">
      {promo.kind === "influencer" && <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">influencer partner</p>}
      <h1 className="mt-3 text-3xl font-bold">{promo.title}</h1>
      {promo.banner_message && <p className="mt-3 text-neutral-600">{promo.banner_message}</p>}
      <div className="mt-8 inline-block rounded-xl border-2 border-dashed px-8 py-5">
        <p className="text-sm text-neutral-500">{tt.promoCode}</p>
        <p className="text-2xl font-bold tracking-wider">{promo.code}</p>
        <p className="mt-1 text-sm">{locale === "en" ? `${disc} ${tt.discountSuffix}` : `${disc} 할인`}</p>
      </div>
      <div className="mt-8">
        <Link href="/collections/all" className="rounded-full bg-black px-6 py-3 text-sm text-white">{tt.shopWithCode}</Link>
        <p className="mt-2 text-xs text-neutral-400">{tt.promoApplyNote}</p>
      </div>
    </main>
  );
}
