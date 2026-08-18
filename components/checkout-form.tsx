"use client";
import { useState, useEffect, useRef } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart-provider";
import { formatKRW, t, type Locale } from "@/lib/i18n";
import { MAX_ADDRESSES, formatAddressLine, type AddressRow } from "@/lib/address";
import { createOrderAction } from "@/app/checkout/actions";
import { resolveCartPricesAction } from "@/app/checkout/price-actions";
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

// 모바일 기기 판별 — 이니시스 PC 모듈(INIStdPay.js)은 모바일에서 차단되므로 모바일 모듈로 분기.
function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/Android|iPhone|iPod|iPad|IEMobile|Opera Mini|Mobile/i.test(ua)) return true;
  // iPadOS 는 데스크톱 UA(Macintosh)로 보고됨 → 터치 지원으로 보정
  return /Macintosh/.test(ua) && typeof document !== "undefined" && navigator.maxTouchPoints > 1;
}

// 이니시스 모바일 표준결제: 결제요청 URL 로 폼 직접 POST(전체 페이지 이동). 전문 인코딩은 EUC-KR.
function startInicisMobile(action: string, fields: Record<string, string>) {
  document.getElementById("inicis_m_form")?.remove();
  const form = document.createElement("form");
  form.id = "inicis_m_form"; form.method = "post"; form.action = action;
  form.acceptCharset = "EUC-KR"; form.style.display = "none";
  for (const [k, v] of Object.entries(fields)) {
    const i = document.createElement("input");
    i.type = "hidden"; i.name = k; i.value = String(v);
    form.appendChild(i);
  }
  document.body.appendChild(form);
  form.submit();
}

// 이니시스 PC 표준결제(INIStdPay): 서명 필드로 hidden 폼 구성 후 SDK 결제창 호출
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
export default function CheckoutForm({
  tip, email = "", locale = "ko", initial,
  savedAddresses = [], canSaveAddress = false, addressBookFull = false,
}: {
  tip: number; email?: string; locale?: Locale; initial?: CheckoutInitial;
  savedAddresses?: AddressRow[]; canSaveAddress?: boolean; addressBookFull?: boolean;
}) {
  // 장바구니 비우기는 결제 완료 페이지(CheckoutCompleteClear)에서 처리한다.
  const { items } = useCart();
  const tt = t(locale);
  const en = locale === "en";
  const ALL_METHODS: { p: Provider; label: string }[] = [
    { p: "inicis", label: tt.pmInicis },
    { p: "paypal", label: tt.pmPaypal },
  ];
  const router = useRouter();
  const [provider, setProvider] = useState<Provider>("inicis");
  // 모바일 여부는 마운트 후 판정(SSR 하이드레이션 불일치 방지)
  const [isMobile, setIsMobile] = useState(false);
  const [payMethod, setPayMethod] = useState<"CARD" | "BANK">("CARD");
  useEffect(() => { setIsMobile(isMobileDevice()); }, []);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  // 중복 주문 방지 — 제출 잠금은 ref 로 둔다.
  // `<form action={...}>` 안의 setState 는 React Action(transition) 이라 반영이 지연되고,
  // 그 사이 재클릭이 그대로 통과해 같은 장바구니가 주문 2~3건으로 쪼개졌다(실측 최소 간격 0.347초).
  // ref 는 대입 즉시 반영되므로 렌더 타이밍과 무관하게 재진입을 막는다.
  const inFlight = useRef(false);
  const [busy, setBusy] = useState(false);
  // 결제창 호출 이후 상태 — 여기서는 새 주문을 만들지 않고, 같은 주문번호로 결제창만 다시 연다.
  const [pgOpened, setPgOpened] = useState(false);
  const [pgOrderNo, setPgOrderNo] = useState<string | null>(null);
  const lastForm = useRef<{ sdk: "inicis" | "inicis-mobile"; action?: string; fields: Record<string, string> } | null>(null);
  // 로그인 회원의 저장 배송지/프로필로 프리필(비회원이면 빈 값)
  const [country, setCountry] = useState(initial?.country || "KR");
  const [countryName, setCountryName] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [zipcode, setZipcode] = useState(initial?.zipcode || "");
  const [addr1, setAddr1] = useState(initial?.addr1 || "");
  // 배송지 선택기(D-113) — 저장된 배송지를 고르면 아래 필드를 통째로 채운다.
  // 그래서 recipient·phone·addr2 도 controlled 로 둔다(defaultValue 로는 갱신이 안 된다).
  const [recipient, setRecipient] = useState(initial?.recipient || "");
  const [phone, setPhone] = useState(initial?.phone || "");
  const [addr2, setAddr2] = useState(initial?.addr2 || "");
  const [addrChoice, setAddrChoice] = useState<string>(savedAddresses[0]?.id ?? "new");
  const [saveAddress, setSaveAddress] = useState(false);

  function pickAddress(id: string) {
    setAddrChoice(id);
    if (id === "new") {
      setRecipient(""); setPhone(""); setCountry("KR");
      setZipcode(""); setAddr1(""); setAddr2("");
      return;
    }
    const a = savedAddresses.find((x) => x.id === id);
    if (!a) return;
    setRecipient(a.recipient || ""); setPhone(a.phone || ""); setCountry(a.country || "KR");
    setZipcode(a.zipcode || ""); setAddr1(a.addr1 || ""); setAddr2(a.addr2 || "");
    setSaveAddress(false); // 이미 주소록에 있는 주소다
  }
  const [quote, setQuote] = useState<Quote | null>(null);
  // 로그인 고객의 개별가/등급가 실적용가 맵 (없으면 담을 때 저장된 정가로 폴백)
  const [priceMap, setPriceMap] = useState<Record<string, number>>({});
  const sub = items.reduce((s, i) => s + (priceMap[i.variantId] ?? i.price) * i.qty, 0);
  const isKR = country === "KR";

  // 로그인 고객 개별가/등급가 실적용가 조회 (장바구니 구성 변동 시)
  const variantSig = items.map((i) => i.variantId).join(",");
  useEffect(() => {
    if (items.length === 0) { setPriceMap({}); return; }
    let alive = true;
    resolveCartPricesAction(items.map((i) => ({ variantId: i.variantId })))
      .then((m) => { if (alive) setPriceMap(m); })
      .catch(() => { /* 실패 시 정가 표시 — 주문 시 서버가 재계산 */ });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variantSig]);

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

  // 해외 배송지는 PayPal(외화)만 — 이니시스는 KRW 전용(D-085). 국가 변경 시 결제수단 자동 보정.
  const METHODS = isKR ? ALL_METHODS : ALL_METHODS.filter((m) => m.p === "paypal");
  useEffect(() => {
    if (!isKR && provider !== "paypal") setProvider("paypal");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isKR]);

  function searchKR() {
    if (!window.daum?.Postcode) return;
    new window.daum.Postcode({
      oncomplete: (data: any) => {
        setZipcode(data.zonecode);
        setAddr1(data.roadAddress || data.jibunAddress);
      },
    }).open();
  }

  // 결제창 열기 — 최초 호출과 '다시 열기'가 같은 경로를 쓴다(둘 다 새 주문을 만들지 않음).
  async function openPg(form: NonNullable<typeof lastForm.current>): Promise<boolean> {
    try {
      if (form.sdk === "inicis-mobile") startInicisMobile(form.action || "", form.fields);
      else await startInicis(form.fields);
      return true;
    } catch {
      setMsg("결제창을 열지 못했습니다. 팝업 차단을 해제한 뒤 아래 [결제창 다시 열기]를 눌러주세요.");
      return false;
    }
  }

  async function submit(formData: FormData) {
    // 재진입 차단 — 여기가 중복 주문의 1차 방어선.
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true); setMsg(null);
    let res;
    try {
      res = await createOrderAction({
        items: items.map((i) => ({ variantId: i.variantId, qty: i.qty })),
        tip,
        provider,
        mobile: isMobile,
        payMethod: isMobile ? payMethod : undefined,
        code: code.trim() || undefined,
        email: String(formData.get("email") || "") || undefined,
        saveAddress: saveAddress && canSaveAddress && isKR && addrChoice === "new",
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
    } catch {
      // 네트워크·서버 오류: 주문이 만들어지지 않았으므로 잠금을 풀어 재시도를 허용한다.
      inFlight.current = false; setBusy(false);
      setMsg("주문 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
      return;
    }
    setMsg(res.message);
    // 이니시스: 모바일=결제요청 URL 로 폼 POST / PC=INIStdPay SDK 결제창
    // ※ 장바구니는 여기서 비우지 않는다. 결제 완료 페이지에서 비운다 —
    //   결제창을 닫은 고객이 장바구니까지 잃고 처음부터 담아야 했던 문제를 없앤다.
    if (res.ok && res.form) {
      lastForm.current = res.form;
      setPgOrderNo(res.orderNo ?? null);
      setPgOpened(true);
      await openPg(res.form);
      // 잠금 유지 — 결제창이 닫혀도 [결제창 다시 열기]로 같은 주문을 재사용한다.
      return;
    }
    if (res.ok && res.pgReady && res.redirectUrl) {
      // PG 결제창/승인 페이지로 이동 (PayPal·테스트모드) — 페이지를 떠나므로 잠금 유지
      window.location.href = res.redirectUrl;
      return;
    }
    if (res.ok && !res.pgReady) {
      router.push(`/checkout/complete?order=${res.orderNo ?? ""}`);
      return;
    }
    // 주문 생성 실패(품절·권한·유효성 등) — 잠금 해제하고 수정 후 재시도하게 한다.
    inFlight.current = false; setBusy(false);
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

        {/* 저장된 배송지 선택 — 여러 배송지를 쓰는 고객이 매번 재입력하지 않게 한다(D-113) */}
        {savedAddresses.length > 0 && (
          <label className="block text-sm">{tt.savedAddresses}
            <select value={addrChoice} onChange={(e) => pickAddress(e.target.value)} className={input}>
              {savedAddresses.map((a) => (
                <option key={a.id} value={a.id}>
                  {[a.label, a.recipient].filter(Boolean).join(" · ")} — {formatAddressLine(a)}
                  {a.is_default ? ` (${tt.default})` : ""}
                </option>
              ))}
              <option value="new">{tt.enterNewAddress}</option>
            </select>
          </label>
        )}

        <label className="block text-sm">{tt.recipient}
          <input name="recipient" value={recipient} onChange={(e) => setRecipient(e.target.value)} required className={input} />
        </label>
        <label className="block text-sm">{tt.phone}
          <input name="phone" value={phone} onChange={(e) => setPhone(e.target.value)} required className={input} />
        </label>
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
            <input name="addr2" value={addr2} onChange={(e) => setAddr2(e.target.value)} placeholder={tt.addr2Placeholder} className={input} />
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
            <input name="addr2" value={addr2} onChange={(e) => setAddr2(e.target.value)} placeholder={en ? "Apartment, suite, etc. (optional)" : "상세주소 (선택)"} className={input} />
            <p className="text-xs text-neutral-400">{en ? "International orders ship via EMS (coffee beans only)." : "해외 주문은 EMS로 발송됩니다(원두에 한함)."}</p>
          </>
        )}

        {/* 새로 입력한 주소만 주소록 저장 대상 — 이미 저장된 주소를 고른 경우는 중복이라 숨긴다 */}
        {addrChoice === "new" && canSaveAddress && isKR && (
          <label className="flex items-center gap-2 pt-1 text-sm">
            <input type="checkbox" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} />
            {tt.saveToAddressBook}
          </label>
        )}
        {addrChoice === "new" && addressBookFull && isKR && (
          <p className="pt-1 text-xs text-neutral-400">
            {tt.saveToAddressBookFull.replace("{max}", String(MAX_ADDRESSES))}
          </p>
        )}

        <h2 className="pt-4 font-bold">{tt.paymentMethod}</h2>
        {!isKR && (
          <p className="text-xs text-neutral-500">
            {en ? "International orders are paid in USD via PayPal only." : "해외 배송 주문은 PayPal(USD) 결제만 가능합니다."}
          </p>
        )}
        {METHODS.map((m) => (
          <label key={m.p} className="flex items-center gap-2 text-sm">
            <input type="radio" name="pm" checked={provider === m.p} onChange={() => setProvider(m.p)} /> {m.label}
          </label>
        ))}
        {/* 모바일 이니시스는 결제수단을 사전 지정해야 함(모바일 표준결제 규격) */}
        {isMobile && provider === "inicis" && (
          <div className="ml-6 flex gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="radio" name="inicis_m" checked={payMethod === "CARD"} onChange={() => setPayMethod("CARD")} />
              {en ? "Credit card" : "신용카드"}
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="inicis_m" checked={payMethod === "BANK"} onChange={() => setPayMethod("BANK")} />
              {en ? "Bank transfer" : "계좌이체"}
            </label>
          </div>
        )}
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

        {!pgOpened && (
          <button type="submit" disabled={busy} className="mt-4 w-full rounded-full bg-black py-3 text-white disabled:opacity-50">
            {busy ? tt.processing : tt.placeOrder}
          </button>
        )}
        {/* 결제창 호출 이후 — 새 주문을 만들지 않고 같은 주문번호로만 다시 연다.
            (결제창을 닫았을 때 버튼이 영영 비활성으로 남던 데드락 해소) */}
        {pgOpened && (
          <div className="mt-4 space-y-2">
            <button
              type="button"
              onClick={() => { if (lastForm.current) void openPg(lastForm.current); }}
              className="w-full rounded-full bg-black py-3 text-white"
            >
              {en ? "Reopen payment window" : "결제창 다시 열기"}
            </button>
            <p className="text-[11px] leading-relaxed text-neutral-500">
              {en
                ? `Your order${pgOrderNo ? ` (${pgOrderNo})` : ""} is saved. Reopening does not create a new order. If it still fails, reload this page and order again.`
                : `주문${pgOrderNo ? `(${pgOrderNo})` : ""}은 저장되어 있습니다. 다시 열어도 새 주문이 만들어지지 않습니다. 계속 열리지 않으면 페이지를 새로고침한 뒤 다시 주문해 주세요.`}
            </p>
          </div>
        )}
        {msg && <p className="mt-3 rounded bg-neutral-100 p-3 text-xs">{msg}</p>}
      </aside>
    </form>
  );
}
