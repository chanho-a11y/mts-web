import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// 이니시스 표준결제 closeUrl 전용 라우트.
//
// INIStdPay(PC)는 payViewType=overlay 로 동작한다 — 결제창을 우리 페이지 안의
// iframe(#inicisModalDiv)으로 띄우고, 고객이 결제를 취소하면 그 iframe 을 closeUrl 로 보낸다.
// 따라서 이 응답은 "부모 페이지가 아니라 오버레이 iframe 안에서" 실행된다.
//
// 여기서 할 일은 단 하나 — 부모의 오버레이를 걷어내는 것이다.
// 부모를 이동시키거나 새로고침하지 않는 것이 중요하다. 부모(체크아웃 페이지)의 React 상태를
// 그대로 살려두어야 [결제창 다시 열기]가 같은 주문번호로 재시도할 수 있고,
// 그래야 취소할 때마다 새 주문번호가 발급되는 중복이 생기지 않는다.
//
// closeUrl 은 결제창을 띄운 페이지와 같은 도메인이어야 하므로(이니시스 V023) 부모와 same-origin,
// 즉 parent 접근이 허용된다. next.config.mjs 에서 이 경로만 X-Frame-Options: SAMEORIGIN.
const HTML = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><title>결제창 닫는 중</title></head>
<body style="margin:0;background:#fff">
<script>
(function () {
  var p;
  try { p = window.parent; } catch (e) { p = null; }
  if (!p || p === window) {
    // iframe 이 아닌 최상위로 열린 경우(직접 접근 등) — 체크아웃으로 되돌린다.
    try { (window.top || window).location.replace("/checkout"); } catch (e) { location.replace("/checkout"); }
    return;
  }
  // 1순위: 이니시스가 제공하는 정식 해제 함수
  try {
    if (p.INIStdPay && typeof p.INIStdPay.viewOff === "function") { p.INIStdPay.viewOff(); return; }
  } catch (e) {}
  // 2순위: 오버레이 노드를 직접 제거 (SDK 내부 구조가 바뀐 경우 대비)
  try {
    var d = p.document;
    var sel = "#inicisModalDiv, .inipay_modal, .inipay_modal_msg, .modal-backdrop";
    var nodes = d.querySelectorAll(sel);
    for (var i = 0; i < nodes.length; i++) { if (nodes[i].parentNode) nodes[i].parentNode.removeChild(nodes[i]); }
    if (d.body) { d.body.className = String(d.body.className || "").replace(/modal-open/g, ""); d.body.style.overflow = ""; }
    return;
  } catch (e) {}
  // 3순위: 부모 접근이 막힌 경우 — 부모를 체크아웃으로 되돌린다(장바구니는 유지되므로 재시도 가능).
  try { p.location.replace("/checkout"); } catch (e) {}
})();
</script>
</body></html>`;

export async function GET() {
  return new NextResponse(HTML, {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}

// 이니시스가 closeUrl 을 POST 로 호출하는 경우에도 같은 응답을 준다.
export async function POST() {
  return new NextResponse(HTML, {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}
