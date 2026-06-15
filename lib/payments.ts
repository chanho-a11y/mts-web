// Payment provider adapters. Structure ready; real PG keys added later (env).
// 이니시스(KRW) · 카카오페이(KRW) · 페이팔(USD, 해외/원두).
export type Provider = "inicis" | "kakaopay" | "paypal";

export interface PaymentInit {
  orderId: string;
  orderNo: string;
  amount: number;
  currency: string; // KRW | USD
  returnUrl: string;
}
export interface PaymentInitResult {
  ready: boolean;          // true면 결제창/리다이렉트 진행 가능
  redirectUrl?: string;
  message: string;
}

export interface PaymentAdapter {
  provider: Provider;
  label: string;
  currency: "KRW" | "USD";
  init(p: PaymentInit): Promise<PaymentInitResult>;
}

const notConfigured = (provider: Provider): PaymentInitResult => ({
  ready: false,
  message: `${provider} 결제 연동 키가 아직 설정되지 않았습니다. (env 추가 후 활성화)`,
});

export const inicis: PaymentAdapter = {
  provider: "inicis", label: "신용카드·계좌이체 (이니시스)", currency: "KRW",
  async init(p) {
    if (!process.env.INICIS_MID || !process.env.INICIS_SIGNKEY) return notConfigured("inicis");
    // TODO: INIStdPay 서명·결제창 파라미터 생성 → redirectUrl
    return { ready: true, message: "inicis ready", redirectUrl: undefined };
  },
};
export const kakaopay: PaymentAdapter = {
  provider: "kakaopay", label: "카카오페이", currency: "KRW",
  async init(p) {
    if (!process.env.KAKAOPAY_CID || !process.env.KAKAOPAY_SECRET) return notConfigured("kakaopay");
    // TODO: kakaopay ready → next_redirect_pc_url
    return { ready: true, message: "kakaopay ready" };
  },
};
export const paypal: PaymentAdapter = {
  provider: "paypal", label: "PayPal (해외·USD)", currency: "USD",
  async init(p) {
    if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_SECRET) return notConfigured("paypal");
    // TODO: PayPal Orders v2 create → approve link
    return { ready: true, message: "paypal ready" };
  },
};

export const ADAPTERS: Record<Provider, PaymentAdapter> = { inicis, kakaopay, paypal };
export function getAdapter(p: Provider): PaymentAdapter { return ADAPTERS[p]; }
