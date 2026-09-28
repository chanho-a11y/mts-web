// Meta Pixel 표준 이벤트 전송 헬퍼 (클라이언트 전용).
//
// 배경: 픽셀이 PageView 만 보내고 있어서 카탈로그 일치율이 0% 였다(2026-09-28 커머스 관리자 실측).
// ViewContent / AddToCart / InitiateCheckout / Purchase 를 content_ids 와 함께 보내야
// 카탈로그 광고와 전환 최적화가 동작한다.
//
// content_ids 규약: 상품 피드(app/feed/shopping.xml)의 g:id 와 반드시 같아야 한다 → 상품 slug.
//
// 픽셀 스크립트는 afterInteractive 로 늦게 로드되므로, fbq 가 아직 없으면 잠시 재시도한다.
// 픽셀 ID 가 없는 환경(프리뷰 등)에서는 조용히 아무것도 하지 않는다.
// 어떤 경우에도 throw 하지 않는다(지표 하나 때문에 구매 흐름이 깨지면 안 된다).

type Fbq = (...args: unknown[]) => void;

export interface MetaContent {
  id: string;
  quantity: number;
  item_price?: number;
}

export interface MetaEventParams {
  content_ids?: string[];
  content_type?: "product";
  content_name?: string;
  contents?: MetaContent[];
  value?: number;
  currency?: string;
  num_items?: number;
}

const RETRY_MS = 250;
const MAX_TRIES = 20; // 최대 약 5초

export function trackMeta(
  event: "ViewContent" | "AddToCart" | "InitiateCheckout" | "Purchase",
  params: MetaEventParams,
  eventId?: string,
): void {
  if (typeof window === "undefined") return;
  if (!process.env.NEXT_PUBLIC_META_PIXEL_ID) return;
  let tries = 0;
  const attempt = () => {
    try {
      const fbq = (window as unknown as { fbq?: Fbq }).fbq;
      if (typeof fbq === "function") {
        if (eventId) fbq("track", event, params, { eventID: eventId });
        else fbq("track", event, params);
        return;
      }
    } catch {
      return;
    }
    tries += 1;
    if (tries < MAX_TRIES) setTimeout(attempt, RETRY_MS);
  };
  attempt();
}

// 여러 줄의 장바구니/주문 항목을 slug 기준으로 합친다(같은 상품의 다른 옵션은 한 content 로).
export function toMetaContents(lines: { id: string; quantity: number; price: number }[]): MetaContent[] {
  const map = new Map<string, MetaContent>();
  for (const l of lines) {
    if (!l.id) continue;
    const ex = map.get(l.id);
    if (ex) ex.quantity += l.quantity;
    else map.set(l.id, { id: l.id, quantity: l.quantity, item_price: l.price });
  }
  return Array.from(map.values());
}
