import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "주문 완료" };

export default function CheckoutComplete({ searchParams }: { searchParams: { order?: string; paid?: string } }) {
  const paid = searchParams.paid === "1";
  const pendingPay = searchParams.paid === "0";
  return (
    <main className="mx-auto max-w-lg px-4 py-24 text-center">
      <h1 className="text-2xl font-bold">{paid ? "결제가 완료되었습니다 ✓" : "주문이 접수되었습니다"}</h1>
      {searchParams.order && <p className="mt-3 font-mono text-sm text-neutral-500">주문번호 {searchParams.order}</p>}
      <p className="mt-4 text-neutral-600">
        {paid
          ? "결제가 정상 승인되었습니다. 가평 로스터리에서 신선하게 준비해 출고해 드립니다. 출고 시 이메일로 안내드립니다."
          : pendingPay
            ? "결제가 완료되지 않았습니다. 마이페이지에서 다시 결제하거나 장바구니에서 재시도해 주세요."
            : "주문이 접수되었습니다. 주문 내역은 마이페이지에서 확인하실 수 있습니다."}
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Link href="/account/orders" className="rounded-full bg-black px-5 py-2.5 text-sm text-white">주문 내역</Link>
        <Link href="/collections/all" className="rounded-full border px-5 py-2.5 text-sm">쇼핑 계속</Link>
      </div>
    </main>
  );
}
