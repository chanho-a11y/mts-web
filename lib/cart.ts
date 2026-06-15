export interface CartItem {
  variantId: string;
  slug: string;
  title: string;
  option: string | null;
  price: number;     // KRW (display; server recomputes at checkout)
  image: string | null;
  qty: number;
}

export const TIP_PERCENTS = [5, 10, 15, 20] as const;

export function subtotal(items: CartItem[]): number {
  return items.reduce((s, i) => s + i.price * i.qty, 0);
}
export function tipAmount(items: CartItem[], percent: number): number {
  return Math.round((subtotal(items) * percent) / 100);
}
