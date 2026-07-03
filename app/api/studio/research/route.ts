import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// 블로그 실시간 리서치 — 네이버 검색 API(무료). 관리자 전용.
// GET  : 설정 여부 확인({ configured })  ·  POST { query, sources? } : 스니펫 반환
// 키(NAVER_CLIENT_ID/SECRET) 미설정 시 configured:false 로 안전 폴백(앱 미중단).
const NAVER_ENDPOINTS: Record<string, string> = {
  blog: "https://openapi.naver.com/v1/search/blog.json",
  news: "https://openapi.naver.com/v1/search/news.json",
  encyc: "https://openapi.naver.com/v1/search/encyc.json",
  webkr: "https://openapi.naver.com/v1/search/webkr.json",
};

function stripTags(s: string): string {
  return (s ?? "").replace(/<[^>]+>/g, "").replace(/&[a-z]+;/gi, " ").replace(/\s+/g, " ").trim();
}

async function requireAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, status: 401, error: "unauthorized" as const };
  const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (prof?.role !== "admin") return { ok: false, status: 403, error: "forbidden" as const };
  return { ok: true, status: 200, error: null };
}

export async function GET() {
  const a = await requireAdmin();
  if (!a.ok) return NextResponse.json({ error: a.error }, { status: a.status });
  const configured = !!(process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET);
  return NextResponse.json({ configured });
}

export async function POST(req: Request) {
  const a = await requireAdmin();
  if (!a.ok) return NextResponse.json({ error: a.error }, { status: a.status });

  const id = process.env.NAVER_CLIENT_ID;
  const secret = process.env.NAVER_CLIENT_SECRET;
  if (!id || !secret) {
    return NextResponse.json({ ok: false, configured: false, error: "NAVER_CLIENT_ID/SECRET 미설정 — 개발자센터에서 발급 후 Vercel env에 추가하세요." }, { status: 200 });
  }

  let p: any = {};
  try { p = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }
  const query = String(p.query || "").trim();
  if (!query) return NextResponse.json({ error: "query required" }, { status: 400 });
  const sources: string[] = Array.isArray(p.sources) && p.sources.length ? p.sources : ["blog", "encyc", "news"];

  const headers = { "X-Naver-Client-Id": id, "X-Naver-Client-Secret": secret };
  const items: { title: string; snippet: string; link: string; source: string }[] = [];

  await Promise.all(sources.filter((s) => NAVER_ENDPOINTS[s]).map(async (s) => {
    try {
      const url = `${NAVER_ENDPOINTS[s]}?query=${encodeURIComponent(query)}&display=5&sort=sim`;
      const r = await fetch(url, { headers, cache: "no-store" });
      if (!r.ok) return;
      const j: any = await r.json();
      for (const it of (j.items ?? [])) {
        items.push({
          title: stripTags(it.title || ""),
          snippet: stripTags(it.description || ""),
          link: String(it.link || it.originallink || ""),
          source: s,
        });
      }
    } catch { /* skip source */ }
  }));

  // 키워드 후보: 스니펫에서 커피 관련 명사구 대략 추출(2~12자 한글 토큰 빈도)
  const freq: Record<string, number> = {};
  for (const it of items) {
    for (const w of (it.title + " " + it.snippet).split(/[^가-힣A-Za-z0-9]+/)) {
      const t = w.trim();
      if (t.length >= 2 && t.length <= 12 && /[가-힣]/.test(t)) freq[t] = (freq[t] || 0) + 1;
    }
  }
  const keywords = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k]) => k);

  return NextResponse.json({ ok: true, configured: true, query, items: items.slice(0, 12), keywords });
}
