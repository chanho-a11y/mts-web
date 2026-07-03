import { createClient } from "@/lib/supabase/server";
import ProductForm from "@/components/product-form";
import { getReportPresets } from "@/lib/report-no-server";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const supabase = createClient();
  const [{ data: cats }, reportPresets] = await Promise.all([
    supabase.from("category").select("slug,name_ko,position").order("position"),
    getReportPresets(),
  ]);
  const categoryOptions = (cats ?? []).map((c: any) => ({ slug: c.slug, name: c.name_ko }));
  return (
    <main>
      <h1 className="mb-6 text-2xl font-bold">제품 등록</h1>
      <p className="mb-4 text-sm text-neutral-500">기본 정보를 입력해 저장합니다. 상세·블로그·카드뉴스·레이블·썸네일 등 디자인 자산은 통합 스튜디오에서 이 정보를 불러와 작업합니다.</p>
      <ProductForm categories={categoryOptions} reportPresets={reportPresets} />
    </main>
  );
}
