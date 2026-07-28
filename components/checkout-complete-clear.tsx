"use client";
import { useEffect } from "react";
import { useCart } from "@/components/cart-provider";

// 결제 완료(또는 주문 접수) 페이지 도달 시 장바구니를 비운다.
// 이전에는 결제창을 여는 시점에 비웠는데, 결제창을 닫거나 결제에 실패한 고객이
// 장바구니까지 잃고 처음부터 다시 담아야 했다. 그 재담기가 중복 주문의 한 축이었다.
export default function CheckoutCompleteClear() {
  const { clear } = useCart();
  useEffect(() => { clear(); }, [clear]);
  return null;
}
