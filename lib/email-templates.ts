// 마케팅 자동화 트리거 템플릿(프리셋). 관리자 이메일 화면에서 선택해 자동화로 추가.
// wired=true 는 현재 발송 엔진(cron)이 실제 구현한 트리거. false 는 규칙 저장·활성화는 되나
// 발송 로직은 후속 연동(현행 설계상 "대기(연동 필요)"로 표기).
export interface TriggerTemplate {
  trigger: string;
  label: string;
  desc: string;
  defaultDelayHours: number;
  defaultSegment: string;
  wired: boolean;
}

export const TRIGGER_TEMPLATES: TriggerTemplate[] = [
  { trigger: "welcome",               label: "환영 메일",         desc: "회원가입 직후 브랜드 소개·첫 구매 유도",         defaultDelayHours: 0,    defaultSegment: "subscribers", wired: false },
  { trigger: "first_purchase_thanks", label: "첫 구매 감사",       desc: "첫 결제 완료 후 감사 인사·재구매 안내",           defaultDelayHours: 1,    defaultSegment: "all",         wired: false },
  { trigger: "review_request",        label: "리뷰 요청",         desc: "배송 완료 후 리뷰 작성 요청",                     defaultDelayHours: 168,  defaultSegment: "all",         wired: false },
  { trigger: "reorder_reminder",      label: "재구매 유도",       desc: "마지막 구매 후 원두 소진 시점 재구매 리마인드",   defaultDelayHours: 720,  defaultSegment: "subscribers", wired: false },
  { trigger: "restock_alert",         label: "재입고 알림",       desc: "품절 제품 재입고 시 관심 고객 알림",             defaultDelayHours: 0,    defaultSegment: "subscribers", wired: false },
  { trigger: "abandoned_cart",        label: "중단 결제 리마인드", desc: "결제 미완료 주문 리마인드",                       defaultDelayHours: 5,    defaultSegment: "subscribers", wired: true  },
  { trigger: "new_product",           label: "신규 제품 안내",     desc: "신제품 판매개시 안내",                            defaultDelayHours: 12,   defaultSegment: "subscribers", wired: true  },
  { trigger: "dormant_winback",       label: "휴면 고객 회복",     desc: "장기 미구매 고객 리인게이지먼트",                 defaultDelayHours: 2160, defaultSegment: "subscribers", wired: false },
  { trigger: "birthday_coupon",       label: "생일 쿠폰",         desc: "생일 축하 + 할인 쿠폰 발송",                       defaultDelayHours: 0,    defaultSegment: "subscribers", wired: false },
  { trigger: "seasonal_promo",        label: "시즌 프로모션",      desc: "시즌·이벤트 프로모션 안내",                       defaultDelayHours: 0,    defaultSegment: "subscribers", wired: false },
];

export const SEGMENTS: { value: string; label: string }[] = [
  { value: "all",         label: "전체" },
  { value: "subscribers", label: "마케팅 동의 회원" },
  { value: "business",    label: "사업자" },
  { value: "individual",  label: "개인" },
];

export function templateFor(trigger: string): TriggerTemplate | undefined {
  return TRIGGER_TEMPLATES.find((t) => t.trigger === trigger);
}
