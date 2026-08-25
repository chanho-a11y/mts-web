import Link from "next/link";
import { getStorefrontContext } from "@/lib/storefront";
import { createClient } from "@/lib/supabase/server";
import { t } from "@/lib/i18n";
import CheckoutCompleteClear from "@/components/checkout-complete-clear";
import PurchaseEvent, { type PurchaseItem } from "@/components/purchase-event";

export const dynamic = "force-dynamic";
export const metadata = { title: "주문 완료" };

// 결제 완료 시 GA4 purchase 이벤트에 실을 주문 요약을 읽는다.
// RLS 클라이언트를 쓰므로 주문번호를 안다고 남의 주문을 볼 수는 없다(본인·관리자만 조회됨).
// 조회에 실패하면 이벤트만 건너뛰고 완료 화면은 그대로 보여준다.
async function loadPurchase(orderNo: string) {
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from("orders")
      .select("order_no,grand_total,currency,order_item(sku,title_snapshot,qty,unit_price)")
      .eq("order_no", orderNo)
      .maybeSingle();
    if (!data) return null;
    const items: PurchaseItem[] = ((data.order_item ?? []) as {
      sku: string | null; title_snapshot: string | null; qty: number | null; unit_price: number | null;
    }[]).map((it) => ({
      item_id: it.sku ?? "",
      item_name: it.title_snapshot ?? it.sku ?? "",
      quantity: it.qty ?? 1,
      price: it.unit_price ?? 0,
    }));
    return {
      transactionId: data.order_no as string,
      value: (data.grand_total as number) ?? 0,
      currency: (data.currency as string) ?? "KRW",
      items,
    };
  } catch {
    return null;
  }
}

export default async function CheckoutComplete({ searchParams }: { searchParams: { order?: string; paid?: string } }) {
  const { locale } = await getStorefrontContext();
  const tt = t(locale);
  const paid = searchParams.paid === "1";
  const pendingPay = searchParams.paid === "0";

  // 결제가 실제로 완료된 경우에만 전환 이벤트를 보낸다.
  const purchase = paid && searchParams.order ? await loadPurchase(searchParams.order) : null;

  return (
    <main className="mx-auto max-w-lg px-4 py-24 text-center">
      {/* 결제 취소(paid=0)로 돌아온 경우에는 장바구니를 유지해 바로 재시도할 수 있게 한다. */}
      {!pendingPay && <CheckoutCompleteClear />}
      {purchase && (
        <PurchaseEvent
          transactionId={purchase.transactionId}
          value={purchase.value}
          currency={purchase.currency}
          items={purchase.items}
        />
      )}
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
