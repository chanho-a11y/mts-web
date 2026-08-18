"use client";
import { useState } from "react";
import Script from "next/script";
import {
  saveAddressAction, updateAddressAction, deleteAddressAction, setDefaultAddressAction,
} from "@/app/account/actions";
import { MAX_ADDRESSES, formatAddressLine, type AddressRow } from "@/lib/address";
import { t, type Locale } from "@/lib/i18n";

// 마이페이지 배송지 주소록 — 목록 + 추가/수정 인라인 폼.
// Daum(카카오) 우편번호 검색 내장(키 불필요).
declare global {
  interface Window { daum?: any }
}

const COUNTRIES: { code: string; ko: string; en: string }[] = [
  { code: "KR", ko: "대한민국 (KR)", en: "South Korea (KR)" },
  { code: "US", ko: "미국", en: "United States" },
  { code: "AU", ko: "호주", en: "Australia" },
  { code: "JP", ko: "일본", en: "Japan" },
  { code: "OTHER", ko: "기타", en: "Other" },
];

export default function AddressBook({
  addresses, defaultName = "", defaultPhone = "", locale = "ko",
}: {
  addresses: AddressRow[]; defaultName?: string; defaultPhone?: string; locale?: Locale;
}) {
  const tt = t(locale);
  // null=목록만 / "new"=추가 폼 / <id>=해당 주소 수정 폼
  const [mode, setMode] = useState<string | null>(null);
  const atLimit = addresses.length >= MAX_ADDRESSES;

  return (
    <div>
      <Script src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js" strategy="lazyOnload" />

      {addresses.length ? (
        <ul className="mb-4 space-y-3">
          {addresses.map((a) =>
            mode === a.id ? (
              <li key={a.id}>
                <AddressForm
                  locale={locale}
                  address={a}
                  onCancel={() => setMode(null)}
                  title={tt.editAddressTitle}
                />
              </li>
            ) : (
              <li key={a.id} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium">
                    {a.label && (
                      <span className="mr-1.5 rounded border px-1.5 py-0.5 text-[10px] font-normal text-neutral-500">
                        {a.label}
                      </span>
                    )}
                    {a.recipient}
                    {a.is_default && (
                      <span className="ml-1 rounded bg-ink px-1.5 py-0.5 text-[10px] text-oat">{tt.default}</span>
                    )}
                  </p>
                  <div className="flex shrink-0 gap-2 text-xs">
                    {!a.is_default && (
                      <form action={setDefaultAddressAction}>
                        <input type="hidden" name="id" value={a.id} />
                        <button className="text-neutral-500 hover:underline">{tt.setAsDefault}</button>
                      </form>
                    )}
                    <button onClick={() => setMode(a.id)} className="text-neutral-500 hover:underline">
                      {tt.editAddress}
                    </button>
                    <form action={deleteAddressAction}>
                      <input type="hidden" name="id" value={a.id} />
                      <button className="text-red-500 hover:underline">{tt.remove}</button>
                    </form>
                  </div>
                </div>
                <p className="mt-1 text-neutral-600">{formatAddressLine(a)}</p>
                <p className="text-neutral-400">
                  {a.phone}
                  {a.entrance_memo ? ` · ${a.entrance_memo}` : ""}
                </p>
              </li>
            ),
          )}
        </ul>
      ) : (
        <p className="mb-4 text-neutral-500">{tt.noAddresses}</p>
      )}

      {mode === "new" ? (
        <AddressForm
          locale={locale}
          defaultName={defaultName}
          defaultPhone={defaultPhone}
          onCancel={() => setMode(null)}
          title={tt.addAddressTitle}
        />
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setMode("new")}
            disabled={atLimit}
            className="rounded-full border px-4 py-1.5 text-sm hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {tt.addNewAddress}
          </button>
          <span className="text-xs text-neutral-400">
            {addresses.length}/{MAX_ADDRESSES} · {tt.addressLimitNote.replace("{max}", String(MAX_ADDRESSES))}
          </span>
        </div>
      )}
    </div>
  );
}

function AddressForm({
  locale, address, defaultName = "", defaultPhone = "", onCancel, title,
}: {
  locale: Locale; address?: AddressRow; defaultName?: string; defaultPhone?: string;
  onCancel: () => void; title: string;
}) {
  const tt = t(locale);
  const en = locale === "en";
  const editing = !!address;
  const [country, setCountry] = useState(address?.country || "KR");
  const [zipcode, setZipcode] = useState(address?.zipcode || "");
  const [addr1, setAddr1] = useState(address?.addr1 || "");

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

  return (
    <form action={editing ? updateAddressAction : saveAddressAction} className="space-y-3 rounded-lg border p-4">
      {editing && <input type="hidden" name="id" value={address!.id} />}
      <p className="text-sm font-bold">{title}</p>

      <label className="block text-sm">
        {tt.addressAlias}
        <input name="label" defaultValue={address?.label ?? ""} maxLength={20}
          placeholder={tt.addressAliasPlaceholder} className={input} />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">{tt.recipient}
          <input name="recipient" defaultValue={address?.recipient ?? defaultName} required className={input} />
        </label>
        <label className="block text-sm">{tt.phone}
          <input name="phone" defaultValue={address?.phone ?? defaultPhone} required className={input} />
        </label>
      </div>

      <label className="block text-sm">{en ? "Country" : "국가 / Country"}
        <select name="country" value={country} onChange={(e) => setCountry(e.target.value)} className={input}>
          {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{en ? c.en : c.ko}</option>)}
        </select>
      </label>

      <div className="flex items-end gap-2">
        <label className="block flex-1 text-sm">{en ? "Postal code" : "우편번호 / Zip"}
          <input name="zipcode" value={zipcode} onChange={(e) => setZipcode(e.target.value)} className={input} />
        </label>
        {country === "KR" && (
          <button type="button" onClick={searchKR} className="mb-0.5 rounded border px-3 py-2 text-sm hover:bg-neutral-50">
            {tt.zipSearch}
          </button>
        )}
      </div>

      <label className="block text-sm">{en ? "Address" : "기본 주소 / Address"}
        <input name="addr1" value={addr1} onChange={(e) => setAddr1(e.target.value)} required className={input} />
      </label>
      <label className="block text-sm">{en ? "Address detail" : "상세 주소 / Detail"}
        <input name="addr2" defaultValue={address?.addr2 ?? ""} className={input} />
      </label>
      <label className="block text-sm">{tt.entranceMemo}
        <input name="entrance_memo" defaultValue={address?.entrance_memo ?? ""} className={input} />
      </label>

      {/* 이미 기본인 주소는 여기서 해제할 수 없다 — 기본 배송지는 항상 1건 유지(D-113). */}
      {!address?.is_default && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="is_default" /> {tt.setDefaultAddress}
        </label>
      )}

      <div className="flex gap-2 pt-1">
        <button className="rounded-full bg-black px-5 py-2 text-sm text-white">{tt.save}</button>
        <button type="button" onClick={onCancel} className="rounded-full border px-5 py-2 text-sm">{tt.cancel}</button>
      </div>
    </form>
  );
}
