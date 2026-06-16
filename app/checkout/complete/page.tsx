import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "주문 완료" };

export default function CheckoutComplete({ searchParams }: { searchParams: { order?: string } }) {
  return (
    <main className="mx-auto max-w-lg px-4 py-24 text-center">
      <h1 className="text-2xl font-bold">주문이 접수되었습니다</h1>
      {searchParams.order && <p className="mt-3 font-mono text-sm text-neutral-500">주문번호 {searchParams.order}</p>}
      <p className="mt-4 text-neutral-600">
        결제 연동(이니시스·카카오페이·페이팔) 완료 후 실제 결제가 진행됩니다. 주문 내역은 마이페이지에서 확인하실 수 있습니다.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Link href="/account" className="rounded-full bg-black px-5 py-2.5 text-sm text-white">마이페이지</Link>
        <Link href="/collections/all" className="rounded-full border px-5 py-2.5 text-sm">쇼핑 계속</Link>
      </div>
    </main>
  );
}
