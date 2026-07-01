"use client";
import { useState } from "react";
import Script from "next/script";
import { saveAddressAction } from "@/app/account/actions";
import { t, type Locale } from "@/lib/i18n";

// 마이페이지 배송지 추가 폼 — Daum(카카오) 우편번호 검색 내장(키 불필요).
declare global {
  interface Window { daum?: any }
}

export default function AddressBookForm({ defaultName = "", defaultPhone = "", locale = "ko" }: { defaultName?: string; defaultPhone?: string; locale?: Locale }) {
  const tt = t(locale);
  const [open, setOpen] = useState(false);
  const [country, setCountry] = useState("KR");
  const [zipcode, setZipcode] = useState("");
  const [addr1, setAddr1] = useState("");

  function searchKR() {
    if (!window.daum?.Postcode) return;
    new window.daum.Postcode({
      oncomplete: (data: any) => {
        setZipcode(data.zonecode);
        setAddr1(data.roadAddress || data.jibunAddress);
      },
    }).open();
  }

  const input = "mt-1 w-full rounded border px-3 py-2 text-sm";

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="rounded-full border px-4 py-1.5 text-sm hover:bg-neutral-50">
        {tt.addNewAddress}
      </button>
    );
  }

  return (
    <form action={saveAddressAction} className="space-y-3 rounded-lg border p-4">
      <Script src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js" strategy="lazyOnload" />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">{tt.recipient}<input name="recipient" defaultValue={defaultName} required className={input} /></label>
        <label className="block text-sm">{tt.phone}<input name="phone" defaultValue={defaultPhone} required className={input} /></label>
      </div>

      <label className="block text-sm">{locale === "en" ? "Country" : "국가 / Country"}
        <select name="country" value={country} onChange={(e) => setCountry(e.target.value)} className={input}>
          <option value="KR">{locale === "en" ? "South Korea (KR)" : "대한민국 (KR)"}</option>
          <option value="US">United States</option>
          <option value="AU">Australia</option>
          <option value="JP">Japan</option>
          <option value="OTHER">Other</option>
        </select>
      </label>

      <div className="flex items-end gap-2">
        <label className="block flex-1 text-sm">{locale === "en" ? "Postal code" : "우편번호 / Zip"}
          <input name="zipcode" value={zipcode} onChange={(e) => setZipcode(e.target.value)} className={input} />
        </label>
        {country === "KR" && (
          <button type="button" onClick={searchKR} className="mb-0.5 rounded border px-3 py-2 text-sm hover:bg-neutral-50">
            {tt.zipSearch}
          </button>
        )}
      </div>

      <label className="block text-sm">{locale === "en" ? "Address" : "기본 주소 / Address"}
        <input name="addr1" value={addr1} onChange={(e) => setAddr1(e.target.value)} required className={input} />
      </label>
      <label className="block text-sm">{locale === "en" ? "Address detail" : "상세 주소 / Detail"}<input name="addr2" className={input} /></label>
      <label className="block text-sm">{tt.entranceMemo}<input name="entrance_memo" className={input} /></label>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="is_default" /> {tt.setDefaultAddress}
      </label>

      <div className="flex gap-2 pt-1">
        <button className="rounded-full bg-black px-5 py-2 text-sm text-white">{tt.save}</button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-full border px-5 py-2 text-sm">{tt.cancel}</button>
      </div>
    </form>
  );
}
