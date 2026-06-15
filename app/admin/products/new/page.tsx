import ProductForm from "@/components/product-form";

export const dynamic = "force-dynamic";

export default function NewProductPage() {
  return (
    <main>
      <h1 className="mb-6 text-2xl font-bold">제품 등록</h1>
      <p className="mb-4 text-sm text-neutral-500">등록 시 상세·블로그 콘텐츠 초안이 자동 생성됩니다(체크 시).</p>
      <ProductForm />
    </main>
  );
}
