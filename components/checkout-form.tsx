"use client";
import { useState, useEffect } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart-provider";
import { subtotal } from "@/lib/cart";
import { formatKRW, t, type Locale } from "@/lib/i18n";
import { createOrderAction } from "@/app/checkout/actions";
import type { Provider } from "@/lib/payments";

declare global {
  interface Window { daum?: any; INIStdPay?: any }
}

// 배송지 국가 — 국내 + EMS 요율 보유국 + 미국 + 기타(직접입력)
const COUNTRIES: { code: string; ko: string; en: string }[] = [
  { code: "KR", ko: "대한민국", en: "South Korea" },
  { code: "US", ko: "미국", en: "United States" },
  { code: "AU", ko: "호주", en: "Australia" },
  { code: "JP", ko: "일본", en: "Japan" },
  { code: "SG", ko: "싱가포르", en: "Singapore" },
  { code: "HK", ko: "홍콩", en: "Hong Kong" },
  { code: "CN", ko: "중국", en: "China" },
  { code: "CA", ko: "캐나다", en: "Canada" },
  { code: "DE", ko: "독일", en: "Germany" },
  { code: "FR", ko: "프랑스", en: "France" },
  { code: "NZ", ko: "뉴질랜드", en: "New Zealand" },
  { code: "MY", ko: "말레이시아", en: "Malaysia" },
  { code: "ID", ko: "인도네시아", en: "Indonesia" },
  { code: "PH", ko: "필리핀", en: "Philippines" },
  { code: "BR", ko: "브라질", en: "Brazil" },
  { code: "RU", ko: "러시아", en: "Russia" },
  { code: "OTHER", ko: "기타 (직접 입력)", en: "Other (enter manually)" },
];

interface Quote { feeKRW: number; label: string; hasRate: boolean; freeThresholdKRW?: number; freeApplies?: boolean }

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src; s.onload = () => resolve(); s.onerror = () => reject(new Error("script load failed"));
    document.body.appendChild(s);
  });
}

// 이니시스 표준결제(INIStdPay): 서명 필드로 hidden 폼 구성 후 SDK 결제창 호출
async function startInicis(fields: Record<string, string>) {
  await loadScript("https://stdpay.inicis.com/stdjs/INIStdPay.js");
  document.getElementById("inicis_pay_form")?.remove();
  const form = document.createElement("form");
  form.id = "inicis_pay_form"; form.method = "post"; form.style.display = "none";
  for (const [k, v] of Object.entries(fields)) {
    const i = document.createElement("input");
    i.type = "hidden"; i.name = k; i.value = String(v);
    form.appendChild(i);
  }
  document.body.appendChild(form);
  window.INIStdPay?.pay("inicis_pay_form");
}

interface CheckoutInitial { recipient: string; phone: string; country: string; zipcode: string; addr1: string; addr2: string }
export default function CheckoutForm({ tip, email = "", locale = "ko", initial }: { tip: number; email?: string; locale?: Locale; initial?: CheckoutInitial }) {
  const { items, clear } = useCart();
  const tt = t(locale);
  const en = locale === "en";
  const METHODS: { p: Provider; label: string }[] = [
    { p: "inicis", label: tt.pmInicis },
    { p: "paypal", label: tt.pmPaypal },
  ];
  const router = useRouter();
  const [provider, setProvider] = useState<Provider>("inicis");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // 로그인 회원의 저장 배송지/프로필로 프리필(비회원이면 빈 값)
  const [country, setCountry] = useState(initial?.country || "KR");
  const [countryName, setCountryName] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [zipcode, setZipcode] = useState(initial?.zipcode || "");
  const [addr1, setAddr1] = useState(initial?.addr1 || "");
  const [quote, setQuote] = useState<Quote | null>(null);
  const sub = subtotal(items);
  const isKR = country === "KR";

  // 배송비 실시간 견적 (국가·장바구니 변동 시)
  const itemsSig = items.map((i) => `${i.variantId}:${i.qty}`).join(",");
  useEffect(() => {
    if (items.length === 0) { setQuote(null); return; }
    let alive = true;
    fetch("/api/shipping/quote", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ country, items: items.map((i) => ({ variantId: i.variantId, qty: i.qty })) }),
    })
      .then((r) => r.json())
      .then((q) => { if (alive) setQuote(q); })
      .catch(() => { if (alive) setQuote(null); });
    return () => { alive = false; };
    // itemsSig가 장바구니 변화를 대표 — items 자체는 의존성에서 제외(렌더마다 refetch 루프 방지)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [country, itemsSig]);

  const shipFee = quote?.feeKRW ?? 0;
  const total = sub + tip + shipFee;

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
        state: String(formData.get("state") || "") || undefined,
        city: String(formData.get("city") || "") || undefined,
        countryName: country === "OTHER" ? (String(formData.get("countryName") || "") || undefined) : undefined,
      },
    });
    setMsg(res.message);
    // 이니시스: SDK 결제창(폼 제출)
    if (res.ok && res.form?.sdk === "inicis") {
      clear();
      try { await startInicis(res.form.fields); }
      catch { setMsg("결제창을 열지 못했습니다. 잠시 후 다시 시도해주세요."); setBusy(false); }
      return;
    }
    setBusy(false);
    if (res.ok && res.pgReady && res.redirectUrl) {
      // PG 결제창/승인 페이지로 이동 (PayPal·테스트모드)
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
        <label className="block text-sm">{tt.recipient}<input name="recipient" defaultValue={initial?.recipient || ""} required className={input} /></label>
        <label className="block text-sm">{tt.phone}<input name="phone" defaultValue={initial?.phone || ""} required className={input} /></label>
        <label className="block text-sm">{tt.country}
          <select name="country" value={country} onChange={(e) => setCountry(e.target.value)} className={input}>
            {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{en ? c.en : c.ko}</option>)}
          </select>
        </label>

        {country === "OTHER" && (
          <label className="block text-sm">{en ? "Country" : "국가명"}
            <input name="countryName" value={countryName} onChange={(e) => setCountryName(e.target.value)} required
              placeholder={en ? "Enter country" : "국가를 직접 입력"} className={input} />
          </label>
        )}

        {isKR ? (
          <>
            <div className="flex items-end gap-2">
              <label className="block flex-1 text-sm">{tt.zipcode}
                <input name="zipcode" value={zipcode} onChange={(e) => setZipcode(e.target.value)} className={input} />
              </label>
              <button type="button" onClick={searchKR} className="mb-0.5 rounded border px-3 py-2 text-sm hover:bg-neutral-50">
                {tt.zipSearch}
              </button>
            </div>
            <input name="addr1" placeholder={tt.addr1Placeholder} value={addr1} onChange={(e) => setAddr1(e.target.value)} required className={input} />
            <input name="addr2" defaultValue={initial?.addr2 || ""} placeholder={tt.addr2Placeholder} className={input} />
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-sm">{en ? "State / Province" : "주 · 도 (State/Province)"}
                <input name="state" value={state} onChange={(e) => setState(e.target.value)} className={input} />
              </label>
              <label className="block text-sm">{en ? "City / Suburb" : "도시 (City/Suburb)"}
                <input name="city" value={city} onChange={(e) => setCity(e.target.value)} className={input} />
              </label>
            </div>
            <label className="block text-sm">{en ? "Postal / ZIP code" : "우편번호 (Postal/ZIP)"}
              <input name="zipcode" value={zipcode} onChange={(e) => setZipcode(e.target.value)} className={input} />
            </label>
            <input name="addr1" placeholder={en ? "Street address" : "주소 (Street address)"} value={addr1} onChange={(e) => setAddr1(e.target.value)} required className={input} />
            <input name="addr2" defaultValue={initial?.addr2 || ""} placeholder={en ? "Apartment, suite, etc. (optional)" : "상세주소 (선택)"} className={input} />
            <p className="text-xs text-neutral-400">{en ? "International orders ship via EMS (coffee beans only)." : "해외 주문은 EMS로 발송됩니다(원두에 한함)."}</p>
          </>
        )}

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

        {/* 배송비 */}
        <div className="flex justify-between py-1">
          <span>{en ? "Shipping" : "배송비"}</span>
          <span>
            {!quote ? "—"
              : !quote.hasRate ? (en ? "Calculated separately" : "별도 안내")
              : quote.freeApplies || shipFee === 0 ? (en ? "Free" : "무료")
              : formatKRW(shipFee)}
          </span>
        </div>
        {/* 무료배송 조건 안내 (국내·설정 시) */}
        {isKR && quote?.freeThresholdKRW ? (
          <p className="text-[11px] text-neutral-400">
            {en
              ? `Free shipping on orders over ${formatKRW(quote.freeThresholdKRW)}`
              : `${formatKRW(quote.freeThresholdKRW)} 이상 구매 시 무료배송`}
          </p>
        ) : (
          <p className="text-[11px] text-neutral-400">{en ? "Shipping by weight tier · discounts applied at order." : "무게 구간별 배송비 · 할인은 주문 시 반영"}</p>
        )}

        <div className="mt-2 flex justify-between border-t pt-2 font-bold"><span>{tt.totalLabel}</span><span>{formatKRW(total)}</span></div>
        {!isKR && <p className="mt-1 text-[11px] text-neutral-400">{en ? "Overseas orders are charged in USD (converted at order)." : "해외 주문은 USD로 결제됩니다(주문 시 환산)."}</p>}

        <button disabled={busy} className="mt-4 w-full rounded-full bg-black py-3 text-white disabled:opacity-50">
          {busy ? tt.processing : tt.placeOrder}
        </button>
        {msg && <p className="mt-3 rounded bg-neutral-100 p-3 text-xs">{msg}</p>}
      </aside>
    </form>
  );
}
