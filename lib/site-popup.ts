// 공지 팝업(D-148) — 서버 전용 조회. 클라이언트 컴포넌트에서 import 금지(service-role 사용).
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { pickLive, toView, type PopupRow, type PopupView, type PopupViewer } from "@/lib/site-popup-shared";

/**
 * 방문자 구분. 승인 여부는 role 이 아니라 business_accounts.status 로 판별한다
 * (handle_new_user 가 가입 즉시 role='business' 를 넣기 때문, D-065).
 * 관리자는 홈과 같은 기준으로 사업자 화면을 본다.
 */
export async function resolvePopupViewer(): Promise<PopupViewer> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return "consumer";
    const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (prof?.role === "admin") return "business";
    if (prof?.role !== "business") return "consumer";
    const db = hasServiceRole ? createAdminClient() : supabase;
    const { data: biz } = await db.from("business_accounts").select("status").eq("profile_id", user.id).maybeSingle();
    return biz?.status === "approved" ? "business" : "consumer";
  } catch {
    return "consumer";
  }
}

/** 홈에 띄울 팝업(특별 → 상시, 최대 2개). 실패하면 빈 배열(홈 렌더를 막지 않음). */
export async function getHomePopups(brandCode: string, locale: "ko" | "en"): Promise<PopupView[]> {
  if (!hasServiceRole) return [];
  try {
    const admin = createAdminClient();
    const nowIso = new Date().toISOString();
    const [{ data: brand }, viewer] = await Promise.all([
      admin.from("brand").select("id").eq("code", brandCode).maybeSingle(),
      resolvePopupViewer(),
    ]);
    if (!brand) return [];
    const { data, error } = await admin
      .from("site_popup")
      .select("*")
      .eq("brand_id", brand.id)
      .eq("is_active", true)
      .is("archived_at", null)
      .lte("starts_at", nowIso)
      .or(`ends_at.is.null,ends_at.gt.${nowIso}`)
      .limit(50);
    if (error || !data) return [];
    // 영문 화면은 영문 제목이 있는 공지만 후보로 둔 뒤 유형별 1위를 고른다.
    const rows = (data as PopupRow[]).filter((r) => locale !== "en" || !!r.title_en);
    return pickLive(rows, viewer, new Date())
      .map((r) => toView(r, locale))
      .filter((v): v is PopupView => v !== null);
  } catch {
    return [];
  }
}
