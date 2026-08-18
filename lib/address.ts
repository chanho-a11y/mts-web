// 배송지 주소록 공통 규칙 (D-113)
// 서버 액션·클라이언트 폼이 같은 상한/정규화 기준을 쓰도록 한 곳에 둔다.

export const MAX_ADDRESSES = 5;

export interface AddressRow {
  id: string;
  label: string | null;
  recipient: string | null;
  phone: string | null;
  country: string;
  zipcode: string | null;
  addr1: string | null;
  addr2: string | null;
  entrance_memo: string | null;
  is_default: boolean;
}

/** 같은 주소인지 판정하는 키 — 체크아웃 자동저장의 중복 방지에 쓴다. */
export function addressKey(a: {
  country?: string | null; zipcode?: string | null; addr1?: string | null;
  addr2?: string | null; recipient?: string | null;
}): string {
  const n = (v: string | null | undefined) => (v ?? "").replace(/\s+/g, " ").trim().toLowerCase();
  return [n(a.country) || "kr", n(a.zipcode), n(a.addr1), n(a.addr2), n(a.recipient)].join("|");
}

/** 목록 표시용 한 줄 요약 */
export function formatAddressLine(a: AddressRow): string {
  const zip = a.zipcode ? `(${a.zipcode}) ` : "";
  return `${zip}${a.addr1 ?? ""}${a.addr2 ? ` ${a.addr2}` : ""}`.trim();
}
