"use client";
import { useState } from "react";
import Script from "next/script";

// 한국 주소 검색 (Daum 우편번호) + 국가 선택. 비한국 주소는 수기 입력.
declare global {
  interface Window { daum?: any }
}

export default function AddressField() {
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

  return (
    <div className="space-y-2">
      <Script src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js" strategy="lazyOnload" />
      <label className="block text-sm">국가 / Country
        <select name="country" value={country} onChange={(e) => setCountry(e.target.value)}
          className="mt-1 w-full rounded border px-3 py-2">
          <option value="KR">대한민국 (KR)</option>
          <option value="US">United States</option>
          <option value="AU">Australia</option>
          <option value="JP">Japan</option>
          <option value="OTHER">Other</option>
        </select>
      </label>

      <div className="flex gap-2">
        <input name="zipcode" placeholder="우편번호 / Zip" value={zipcode}
          onChange={(e) => setZipcode(e.target.value)} className="w-40 rounded border px-3 py-2 text-sm" />
        {country === "KR" && (
          <button type="button" onClick={searchKR} className="rounded border px-3 py-2 text-sm">주소 검색</button>
        )}
      </div>
      <input name="addr1" placeholder="기본 주소 / Address" value={addr1}
        onChange={(e) => setAddr1(e.target.value)} className="w-full rounded border px-3 py-2 text-sm" />
      <input name="addr2" placeholder="상세 주소 / Detail" className="w-full rounded border px-3 py-2 text-sm" />
    </div>
  );
}
