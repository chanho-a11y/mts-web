"use client";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { CartItem } from "@/lib/cart";

interface CartCtx {
  items: CartItem[];
  add: (i: CartItem) => void;
  setQty: (variantId: string, qty: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
  count: number;
}
const Ctx = createContext<CartCtx | null>(null);
const KEY = "mts_cart_v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  // localStorage 복원이 끝나기 전에 서버 미러를 빈 배열로 덮어쓰지 않도록 한 박자 늦춘다.
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try { const raw = localStorage.getItem(KEY); if (raw) setItems(JSON.parse(raw)); } catch {}
    setHydrated(true);
  }, []);
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch {}
  }, [items]);

  // 장바구니 서버 미러(분석 전용).
  // 정본은 여전히 localStorage 이고 체크아웃은 이 미러를 읽지 않는다 → 결제 경로 무영향.
  // 비회원이면 서버가 204 로 조용히 무시하므로 클라이언트는 로그인 여부를 몰라도 된다.
  useEffect(() => {
    if (!hydrated) return;
    const t = setTimeout(() => {
      fetch("/api/cart/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ variantId: i.variantId, qty: i.qty, price: i.price })),
        }),
        keepalive: true,
      }).catch(() => {});
    }, 2000);
    return () => clearTimeout(t);
  }, [items, hydrated]);

  const add = useCallback((i: CartItem) => {
    setItems((prev) => {
      const ex = prev.find((p) => p.variantId === i.variantId);
      if (ex) return prev.map((p) => p.variantId === i.variantId ? { ...p, qty: p.qty + i.qty } : p);
      return [...prev, i];
    });
  }, []);
  const setQty = useCallback((variantId: string, qty: number) => {
    setItems((prev) => prev.map((p) => p.variantId === variantId ? { ...p, qty: Math.max(1, qty) } : p));
  }, []);
  const remove = useCallback((variantId: string) => {
    setItems((prev) => prev.filter((p) => p.variantId !== variantId));
  }, []);
  const clear = useCallback(() => setItems([]), []);
  const count = items.reduce((s, i) => s + i.qty, 0);

  return <Ctx.Provider value={{ items, add, setQty, remove, clear, count }}>{children}</Ctx.Provider>;
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart must be used within CartProvider");
  return c;
}
