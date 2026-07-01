import Link from "next/link";
import { getStorefrontContext } from "@/lib/storefront";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";
export const metadata = { title: "주문 완료" };

export default async function CheckoutComplete({ searchParams }: { searchParams: { order?: string; paid?: string } }) {
  const { locale } = await getStorefrontContext();
  const tt = t(locale);
  const paid = searchParams.paid === "1";
  const pendingPay = searchParams.paid === "0";
  return (
    <main className="mx-auto max-w-lg px-4 py-24 text-center">
      <h1 className="text-2xl font-bold">{paid ? tt.paidTitle : tt.orderReceivedTitle}</h1>
      {searchParams.order && <p className="mt-3 font-mono text-sm text-neutral-500">{tt.orderNoLabel} {searchParams.order}</p>}
      <p className="mt-4 text-neutral-600">
        {paid
          ? tt.paidBody
          : pendingPay
            ? tt.pendingPayBody
            : tt.receivedBody}
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Link href="/account/orders" className="rounded-full bg-black px-5 py-2.5 text-sm text-white">{tt.orderHistory}</Link>
        <Link href="/collections/all" className="rounded-full border px-5 py-2.5 text-sm">{tt.continueShopping}</Link>
      </div>
    </main>
  );
}
