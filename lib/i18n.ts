import { headers } from "next/headers";

export type Locale = "ko" | "en";

export function getLocale(): Locale {
  const l = headers().get("x-locale");
  return l === "en" ? "en" : "ko";
}

const DICT = {
  ko: {
    shop: "쇼핑", about: "브랜드 소개", coffeeInfo: "커피 정보", blog: "블로그",
    contact: "문의", login: "로그인", signup: "회원가입", cart: "장바구니",
    bestsellers: "베스트", newArrivals: "신상품", categories: "카테고리",
    viewAll: "전체 보기", addToCart: "장바구니 담기", soldOut: "품절",
    origin: "원산지", variety: "품종", process: "가공 방식", flavor: "플레이버 노트",
    roast: "로스팅 레벨", weight: "중량", recipe: "추천 추출 & 레시피",
    moreInfo: "more information", philosophy: "철학", wholesaleOnly: "사업자 전용",
    coffee: "커피", from: "부터",
  },
  en: {
    shop: "Shop", about: "About", coffeeInfo: "Coffee Info", blog: "Blog",
    contact: "Contact", login: "Login", signup: "Sign up", cart: "Cart",
    bestsellers: "Best", newArrivals: "New", categories: "Categories",
    viewAll: "View all", addToCart: "Add to cart", soldOut: "Sold out",
    origin: "Origin", variety: "Variety", process: "Process", flavor: "Flavour notes",
    roast: "Roast level", weight: "Weight", recipe: "Recommended brewing & recipe",
    moreInfo: "more information", philosophy: "Philosophy", wholesaleOnly: "Wholesale only",
    coffee: "Coffee", from: "from",
  },
} as const;

export function t(locale: Locale) {
  return DICT[locale];
}

export function formatKRW(n: number): string {
  return "₩" + n.toLocaleString("ko-KR");
}
