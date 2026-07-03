import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// 지식베이스(kb_entry) 정의 목록 — 블로그 본문에 '정본 인용(KB)'으로 삽입하기 위한 소스. 관리자 전용.
// 신뢰 아키텍처(D-042): 외부 사실·정의는 라이브 스크래핑이 아니라 이 KB를 정본으로 인용한다.
export async function GET(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (prof?.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  let query = supabase.from("kb_entry").select("term,definition,category").order("position", { ascending: true }).limit(300);
  if (q) query = query.or(`term.ilike.%${q}%,definition.ilike.%${q}%`);
  const { data } = await query;
  const items = (data ?? [])
    .filter((r: { term?: string; definition?: string }) => r.term && r.definition)
    .map((r: { term?: string; definition?: string; category?: string }) => ({
      term: String(r.term), definition: String(r.definition), category: String(r.category ?? ""),
    }));
  return NextResponse.json({ items });
}
