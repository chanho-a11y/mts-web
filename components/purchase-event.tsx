"use client";
import { useEffect, useRef } from "react";
import { trackMeta, toMetaContents } from "@/lib/meta-pixel";

// GA4 구매 전환 이벤트.
//
// 배경: GA4 태그는 페이지뷰만 보내고 있어서, 관리자 분석의 "유입 경로" 표에서
// 전환 열이 항상 0 이었다. 유입 경로별 매출 귀속을 보려면 purchase 이벤트가
// 실제로 전송돼야 한다(GA4 에서 '주요 이벤트'로 표시하는 것만으로는 생기지 않는다).
//
// 중복 방지: 완료 페이지는 새로고침·뒤로가기로 다시 열릴 수 있다. 주문번호를 키로
// sessionStorage 에 표시해 같은 주문이 두 번 집계되지 않게 한다.
// (sessionStorage 가 막힌 브라우저에서는 조용히 건너뛴다 — 지표 하나 때문에
//  완료 화면이 깨지면 안 된다.)

export interface PurchaseItem {
  item_id: string;
  item_name: string;
  quantity: number;
  price: number;
}

export interface PurchaseEventProps {
  transactionId: string;
  value: number;
  currency: string;
  items: PurchaseItem[];
  // Meta Pixel Purchase 용 (id = 상품 slug). 없으면 Meta 이벤트는 건너뛴다.
  metaLines?: { id: string; quantity: number; price: number }[];
}

const KEY_PREFIX = "mts_ga4_purchase_";

export default function PurchaseEvent({ transactionId, value, currency, items, metaLines }: PurchaseEventProps) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current || !transactionId) return;
    fired.current = true;

    const key = KEY_PREFIX + transactionId;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // 저장소가 막혀 있으면 중복 방지는 포기하되 전송은 계속한다.
    }

    try {
      const g = (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag;
      if (typeof g === "function") {
        g("event", "purchase", {
          transaction_id: transactionId,
          value,
          currency,
          items,
        });
      }
    } catch {
      // 분석 이벤트 실패가 주문 완료 화면을 막지 않는다.
    }

    // Meta Pixel Purchase. eventID 는 추후 Conversions API 도입 시 중복 제거 키로 쓴다.
    if (metaLines && metaLines.length) {
      const contents = toMetaContents(metaLines);
      trackMeta(
        "Purchase",
        {
          content_ids: contents.map((c) => c.id),
          content_type: "product",
          contents,
          num_items: metaLines.reduce((s, l) => s + l.quantity, 0),
          value,
          currency,
        },
        `purchase_${transactionId}`,
      );
    }
  }, [transactionId, value, currency, items, metaLines]);

  return null;
}
