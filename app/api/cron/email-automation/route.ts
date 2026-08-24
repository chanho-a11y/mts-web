import { NextResponse } from "next/server";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { sendEmail, emailLayout } from "@/lib/email";

export const dynamic = "force-dynamic";

interface AbandonedOrder {
  id: string; order_no: string; email: string | null; placed_at: string;
  status: string; profile_id: string | null; grand_total: number; currency: string;
}
// 중복 리마인드 차단용 고객 키 — 같은 고객의 반복 결제 시도를 하나로 묶는다.
// 금액이 아니라 고객 단위로 묶는 이유: 장바구니를 조금씩 바꿔가며 재시도하면
// 금액이 달라져 같은 사람에게 여러 통이 나간다(실측 사례 있음).
const custKey = (email: string) => email.trim().toLowerCase();

// 미결제 주문 만료 기준(시간). 이니시스 결제창 세션보다 훨씬 길게 잡아
// "결제는 됐는데 주문만 만료"되는 사고를 막는다. ORDER_EXPIRE_HOURS 로 조정 가능.
const EXPIRE_HOURS = Number(process.env.ORDER_EXPIRE_HOURS) > 0 ? Number(process.env.ORDER_EXPIRE_HOURS) : 24;

// 이메일 자동화 + 미결제 주문 정리 (Vercel Cron 매시 실행).
// 인증: ?key=CRON_SECRET 또는 Authorization: Bearer CRON_SECRET
// 규칙: 신규 제품 안내(판매개시 12h 후) · 중단 결제 리마인드(5h 후) · 미결제 주문 만료(24h 후)
function authed(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const url = new URL(req.url);
  if (url.searchParams.get("key") === secret) return true;
  const h = req.headers.get("authorization") || "";
  return h === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!authed(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!hasServiceRole) return NextResponse.json({ error: "no_service_role" }, { status: 503 });

  const db = createAdminClient();
  const now = Date.now();
  const result = { new_product: 0, abandoned: 0, skipped_provider: 0, expired: 0 };

  // 활성 자동화 규칙
  const { data: rules } = await db.from("email_automation").select("trigger,delay_hours,segment,is_active,template_id").eq("is_active", true);
  const ruleFor = (t: string) => (rules ?? []).find((r: any) => r.trigger === t);

  async function already(kind: string, ref: string) {
    const { data } = await db.from("email_send_log").select("id").eq("kind", kind).eq("ref_id", ref).maybeSingle();
    return !!data;
  }
  // meta 를 함께 남기면 Resend 웹훅(오픈·클릭)이 이 행을 찾아 갱신할 수 있다.
  async function logSend(
    kind: string,
    ref: string,
    to: string,
    sent: boolean,
    meta?: { provider?: string; messageId?: string; subject?: string },
  ) {
    await db.from("email_send_log").insert({
      kind,
      ref_id: ref,
      to_email: to,
      status: sent ? "sent" : "skipped",
      provider: meta?.provider ?? null,
      provider_message_id: meta?.messageId ?? null,
      subject: meta?.subject ?? null,
    });
  }

  // 1) 신규 제품 안내 — 판매개시(published_at) delay_hours 경과, 24h 윈도우, 제품당 1회
  {
    const rule = ruleFor("new_product");
    const delayH = rule?.delay_hours ?? 12;
    const lo = new Date(now - 24 * 3600 * 1000).toISOString();
    const hi = new Date(now - delayH * 3600 * 1000).toISOString();
    // 활성(is_active) 규칙이 있을 때만 발송
    const { data: prods } = rule ? await db.from("product")
      .select("id,slug,title_ko,one_liner,published_at,status")
      .eq("status", "active").gte("published_at", lo).lte("published_at", hi) : { data: [] as { id: string; slug: string; title_ko: string; one_liner: string | null; published_at: string; status: string }[] };
    for (const p of prods ?? []) {
      if (await already("new_product", p.id)) continue;
      // 수신: 마케팅 동의 회원
      const { data: subs } = await db.from("profiles").select("email").eq("marketing_opt_in", true).not("email", "is", null).limit(500);
      const title = p.title_ko.replace(/\[.*?\]\s*/g, "");
      const html = emailLayout(`새 커피: ${title}`,
        `<p>${p.one_liner ?? "새로운 원두가 입고되었습니다."}</p>
         <p style="margin-top:14px"><a href="https://mtspace.coffee/products/${p.slug}" style="display:inline-block;background:#1a1a1a;color:#fff;text-decoration:none;padding:10px 18px;border-radius:999px">제품 보기</a></p>`);
      let any = false;
      const subject = `[MTSPACE] 새 커피 출시 — ${title}`;
      let lastMeta: { provider?: string; messageId?: string } = {};
      for (const s of subs ?? []) {
        if (!s.email) continue;
        const r = await sendEmail(s.email, subject, html);
        if (r.reason === "no_provider") { result.skipped_provider++; any = false; break; }
        lastMeta = { provider: r.provider, messageId: r.messageId };
        any = true;
      }
      await logSend("new_product", p.id, "(broadcast)", any, { ...lastMeta, subject });
      if (any) result.new_product++;
    }
  }

  // 2) 중단 결제 리마인드 — status=created, placed_at delay_hours 경과
  //    ※ 결제창 진입 전에 주문/주문번호를 먼저 발급하는 구조라 한 번의 결제 시도가
  //      'created' 주문을 여러 건 남긴다. 그대로 돌리면 같은 고객에게 같은 장바구니
  //      리마인드가 2~4통 나가므로 아래 두 단계로 중복을 차단한다.
  //      (a) 그 주문 이후 해당 고객의 결제 완료 이력이 있으면 발송 제외
  //          (재시도 끝에 결제한 고객에게 "결제를 완료해 주세요"가 가는 것을 막는다)
  //      (b) 남은 건은 고객당 최신 1건만 발송,
  //          나머지는 발송 없이 skipped 로 로그 → 다음 실행에서도 재시도되지 않음
  {
    const rule = ruleFor("abandoned_cart");
    const delayH = rule?.delay_hours ?? 5;
    const hi = new Date(now - delayH * 3600 * 1000).toISOString();
    // 활성(is_active) 규칙이 있을 때만 발송
    const { data: rawOrders } = rule ? await db.from("orders")
      .select("id,order_no,email,placed_at,status,profile_id,grand_total,currency")
      .eq("status", "created").lte("placed_at", hi)
      .order("placed_at", { ascending: false }).limit(300)
      : { data: [] as AbandonedOrder[] };

    const candidates = (rawOrders ?? []) as AbandonedOrder[];

    // (a) 고객별 최종 결제 완료 시각 (최근 90일)
    const lastPaid = new Map<string, string>();
    const emails = Array.from(new Set(candidates.map((o) => o.email).filter((e): e is string => !!e)));
    if (emails.length) {
      const { data: paidRows } = await db.from("orders")
        .select("email,paid_at")
        .in("email", emails).not("paid_at", "is", null)
        .gte("paid_at", new Date(now - 90 * 24 * 3600 * 1000).toISOString());
      for (const p of (paidRows ?? []) as { email: string | null; paid_at: string }[]) {
        if (!p.email) continue;
        const k = custKey(p.email);
        const prev = lastPaid.get(k);
        if (!prev || p.paid_at > prev) lastPaid.set(k, p.paid_at);
      }
    }

    // (b) 고객당 최신 1건만 남김 (candidates 는 placed_at 내림차순)
    const seen = new Set<string>();
    const orders: AbandonedOrder[] = [];
    for (const o of candidates) {
      if (!o.email) continue;
      const key = custKey(o.email);
      const paidAfter = lastPaid.get(key);
      // 이 주문을 넣은 뒤 결제를 마친 고객이면 리마인드 대상 아님
      if ((paidAfter && paidAfter >= o.placed_at) || seen.has(key)) {
        if (!(await already("abandoned_cart", o.id))) await logSend("abandoned_cart", o.id, o.email, false);
        continue;
      }
      seen.add(key);
      orders.push(o);
    }

    for (const o of orders) {
      if (!o.email) continue;
      if (await already("abandoned_cart", o.id)) continue;
      // 마케팅 수신 동의(marketing_opt_in) 회원에게만 — 비회원·미동의 제외
      if (!o.profile_id) continue;
      const { data: prof } = await db.from("profiles").select("marketing_opt_in").eq("id", o.profile_id).maybeSingle();
      if (!prof?.marketing_opt_in) continue;
      const html = emailLayout("결제를 완료해 주세요",
        `<p>주문(<b>${o.order_no}</b>) 결제가 아직 완료되지 않았습니다. 장바구니가 사라지기 전에 마저 결제해 주세요.</p>
         <p style="margin-top:14px"><a href="https://mtspace.coffee/cart" style="display:inline-block;background:#1a1a1a;color:#fff;text-decoration:none;padding:10px 18px;border-radius:999px">결제 계속하기</a></p>`);
      const subject = `[MTSPACE] 결제를 완료해 주세요 (${o.order_no})`;
      const r = await sendEmail(o.email, subject, html);
      if (r.reason === "no_provider") { result.skipped_provider++; continue; }
      await logSend("abandoned_cart", o.id, o.email, r.sent, { provider: r.provider, messageId: r.messageId, subject });
      if (r.sent) result.abandoned++;
    }
  }

  // 3) 미결제 주문 만료 — created 상태로 EXPIRE_HOURS 경과 + 승인된 결제가 없는 건을 expired 로 전환.
  //    결제창 진입 전 주문 선발급 구조상 재시도마다 폐기 주문이 쌓인다. 그대로 두면 관리자 목록·
  //    분석 지표·리마인드 대상이 계속 오염되므로 하루 지난 건은 정리한다.
  //    ※ 늦게 도착한 PG 승인 콜백은 approvePayment 가 expired → paid 로 되살린다(안전망).
  {
    const cutoff = new Date(now - EXPIRE_HOURS * 3600 * 1000).toISOString();
    const { data: stale } = await db.from("orders")
      .select("id,order_no,paid_at,payment(status)")
      .eq("status", "created").lte("placed_at", cutoff).limit(500);
    const targets = ((stale ?? []) as { id: string; paid_at: string | null; payment: { status: string }[] | null }[])
      // 결제가 한 건이라도 승인/완료 상태면 건드리지 않는다(상태 전이 누락분 보호).
      .filter((o) => !o.paid_at && !(o.payment ?? []).some((p) => p.status === "paid" || p.status === "captured"))
      .map((o) => o.id);
    if (targets.length) {
      const { error } = await db.from("orders").update({ status: "expired" }).in("id", targets);
      if (!error) result.expired = targets.length;
      else console.warn("[order-expire] update failed:", error.message);
    }
  }

  return NextResponse.json({ ok: true, ...result });
}
