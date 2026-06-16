"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart-provider";
import { getReorderItems } from "@/app/account/reorder-action";

export default function ReorderButton({ orderNo }: { orderNo: string }) {
  const { add } = useCart();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function reorder() {
    setBusy(true);
    const items = await getReorderItems(orderNo);
    items.forEach((i) => add(i));
    setBusy(false);
    router.push("/cart");
  }
  return (
    <button onClick={reorder} disabled={busy} className="rounded-full border px-4 py-1.5 text-sm disabled:opacity-50">
      {busy ? "담는 중…" : "재주문 (장바구니에 담기)"}
    </button>
  );
}
