import { getStorefrontContext } from "@/lib/storefront";
import CartView from "@/components/cart-view";

export const dynamic = "force-dynamic";

export default async function CartPage() {
  const { brand } = await getStorefrontContext();
  // 팁은 B2C(놈코어/일반)만. B2B(엠티스페이스 도매)는 팁 없음.
  const showTip = brand.audience === "b2c";
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold">장바구니</h1>
      <CartView showTip={showTip} />
    </main>
  );
}
