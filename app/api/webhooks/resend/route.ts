import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// Resend 이벤트 웹훅 — 발송 로그에 오픈·클릭·반송을 채운다.
//
// 설정 (Resend 대시보드 → Webhooks)
//   Endpoint : https://mtspace.coffee/api/webhooks/resend
//   Events   : email.delivered / email.opened / email.clicked / email.bounced / email.complained
//   Secret   : Vercel env `RESEND_WEBHOOK_SECRET` 에 동일 값 주입
//
// 서명 검증은 Svix 규격(svix-id / svix-timestamp / svix-signature)이다.
// 시크릿이 설정돼 있으면 반드시 검증하고, 없으면 이벤트를 받아도 무시한다
// (검증 없이 쓰기를 허용하면 아무나 지표를 조작할 수 있다).

const SECRET = process.env.RESEND_WEBHOOK_SECRET || "";
const TOLERANCE_SECONDS = 300;

function verify(raw: string, headers: Headers): boolean {
  if (!SECRET) return false;
  const id = headers.get("svix-id");
  const ts = headers.get("svix-timestamp");
  const sig = headers.get("svix-signature");
  if (!id || !ts || !sig) return false;

  const age = Math.abs(Date.now() / 1000 - Number(ts));
  if (!Number.isFinite(age) || age > TOLERANCE_SECONDS) return false;

  // whsec_ 접두사를 떼고 base64 디코드한 것이 실제 키다.
  const key = Buffer.from(SECRET.replace(/^whsec_/, ""), "base64");
  const expected = crypto.createHmac("sha256", key).update(`${id}.${ts}.${raw}`).digest("base64");

  // "v1,<sig> v1,<sig2>" 형태 — 하나라도 맞으면 통과. 타이밍 안전 비교.
  return sig.split(" ").some((part) => {
    const value = part.split(",")[1];
    if (!value) return false;
    const a = Buffer.from(value);
    const b = Buffer.from(expected);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  });
}

const FIELD_BY_TYPE: Record<string, string> = {
  "email.opened": "opened_at",
  "email.clicked": "clicked_at",
  "email.bounced": "bounced_at",
  "email.complained": "complained_at",
};

export async function POST(req: NextRequest) {
  const raw = await req.text();

  if (!verify(raw, req.headers)) {
    // 200 을 주면 Resend 가 재시도하지 않아 조용히 유실된다. 401 로 알린다.
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }
  if (!hasServiceRole) return NextResponse.json({ error: "no_service_role" }, { status: 503 });

  let evt: { type?: string; created_at?: string; data?: { email_id?: string } };
  try {
    evt = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const type = String(evt.type ?? "");
  const messageId = evt.data?.email_id;
  if (!messageId) return NextResponse.json({ received: true, skipped: "no_email_id" });

  const db = createAdminClient();
  const at = evt.created_at ?? new Date().toISOString();

  if (type === "email.delivered") {
    await db.from("email_send_log").update({ status: "delivered" }).eq("provider_message_id", messageId);
    return NextResponse.json({ received: true, type });
  }

  const field = FIELD_BY_TYPE[type];
  if (!field) return NextResponse.json({ received: true, skipped: type });

  // 최초 시각만 남긴다(오픈은 여러 번 올 수 있다).
  const patch: Record<string, unknown> = { [field]: at };
  if (type === "email.bounced") patch.status = "bounced";

  await db.from("email_send_log").update(patch).eq("provider_message_id", messageId).is(field, null);

  return NextResponse.json({ received: true, type });
}
