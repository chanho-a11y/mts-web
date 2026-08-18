import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOutAction, updateMarketingOptInAction } from "@/app/account/actions";
import AddressBook from "@/components/address-book";
import type { AddressRow } from "@/lib/address";
import OrderHistory, { type HistoryItem } from "@/components/order-history";
import { getStorefrontContext } from "@/lib/storefront";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function AccountPage({ searchParams }: { searchParams: { saved?: string; error?: string } }) {
  const { locale } = await getStorefrontContext();
  const tt = t(locale);
  const ROLE_LABEL: Record<string, string> = {
    individual: tt.roleLabelIndividual, business: tt.roleLabelBusiness,
    influencer: tt.roleLabelInfluencer, admin: tt.roleLabelAdmin,
  };
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/account/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("name,email,phone,role,language,marketing_opt_in,must_change_password")
    .eq("id", user.id)
    .maybeSingle();

  // 첫 로그인 — 초기 비밀번호(0000) 변경 강제
  if (profile?.must_change_password) redirect("/account/change-password");

  const { data: biz } = await supabase
    .from("business_accounts")
    .select("company_name,biz_reg_no,status")
    .eq("profile_id", user.id)
    .maybeSingle();

  const { data: addresses } = await supabase
    .from("addresses")
    .select("id,label,recipient,phone,country,zipcode,addr1,addr2,entrance_memo,is_default")
    .eq("profile_id", user.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{tt.myPage}</h1>
        <form action={signOutAction}>
          <button className="rounded border px-4 py-1.5 text-sm">{tt.signOut}</button>
        </form>
      </div>

      <section className="mt-6 rounded-xl border p-5 text-sm">
        <h2 className="mb-3 font-bold">{tt.memberInfo}</h2>
        {searchParams?.saved === "marketing" && (
          <p className="mb-3 rounded bg-green-50 px-3 py-2 text-xs text-green-700">{tt.marketingSaved}</p>
        )}
        <dl className="space-y-2">
          <Row k={tt.name} v={profile?.name} />
          <Row k={tt.email} v={profile?.email ?? user.email} />
          <Row k={tt.phone} v={profile?.phone} />
          <Row k={tt.memberRole} v={ROLE_LABEL[profile?.role ?? "individual"]} />
          <Row k={tt.languageUsed} v={profile?.language === "en" ? "English" : "한국어"} />
          <div className="flex gap-4">
            <dt className="w-24 shrink-0 text-neutral-500">{tt.marketingReceive}</dt>
            <dd>
              <form action={updateMarketingOptInAction} className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" name="marketing" defaultChecked={!!profile?.marketing_opt_in} />
                  <span>{profile?.marketing_opt_in ? tt.agreed : tt.notAgreed}</span>
                </label>
                <button className="rounded border px-2 py-0.5 text-xs">{tt.save}</button>
              </form>
              <p className="mt-1 text-xs text-neutral-400">{tt.marketingOptInNote}</p>
            </dd>
          </div>
        </dl>
      </section>

      {biz && (
        <section className="mt-4 rounded-xl border p-5 text-sm">
          <h2 className="mb-3 font-bold">{tt.bizInfo}</h2>
          <dl className="space-y-2">
            <Row k={tt.companyName} v={biz.company_name} />
            <Row k={tt.bizRegNo} v={biz.biz_reg_no} />
            <Row k={tt.approvalStatus} v={biz.status === "approved" ? tt.approved : biz.status === "pending" ? tt.pending : tt.rejected} />
          </dl>
        </section>
      )}

      <section id="addresses" className="mt-4 rounded-xl border p-5 text-sm">
        <h2 className="mb-3 font-bold">{tt.addressBook}</h2>
        {searchParams?.saved === "address" && (
          <p className="mb-3 rounded bg-green-50 px-3 py-2 text-xs text-green-700">{tt.addressSaved}</p>
        )}
        {searchParams?.error && (
          <p className="mb-3 rounded bg-red-50 px-3 py-2 text-xs text-red-700">{searchParams.error}</p>
        )}
        <AddressBook
          addresses={(addresses ?? []) as AddressRow[]}
          defaultName={profile?.name ?? ""}
          defaultPhone={profile?.phone ?? ""}
          locale={locale}
        />
      </section>

      <Orders userId={user.id} locale={locale} />
    </main>
  );
}

async function Orders({ userId, locale }: { userId: string; locale: "ko" | "en" }) {
  const tt = t(locale);
  const supabase = createClient();
  const { data: orders } = await supabase.from("orders")
    .select("order_no,status,grand_total,currency,placed_at,order_item(title_snapshot,sku,qty,unit_price,line_total)")
    .eq("profile_id", userId)
    .order("placed_at", { ascending: false }).limit(20);
  const list = (orders ?? []).map((o) => ({
    order_no: o.order_no, status: o.status, grand_total: o.grand_total, currency: o.currency, placed_at: o.placed_at,
    items: ((o as { order_item?: HistoryItem[] }).order_item ?? []),
  }));
  return (
    <section className="mt-4 rounded-xl border p-5 text-sm">
      <h2 className="mb-1 font-bold">{tt.purchaseHistory}</h2>
      <p className="mb-3 text-xs text-neutral-400">{locale === "en" ? "Click an order to see items · Reorder available." : "주문을 클릭하면 구매 제품이 보이고, 재구매할 수 있습니다."}</p>
      <OrderHistory orders={list} locale={locale} />
    </section>
  );
}

function Row({ k, v }: { k: string; v?: string | null }) {
  return (
    <div className="flex gap-4">
      <dt className="w-24 shrink-0 text-neutral-500">{k}</dt>
      <dd>{v || "-"}</dd>
    </div>
  );
}
