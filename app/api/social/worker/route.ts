import { NextResponse } from "next/server";
import { runSocialWorker } from "@/lib/social/run";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * 인스타그램 발행 워커 트리거 (D-137). Vercel Cron 5분 간격.
 * 인증: Vercel Cron 헤더(x-vercel-cron) 또는 ?key=CRON_SECRET / Authorization: Bearer CRON_SECRET
 * (email-automation 크론과 같은 규약).
 */
function authed(req: Request): boolean {
  if (req.headers.get("x-vercel-cron")) return true;
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const url = new URL(req.url);
  if (url.searchParams.get("key") === secret) return true;
  return (req.headers.get("authorization") || "") === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!authed(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const result = await runSocialWorker({ maxPosts: 3, budgetMs: 50_000 });
  return NextResponse.json(result, { status: result.ok ? 200 : 503 });
}
