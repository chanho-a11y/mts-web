"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart-provider";
import { subtotal } from "@/lib/cart";
import { formatKRW } from "@/lib/i18n";
import { createOrderAction } from "@/app/checkout/actions";
import type { Provider } from "@/lib/payments";

const METHODS: { p: Provider; label: string }[] = [
  { p: "inicis", label: "신용카드·계좌이체 (이니시스)" },
  { p: "kakaopay", label: "카카오페이" },
  { p: "paypal", label: "PayPal (해외·USD)" },
];

export default function CheckoutForm({ tip, email = "" }: { tip: number; email?: string }) {
  const { items, clear } = useCart();
  const router = useRouter();
  const [provider, setProvider] = useState<Provider>("inicis");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const sub = subtotal(items);

  async function submit(formData: FormData) {
    setBusy(true); setMsg(null);
    const res = await createOrderAction({
      items: items.map((i) => ({ variantId: i.variantId, qty: i.qty })),
      tip,
      provider,
      code: code.trim() || undefined,
      email: String(formData.get("email") || "") || undefined,
      shipping: {
        recipient: String(formData.get("recipient") || ""),
        phone: String(formData.get("phone") || ""),
        country: String(formData.get("country") || "KR"),
        zipcode: String(formData.get("zipcode") || ""),
        addr1: String(formData.get("addr1") || ""),
        addr2: String(formData.get("addr2") || ""),
      },
    });
    setBusy(false);
    setMsg(res.message);
    if (res.ok && !res.pgReady) clear();
  }

  if (items.length === 0 && !msg) return <p className="py-16 text-center text-neutral-500">장바구니가 비어 있습니다.</p>;
  const input = "mt-1 w-full rounded border px-3 py-2 text-sm";

  return (
    <form action={submit} className="grid gap-8 md:grid-cols-3">
      <div className="space-y-4 md:col-span-2">
        <h2 className="font-bold">주문자 정보</h2>
        <label className="block text-sm">이메일(주문 확인)<input type="email" name="email" defaultValue={email} required className={input} /></label>
        <h2 className="pt-2 font-bold">배송지</h2>
        <label className="block text-sm">받는 분<input name="recipient" required className={input} /></label>
        <label className="block text-sm">전화번호<input name="phone" required className={input} /></label>
        <label className="block text-sm">국가
          <select name="country" className={input}><option value="KR">대한민국</option><option value="US">United States</option><option value="OTHER">Other</option></select>
        </label>
        <div className="flex gap-2"><input name="zipcode" placeholder="우편번호" className={input} /></div>
        <input name="addr1" placeholder="기본 주소" required className={input} />
        <input name="addr2" placeholder="상세 주소" className={input} />

        <h2 className="pt-4 font-bold">결제 수단</h2>
        {METHODS.map((m) => (
          <label key={m.p} className="flex items-center gap-2 text-sm">
            <input type="radio" name="pm" checked={provider === m.p} onChange={() => setProvider(m.p)} /> {m.label}
          </label>
        ))}
      </div>

      <aside className="h-fit rounded-xl border p-5 text-sm">
        <label className="block">할인/프로모션 코드
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="코드 입력(선택)"
            className="mt-1 w-full rounded border px-3 py-2 text-sm" />
        </label>
        <div className="mt-3 flex justify-between py-1"><span>소계</span><span>{formatKRW(sub)}</span></div>
        {tip > 0 && <div className="flex justify-between py-1"><span>팁</span><span>{formatKRW(tip)}</span></div>}
        <p className="py-1 text-xs text-neutral-400">코드 할인·배송비는 주문 시 서버에서 최종 계산됩니다.</p>
        <div className="mt-2 flex justify-between border-t pt-2 font-bold"><span>합계</span><span>{formatKRW(sub + tip)}</span></div>
        <button disabled={busy} className="mt-4 w-full rounded-full bg-black py-3 text-white disabled:opacity-50">
          {busy ? "처리 중…" : "주문하기"}
        </button>
        {msg && <p className="mt-3 rounded bg-neutral-100 p-3 text-xs">{msg}</p>}
      </aside>
    </form>
  );
}
