import { createClient } from "@/lib/supabase/server";
import CheckoutForm from "@/components/checkout-form";
import { getStorefrontContext } from "@/lib/storefront";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({ searchParams }: { searchParams: { tip?: string } }) {
  const { locale } = await getStorefrontContext();
  const tt = t(locale);
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const tip = Math.max(0, parseInt(searchParams.tip ?? "0", 10) || 0);

  // 로그인 회원 → 저장된 기본 배송지(없으면 최근) + 프로필(이름·전화)로 프리필
  let initial: {
    recipient: string; phone: string; country: string; zipcode: string; addr1: string; addr2: string;
  } | undefined;
  if (user) {
    const [{ data: prof }, { data: addrs }] = await Promise.all([
      supabase.from("profiles").select("name,phone").eq("id", user.id).maybeSingle(),
      supabase.from("addresses")
        .select("recipient,phone,country,zipcode,addr1,addr2,is_default,created_at")
        .eq("profile_id", user.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1),
    ]);
    const a = addrs?.[0];
    initial = {
      recipient: a?.recipient || prof?.name || "",
      phone: a?.phone || prof?.phone || "",
      country: a?.country || "KR",
      zipcode: a?.zipcode || "",
      addr1: a?.addr1 || "",
      addr2: a?.addr2 || "",
    };
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold">{tt.checkoutTitle}</h1>
      <CheckoutForm tip={tip} email={user?.email ?? ""} locale={locale} initial={initial} />
    </main>
  );
}
