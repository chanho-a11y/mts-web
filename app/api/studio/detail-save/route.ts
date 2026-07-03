import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// 상세페이지 인라인 편집 저장 — 레이아웃 고정, 텍스트/숫자 콘텐츠만 제품 컬럼에 반영(관리자 전용).
// body: { slug, title_ko, title_en, one_liner, flavor_notes(csv), roast_level, weight_g,
//         origin_country, origin_region, variety, altitude, process, recipe? }
export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (prof?.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let p: any = {};
  try { p = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }
  const slug = String(p.slug || "").trim();
  if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });

  const { data: product } = await supabase.from("product").select("id,origin").eq("slug", slug).maybeSingle();
  if (!product) return NextResponse.json({ error: "product not found" }, { status: 404 });
  const pid = (product as any).id;
  const prevOrigin = ((product as any).origin ?? {}) as Record<string, unknown>;

  const str = (v: any) => (typeof v === "string" ? v.trim() : "");
  const orNull = (v: any) => { const s = str(v); return s ? s : null; };
  const toArr = (v: any) => str(v).split(/[,·]/).map((x) => x.trim()).filter(Boolean);

  const upd: Record<string, unknown> = {};
  if (p.title_ko !== undefined) upd.title_ko = str(p.title_ko);
  if (p.title_en !== undefined) upd.title_en = orNull(p.title_en);
  if (p.one_liner !== undefined) upd.one_liner = orNull(p.one_liner);
  if (p.flavor_notes !== undefined) upd.flavor_notes = toArr(p.flavor_notes);
  if (p.roast_level !== undefined) upd.roast_level = orNull(p.roast_level);
  if (p.variety !== undefined) upd.variety = orNull(p.variety);
  if (p.process !== undefined) upd.process = orNull(p.process);
  if (p.altitude !== undefined) upd.altitude = orNull(p.altitude);
  if (p.weight_g !== undefined) { const w = parseInt(String(p.weight_g), 10); upd.weight_g = isNaN(w) ? null : w; }
  // origin 은 country_en·farm 등 기존 값을 보존하며 country/region 만 갱신
  if (p.origin_country !== undefined || p.origin_region !== undefined) {
    upd.origin = {
      ...prevOrigin,
      country: p.origin_country !== undefined ? str(p.origin_country) : prevOrigin.country ?? "",
      region: p.origin_region !== undefined ? str(p.origin_region) : prevOrigin.region ?? "",
    };
  }
  if (p.recipe && typeof p.recipe === "object") upd.recipe = p.recipe;

  const { error } = await supabase.from("product").update(upd).eq("id", pid);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidatePath(`/products/${slug}`);
  revalidatePath(`/admin/products/${slug}`);
  return NextResponse.json({ ok: true });
}
