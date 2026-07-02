"use client";
import Link from "next/link";
import { useCart } from "@/components/cart-provider";

// 헤더 장바구니 링크 + 담긴 수량 배지. 0개면 배지 숨김.
export default function CartLink({ label }: { label: string }) {
  const { count } = useCart();
  return (
    <Link href="/cart" className="relative inline-flex items-center hover:opacity-70" aria-label={`${label}${count > 0 ? ` (${count})` : ""}`}>
      <span>{label}</span>
      {count > 0 && (
        <span className="ml-1 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-clay px-1 text-[10px] font-bold leading-none text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
