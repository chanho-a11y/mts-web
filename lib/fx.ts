// 실시간 환율(USD당 원화). 페이팔·해외주문의 KRW→USD 환산에 사용.
// - 소스: open.er-api.com(무료·키 불필요, exchangerate-api.com 제공). 매일 갱신 → 사실상 '주문일 환율'.
// - 캐시: 모듈 메모리 1시간 (체크아웃마다 외부호출 방지). 서버리스 웜 인스턴스 단위 유지. 원(raw)환율을 캐시.
// - 실패 폴백: 마지막 성공값 → 없으면 상수(FALLBACK_KRW_PER_USD).
// - 마진 버퍼: FX_MARKUP_PCT(기본 3%). effectiveRate = 시세 × (1 − 버퍼/100)로 유효환율을 낮춰
//   USD 판매가를 그만큼 올린다 → 출금 시 환손실(시세 변동·페이팔 환전 스프레드) 대비. (D-036)
// 환율을 절대 0/음수/미검증값으로 내보내지 않도록 방어한다(결제 금액 왜곡 방지).

export const FALLBACK_KRW_PER_USD = 1350; // API 장애 시 안전 폴백(운영 중 실측 근사치로 갱신 가능)
const DEFAULT_MARKUP_PCT = 3; // 기본 마진 버퍼(%)
const TTL_MS = 60 * 60 * 1000; // 1시간
const FX_URL = "https://open.er-api.com/v6/latest/USD";

let cache: { rate: number; at: number } | null = null; // raw(버퍼 미적용) 시세를 캐시

function markupPct(): number {
  const v = Number(process.env.FX_MARKUP_PCT);
  return isFinite(v) && v >= 0 && v < 50 ? v : DEFAULT_MARKUP_PCT;
}
function withBuffer(raw: number): number {
  return raw * (1 - markupPct() / 100);
}

// raw 시세(버퍼 미적용). 감사/표시용으로 필요 시 사용.
export async function getRawKrwPerUsd(): Promise<number> {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) return cache.rate;

  try {
    const res = await fetch(FX_URL, { next: { revalidate: 3600 } });
    const data = await res.json().catch(() => null);
    const krw = data?.rates?.KRW;
    if (res.ok && typeof krw === "number" && isFinite(krw) && krw > 0) {
      cache = { rate: krw, at: now };
      return krw;
    }
  } catch {
    // 네트워크/파싱 실패 → 아래 폴백
  }
  // 실패: 만료됐더라도 마지막 성공값이 폴백 상수보다 실측에 가깝다 → 우선 사용
  return cache?.rate ?? FALLBACK_KRW_PER_USD;
}

// 결제 환산에 쓰는 유효환율(마진 버퍼 적용). 항상 유효한 양수를 반환.
export async function getKrwPerUsd(): Promise<number> {
  return withBuffer(await getRawKrwPerUsd());
}
