import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOutAction, deleteAddressAction, setDefaultAddressAction } from "@/app/account/actions";
import AddressBookForm from "@/components/address-book-form";
import { getStorefrontContext } from "@/lib/storefront";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
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
    .select("id,recipient,phone,country,zipcode,addr1,addr2,entrance_memo,is_default")
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
        <dl className="space-y-2">
          <Row k={tt.name} v={profile?.name} />
          <Row k={tt.email} v={profile?.email ?? user.email} />
          <Row k={tt.phone} v={profile?.phone} />
          <Row k={tt.memberRole} v={ROLE_LABEL[profile?.role ?? "individual"]} />
          <Row k={tt.languageUsed} v={profile?.language === "en" ? "English" : "한국어"} />
          <Row k={tt.marketingReceive} v={profile?.marketing_opt_in ? tt.agreed : tt.notAgreed} />
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

      <section className="mt-4 rounded-xl border p-5 text-sm">
        <h2 className="mb-3 font-bold">{tt.addressBook}</h2>
        {addresses && addresses.length ? (
          <ul className="mb-4 space-y-3">
            {addresses.map((a) => (
              <li key={a.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium">
                    {a.recipient} {a.is_default && <span className="ml-1 rounded bg-ink px-1.5 py-0.5 text-[10px] text-oat">{tt.default}</span>}
                  </p>
                  <div className="flex gap-2 text-xs">
                    {!a.is_default && (
                      <form action={setDefaultAddressAction}>
                        <input type="hidden" name="id" value={a.id} />
                        <button className="text-neutral-500 hover:underline">{tt.setAsDefault}</button>
                      </form>
                    )}
                    <form action={deleteAddressAction}>
                      <input type="hidden" name="id" value={a.id} />
                      <button className="text-red-500 hover:underline">{tt.remove}</button>
                    </form>
                  </div>
                </div>
                <p className="mt-1 text-neutral-600">
                  ({a.zipcode}) {a.addr1} {a.addr2}
                </p>
                <p className="text-neutral-400">{a.phone}{a.entrance_memo ? ` · ${a.entrance_memo}` : ""}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-4 text-neutral-500">{tt.noAddresses}</p>
        )}
        <AddressBookForm defaultName={profile?.name ?? ""} defaultPhone={profile?.phone ?? ""} locale={locale} />
      </section>

      <Orders userId={user.id} locale={locale} />
    </main>
  );
}

async function Orders({ userId, locale }: { userId: string; locale: "ko" | "en" }) {
  const tt = t(locale);
  const supabase = createClient();
  const { data: orders } = await supabase.from("orders")
    .select("order_no,status,grand_total,currency,placed_at").eq("profile_id", userId)
    .order("placed_at", { ascending: false }).limit(20);
  return (
    <section className="mt-4 rounded-xl border p-5 text-sm">
      <h2 className="mb-3 font-bold">{tt.purchaseHistory}</h2>
      {orders && orders.length ? (
        <ul className="divide-y">
          {orders.map((o) => (
            <li key={o.order_no} className="flex justify-between py-2">
              <span className="font-mono text-xs">{o.order_no}</span>
              <span>{o.status}</span>
              <span>{o.currency === "USD" ? `$${o.grand_total}` : "₩" + o.grand_total.toLocaleString()}</span>
            </li>
          ))}
        </ul>
      ) : <p className="text-neutral-400">{tt.noOrders}</p>}
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
