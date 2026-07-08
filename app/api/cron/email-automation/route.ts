import { NextResponse } from "next/server";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { sendEmail, emailLayout } from "@/lib/email";

export const dynamic = "force-dynamic";

// 이메일 자동화 실행 (Vercel Cron 또는 외부 스케줄러가 주기 호출).
// 인증: ?key=CRON_SECRET 또는 Authorization: Bearer CRON_SECRET
// 규칙: 신규 제품 안내(판매개시 12h 후) · 중단 결제 리마인드(5h 후)
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
  const result = { new_product: 0, abandoned: 0, skipped_provider: 0 };

  // 활성 자동화 규칙
  const { data: rules } = await db.from("email_automation").select("trigger,delay_hours,segment,is_active,template_id").eq("is_active", true);
  const ruleFor = (t: string) => (rules ?? []).find((r: any) => r.trigger === t);

  async function already(kind: string, ref: string) {
    const { data } = await db.from("email_send_log").select("id").eq("kind", kind).eq("ref_id", ref).maybeSingle();
    return !!data;
  }
  async function logSend(kind: string, ref: string, to: string, sent: boolean) {
    await db.from("email_send_log").insert({ kind, ref_id: ref, to_email: to, status: sent ? "sent" : "skipped" });
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
      for (const s of subs ?? []) {
        if (!s.email) continue;
        const r = await sendEmail(s.email, `[MTSPACE] 새 커피 출시 — ${title}`, html);
        if (r.reason === "no_provider") { result.skipped_provider++; any = false; break; }
        any = true;
      }
      await logSend("new_product", p.id, "(broadcast)", any);
      if (any) result.new_product++;
    }
  }

  // 2) 중단 결제 리마인드 — status=created, placed_at delay_hours 경과, 주문당 1회
  {
    const rule = ruleFor("abandoned_cart");
    const delayH = rule?.delay_hours ?? 5;
    const hi = new Date(now - delayH * 3600 * 1000).toISOString();
    // 활성(is_active) 규칙이 있을 때만 발송
    const { data: orders } = rule ? await db.from("orders")
      .select("id,order_no,email,placed_at,status,profile_id").eq("status", "created").lte("placed_at", hi).limit(300)
      : { data: [] as { id: string; order_no: string; email: string | null; placed_at: string; status: string; profile_id: string | null }[] };
    for (const o of orders ?? []) {
      if (!o.email) continue;
      if (await already("abandoned_cart", o.id)) continue;
      // 마케팅 수신 동의(marketing_opt_in) 회원에게만 — 비회원·미동의 제외
      if (!o.profile_id) continue;
      const { data: prof } = await db.from("profiles").select("marketing_opt_in").eq("id", o.profile_id).maybeSingle();
      if (!prof?.marketing_opt_in) continue;
      const html = emailLayout("결제를 완료해 주세요",
        `<p>주문(<b>${o.order_no}</b>) 결제가 아직 완료되지 않았습니다. 장바구니가 사라지기 전에 마저 결제해 주세요.</p>
         <p style="margin-top:14px"><a href="https://mtspace.coffee/cart" style="display:inline-block;background:#1a1a1a;color:#fff;text-decoration:none;padding:10px 18px;border-radius:999px">결제 계속하기</a></p>`);
      const r = await sendEmail(o.email, `[MTSPACE] 결제를 완료해 주세요 (${o.order_no})`, html);
      if (r.reason === "no_provider") { result.skipped_provider++; continue; }
      await logSend("abandoned_cart", o.id, o.email, r.sent);
      if (r.sent) result.abandoned++;
    }
  }

  return NextResponse.json({ ok: true, ...result });
}
