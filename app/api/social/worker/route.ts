import { NextResponse } from "next/server";
import { cronAuthed } from "@/lib/cron-auth";
import { runSocialWorker } from "@/lib/social/run";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * 인스타그램 발행 워커 트리거 (D-137). Vercel Cron 5분 간격.
 * 인증: Authorization: Bearer CRON_SECRET (lib/cron-auth.ts, D-160)
 * (email-automation 크론과 같은 규약).
 */
const authed = cronAuthed;

export async function GET(req: Request) {
  if (!authed(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const result = await runSocialWorker({ maxPosts: 3, budgetMs: 50_000 });
  return NextResponse.json(result, { status: result.ok ? 200 : 503 });
}
