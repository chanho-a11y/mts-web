import Link from "next/link";
import BulkProductUpload from "@/components/bulk-product-upload";

export const dynamic = "force-dynamic";

export default function BulkProductsPage() {
  return (
    <main>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">제품 일괄 등록</h1>
        <Link href="/admin/products" className="rounded-full border px-4 py-2 text-sm hover:bg-neutral-100">← 제품 관리</Link>
      </div>
      <p className="mb-6 text-sm text-neutral-500">
        엑셀 양식을 내려받아 작성 후 업로드하면 미리보기·검증을 거쳐 일괄 등록됩니다. 슬러그가 같으면 기존 제품이 갱신(upsert)됩니다.
        <br />※ 양식 컬럼·검증 규칙은 초안이며 추후 확정 예정입니다.
      </p>
      <BulkProductUpload />
    </main>
  );
}
