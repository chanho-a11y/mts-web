import Link from "next/link";
import TrackingRegister from "@/components/tracking-register";

export const dynamic = "force-dynamic";

// D-142 롯데 송장 등록 (관리자 권한은 app/admin/layout.tsx, 액션은 각 액션의 requireAdmin 이 검사)
export default function TrackingPage() {
  return (
    <main>
      <Link href="/admin/orders" className="text-sm text-neutral-500 hover:underline">← 주문 관리</Link>
      <h1 className="mt-1 text-2xl font-bold">송장 등록 (롯데택배)</h1>
      <p className="mt-2 text-sm text-neutral-500">
        롯데택배에서 내려받은 집하 상세 엑셀(PIDDLV013)을 올리면 송장을 주문과 자동으로 연결합니다.
        연결을 확인하고 등록하면 운송장이 저장되고, 주문이 출고 상태가 되며, 고객에게 운송장번호와 배송조회 링크가 담긴 출고 메일이 주문당 한 번 발송됩니다.
      </p>
      <TrackingRegister />
    </main>
  );
}
