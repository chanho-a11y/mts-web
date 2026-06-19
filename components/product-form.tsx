"use client";
import { upsertProductAction } from "@/app/admin/products/actions";

export interface ProductFormData {
  slug?: string; brand?: string; title_ko?: string; one_liner?: string;
  product_type?: string; status?: string; is_b2b_only?: boolean;
  roast_level?: string; flavor_notes?: string[]; origin_country?: string;
  variety?: string; process?: string; weight_g?: number | null; key_color?: string;
  sku?: string; base_price?: number; category?: string;
  report_no?: string; material?: string;
}

export default function ProductForm({ initial = {} }: { initial?: ProductFormData }) {
  const i = initial;
  const input = "mt-1 w-full rounded border px-3 py-2 text-sm";
  const isNew = !i.slug;
  return (
    <form action={upsertProductAction} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <label className="block text-sm">슬러그(URL) *<input name="slug" defaultValue={i.slug} required readOnly={!isNew} className={input} /></label>
        <label className="block text-sm">브랜드
          <select name="brand" defaultValue={i.brand ?? "mtspace"} className={input}><option value="mtspace">MTSPACE</option><option value="normcore">NORMCORE</option></select>
        </label>
      </div>
      <label className="block text-sm">제품명 *<input name="title_ko" defaultValue={i.title_ko} required className={input} /></label>
      <label className="block text-sm">한 줄 키워드<input name="one_liner" defaultValue={i.one_liner} className={input} /></label>
      <div className="grid grid-cols-2 gap-4">
        <label className="block text-sm">유형
          <select name="product_type" defaultValue={i.product_type ?? "블렌드"} className={input}><option>블렌드</option><option>싱글 오리진</option><option>디카페인</option><option>머천다이즈</option></select>
        </label>
        <label className="block text-sm">카테고리
          <select name="category" defaultValue={i.category ?? "blends"} className={input}>
            <option value="blends">블렌드</option><option value="single-origins">싱글 오리진</option><option value="decaf">디카페인</option>
            <option value="merch">머천다이즈</option><option value="wholesale">사업자 전용</option><option value="normcore">Normcore</option><option value="limited">리미티드</option>
          </select>
        </label>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <label className="block text-sm">로스팅<input name="roast_level" defaultValue={i.roast_level} className={input} /></label>
        <label className="block text-sm">원산지<input name="origin_country" defaultValue={i.origin_country} className={input} /></label>
        <label className="block text-sm">중량(g)<input type="number" name="weight_g" defaultValue={i.weight_g ?? ""} className={input} /></label>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <label className="block text-sm">품종<input name="variety" defaultValue={i.variety} className={input} /></label>
        <label className="block text-sm">가공<input name="process" defaultValue={i.process} className={input} /></label>
      </div>
      <label className="block text-sm">플레이버 노트 (쉼표 구분)<input name="flavor_notes" defaultValue={(i.flavor_notes ?? []).join(", ")} className={input} /></label>
      <div className="grid grid-cols-2 gap-4">
        <label className="block text-sm">품목보고번호(라벨)<input name="report_no" defaultValue={i.report_no} placeholder="2022026 4913101" className={input} /></label>
        <label className="block text-sm">원재료명(라벨)<input name="material" defaultValue={i.material} placeholder="커피원두 100% (에티오피아 100%)" className={input} /></label>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <label className="block text-sm">키 컬러(HEX)<input name="key_color" defaultValue={i.key_color} placeholder="#5D155C" className={input} /></label>
        <label className="block text-sm">SKU<input name="sku" defaultValue={i.sku} className={input} /></label>
        <label className="block text-sm">가격(원)<input type="number" name="base_price" defaultValue={i.base_price ?? ""} className={input} /></label>
      </div>
      <div className="flex gap-6 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" name="is_b2b_only" defaultChecked={i.is_b2b_only} /> 사업자 전용(도매)</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="auto_content" defaultChecked /> 저장 시 콘텐츠 자동 생성</label>
        <input type="hidden" name="status" value="active" />
      </div>
      <button className="rounded-card bg-ink px-6 py-2.5 text-sm font-semibold text-oat">{isNew ? "등록" : "저장"}</button>
    </form>
  );
}
