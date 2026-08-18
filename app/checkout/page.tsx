import { createClient } from "@/lib/supabase/server";
import CheckoutForm from "@/components/checkout-form";
import { getStorefrontContext } from "@/lib/storefront";
import { MAX_ADDRESSES, type AddressRow } from "@/lib/address";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({ searchParams }: { searchParams: { tip?: string } }) {
  const { locale } = await getStorefrontContext();
  const tt = t(locale);
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const tip = Math.max(0, parseInt(searchParams.tip ?? "0", 10) || 0);

  // 로그인 회원 → 저장된 배송지 전체(기본이 맨 앞) + 프로필(이름·전화)로 프리필.
  // 목록을 통째로 넘겨 체크아웃에서 배송지를 고를 수 있게 한다(D-113).
  // limit 은 상한(5)보다 넉넉히 — 상한 도입 이전에 5건을 넘겨 저장한 계정이 있다.
  let savedAddresses: AddressRow[] = [];
  let initial: {
    recipient: string; phone: string; country: string; zipcode: string; addr1: string; addr2: string;
  } | undefined;
  if (user) {
    const [{ data: prof }, { data: addrs }] = await Promise.all([
      supabase.from("profiles").select("name,phone").eq("id", user.id).maybeSingle(),
      supabase.from("addresses")
        .select("id,label,recipient,phone,country,zipcode,addr1,addr2,entrance_memo,is_default")
        .eq("profile_id", user.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    savedAddresses = (addrs ?? []) as AddressRow[];
    const a = savedAddresses[0];
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
      <CheckoutForm
        tip={tip}
        email={user?.email ?? ""}
        locale={locale}
        initial={initial}
        savedAddresses={savedAddresses}
        canSaveAddress={!!user && savedAddresses.length < MAX_ADDRESSES}
        addressBookFull={!!user && savedAddresses.length >= MAX_ADDRESSES}
      />
    </main>
  );
}
