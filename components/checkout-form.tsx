"use client";
import { useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart-provider";
import { subtotal } from "@/lib/cart";
import { formatKRW, t, type Locale } from "@/lib/i18n";
import { createOrderAction } from "@/app/checkout/actions";
import type { Provider } from "@/lib/payments";

declare global {
  interface Window { daum?: any }
}

export default function CheckoutForm({ tip, email = "", locale = "ko" }: { tip: number; email?: string; locale?: Locale }) {
  const { items, clear } = useCart();
  const tt = t(locale);
  const METHODS: { p: Provider; label: string }[] = [
    { p: "inicis", label: tt.pmInicis },
    { p: "kakaopay", label: tt.pmKakao },
    { p: "paypal", label: tt.pmPaypal },
  ];
  const router = useRouter();
  const [provider, setProvider] = useState<Provider>("inicis");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [country, setCountry] = useState("KR");
  const [zipcode, setZipcode] = useState("");
  const [addr1, setAddr1] = useState("");
  const sub = subtotal(items);

  function searchKR() {
    if (!window.daum?.Postcode) return;
    new window.daum.Postcode({
      oncomplete: (data: any) => {
        setZipcode(data.zonecode);
        setAddr1(data.roadAddress || data.jibunAddress);
      },
    }).open();
  }

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
    if (res.ok && res.pgReady && res.redirectUrl) {
      // PG 결제창/승인 페이지로 이동 (PayPal 등)
      clear();
      window.location.href = res.redirectUrl;
      return;
    }
    if (res.ok && !res.pgReady) {
      clear();
      router.push(`/checkout/complete?order=${res.orderNo ?? ""}`);
    }
  }

  if (items.length === 0 && !msg) return <p className="py-16 text-center text-neutral-500">{tt.cartEmpty}</p>;
  const input = "mt-1 w-full rounded border px-3 py-2 text-sm";

  return (
    <form action={submit} className="grid gap-8 md:grid-cols-3">
      <div className="space-y-4 md:col-span-2">
        <h2 className="font-bold">{tt.ordererInfo}</h2>
        <label className="block text-sm">{tt.emailOrderConfirm}<input type="email" name="email" defaultValue={email} required className={input} /></label>
        <h2 className="pt-2 font-bold">{tt.shippingAddress}</h2>
        <Script src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js" strategy="lazyOnload" />
        <label className="block text-sm">{tt.recipient}<input name="recipient" required className={input} /></label>
        <label className="block text-sm">{tt.phone}<input name="phone" required className={input} /></label>
        <label className="block text-sm">{tt.country}
          <select name="country" value={country} onChange={(e) => setCountry(e.target.value)} className={input}>
            <option value="KR">{tt.countryKR}</option><option value="US">United States</option><option value="OTHER">Other</option>
          </select>
        </label>
        <div className="flex items-end gap-2">
          <label className="block flex-1 text-sm">{tt.zipcode}
            <input name="zipcode" value={zipcode} onChange={(e) => setZipcode(e.target.value)} className={input} />
          </label>
          {country === "KR" && (
            <button type="button" onClick={searchKR} className="mb-0.5 rounded border px-3 py-2 text-sm hover:bg-neutral-50">
              {tt.zipSearch}
            </button>
          )}
        </div>
        <input name="addr1" placeholder={tt.addr1Placeholder} value={addr1} onChange={(e) => setAddr1(e.target.value)} required className={input} />
        <input name="addr2" placeholder={tt.addr2Placeholder} className={input} />

        <h2 className="pt-4 font-bold">{tt.paymentMethod}</h2>
        {METHODS.map((m) => (
          <label key={m.p} className="flex items-center gap-2 text-sm">
            <input type="radio" name="pm" checked={provider === m.p} onChange={() => setProvider(m.p)} /> {m.label}
          </label>
        ))}
      </div>

      <aside className="h-fit rounded-xl border p-5 text-sm">
        <label className="block">{tt.promoCodeLabel}
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder={tt.promoCodePlaceholder}
            className="mt-1 w-full rounded border px-3 py-2 text-sm" />
        </label>
        <div className="mt-3 flex justify-between py-1"><span>{tt.subtotalLabel}</span><span>{formatKRW(sub)}</span></div>
        {tip > 0 && <div className="flex justify-between py-1"><span>{tt.tipWord}</span><span>{formatKRW(tip)}</span></div>}
        <p className="py-1 text-xs text-neutral-400">{tt.checkoutServerNote}</p>
        <div className="mt-2 flex justify-between border-t pt-2 font-bold"><span>{tt.totalLabel}</span><span>{formatKRW(sub + tip)}</span></div>
        <button disabled={busy} className="mt-4 w-full rounded-full bg-black py-3 text-white disabled:opacity-50">
          {busy ? tt.processing : tt.placeOrder}
        </button>
        {msg && <p className="mt-3 rounded bg-neutral-100 p-3 text-xs">{msg}</p>}
      </aside>
    </form>
  );
}
