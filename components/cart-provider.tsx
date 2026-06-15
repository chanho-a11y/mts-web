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
  useEffect(() => {
    try { const raw = localStorage.getItem(KEY); if (raw) setItems(JSON.parse(raw)); } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch {}
  }, [items]);

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
