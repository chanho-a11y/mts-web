import { getStorefrontContext } from "@/lib/storefront";
import CartView from "@/components/cart-view";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";
// 장바구니는 검색엔진 색인 제외(개인화 페이지)
export const metadata = { title: "장바구니 · Cart", robots: { index: false, follow: true } };

export default async function CartPage() {
  const { brand, locale } = await getStorefrontContext();
  const tt = t(locale);
  // 팁은 B2C(놈코어/일반)만. B2B(엠티스페이스 도매)는 팁 없음.
  const showTip = brand.audience === "b2c";
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold">{tt.cart}</h1>
      <CartView showTip={showTip} locale={locale} />
    </main>
  );
}
