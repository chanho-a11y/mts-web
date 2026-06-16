"use server";
import { createClient } from "@/lib/supabase/server";
import type { CartItem } from "@/lib/cart";

// 과거 주문 → 현재 가격 기준 장바구니 항목으로 반환 (B2B 재주문)
export async function getReorderItems(orderNo: string): Promise<CartItem[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: order } = await supabase.from("orders").select("id").eq("order_no", orderNo).eq("profile_id", user.id).maybeSingle();
  if (!order) return [];
  const { data: items } = await supabase
    .from("order_item")
    .select("variant_id,qty,product_variant(id,base_price,option_values,product(slug,title_ko,product_image(storage_path,is_primary)))")
    .eq("order_id", order.id);
  return (items ?? []).flatMap((it: any) => {
    const v = it.product_variant;
    if (!v) return [];
    const img = (v.product?.product_image ?? []).find((i: any) => i.is_primary)?.storage_path ?? (v.product?.product_image ?? [])[0]?.storage_path ?? null;
    return [{
      variantId: v.id, slug: v.product?.slug ?? "", title: v.product?.title_ko ?? "",
      option: v.option_values?.option ?? null, price: v.base_price, image: img, qty: it.qty,
    }];
  });
}

export async function requestTaxInvoiceAction(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const orderNo = String(formData.get("order_no") || "");
  await supabase.from("contact_message").insert({
    name: user?.email ?? "회원", email: user?.email ?? "", type: "tax_invoice",
    message: `세금계산서 발행 요청 — 주문번호 ${orderNo}`,
  });
}
