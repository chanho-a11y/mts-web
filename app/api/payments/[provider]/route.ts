import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

// 결제 PG 콜백/노티 수신 구조. 운영 키 연동 시 검증·승인·주문 paid 처리 추가.
// inicis: return(authToken→승인)·noti(가상계좌) / kakaopay: approve(pg_token) / paypal: webhook(capture)
export async function POST(req: NextRequest, { params }: { params: { provider: string } }) {
  // TODO(키 연동 후):
  // 1) 서명/해시 검증  2) 금액·주문·통화 일치 확인  3) payment.status=paid, order.status=paid
  // 4) 재고 차감(ledger)  5) 멱등성(idempotency_key)  6) 실패/취소/망취소 분기
  let body: unknown = null;
  try { body = await req.json(); } catch { body = null; }
  console.log(`[payment:${params.provider}] callback received`, body ? "json" : "form");
  return Response.json({ received: true, provider: params.provider, note: "PG 키 연동 후 승인 처리 활성화" });
}

export async function GET(_req: NextRequest, { params }: { params: { provider: string } }) {
  return Response.json({ provider: params.provider, status: "callback endpoint ready (keys pending)" });
}
