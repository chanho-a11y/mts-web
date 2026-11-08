import { timingSafeEqual } from "crypto";

/**
 * 크론 엔드포인트 인증(S4, D-160). Vercel Cron 은 CRON_SECRET 이 설정돼 있으면
 * `Authorization: Bearer <CRON_SECRET>` 를 자동으로 붙인다. 이것만 받는다.
 * · `x-vercel-cron` 헤더는 외부에서도 그대로 보낼 수 있어 인증 근거가 못 된다(2026-11-08 실측).
 * · `?key=` 는 시크릿이 접근 로그에 남아 뺐다(호출처 없음 확인).
 */
export function cronAuthed(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const a = Buffer.from(req.headers.get("authorization") || "", "utf8");
  const b = Buffer.from(`Bearer ${secret}`, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}
