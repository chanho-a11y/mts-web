// 유입 경로 서버 저장(D-154). 서버 액션, 라우트 핸들러에서만 import 한다.
// 어떤 경우에도 throw 하지 않는다. 가입, 주문, 로그인 흐름을 절대 막지 않기 위해서다.
// 쓰기는 service-role 로만 한다(회원이 자기 유입값을 조작하지 못하게).
import { cookies } from "next/headers";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { FT_COOKIE, LT_COOKIE, parseTouch, attributionSnapshot } from "@/lib/attribution";

export function readAttribution() {
  try {
    const c = cookies();
    return attributionSnapshot(parseTouch(c.get(FT_COOKIE)?.value), parseTouch(c.get(LT_COOKIE)?.value));
  } catch {
    return attributionSnapshot(null, null);
  }
}

export async function recordSignupAttribution(profileId: string, method: "email" | "oauth"): Promise<void> {
  if (!hasServiceRole || !profileId) return;
  try {
    const a = readAttribution();
    const { error } = await createAdminClient()
      .from("profile_attribution")
      .upsert(
        {
          profile_id: profileId,
          first_channel: a.firstChannel ?? a.channel,
          signup_channel: a.channel,
          first_touch: a.first,
          signup_touch: a.last,
          method,
        },
        { onConflict: "profile_id", ignoreDuplicates: true },
      );
    if (error) console.error("[attribution-signup]", error.message);
  } catch (e) {
    console.error("[attribution-signup]", e);
  }
}

export async function recordOrderAttribution(orderId: string): Promise<void> {
  if (!hasServiceRole || !orderId) return;
  try {
    const a = readAttribution();
    const { error } = await createAdminClient()
      .from("orders")
      .update({ acq_channel: a.channel, acq_first: a.first, acq_last: a.last })
      .eq("id", orderId);
    if (error) console.error("[attribution-order]", error.message);
  } catch (e) {
    console.error("[attribution-order]", e);
  }
}
