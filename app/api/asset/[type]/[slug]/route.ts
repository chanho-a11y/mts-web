import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { BRANDS } from "@/lib/brands";
import { thumbnailSVG, cardnewsSVG, type AssetProduct } from "@/lib/asset-svg";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { type: string; slug: string } }) {
  const supabase = createClient();
  const { data: p } = await supabase
    .from("product")
    .select("title_ko,title_en,one_liner,flavor_notes,roast_level,key_color,brand(code),product_variant(base_price,is_active)")
    .eq("slug", params.slug)
    .maybeSingle();
  if (!p) return new Response("Not found", { status: 404 });

  const variants = ((p as any).product_variant ?? []).filter((v: any) => v.is_active);
  const minPrice = variants.length ? Math.min(...variants.map((v: any) => v.base_price)) : 0;
  const brandCode = (p as any).brand?.code === "normcore" ? "normcore" : "mtspace";
  const brand = BRANDS[brandCode];
  const ap: AssetProduct = {
    title_ko: p.title_ko, title_en: p.title_en, one_liner: p.one_liner,
    flavor_notes: p.flavor_notes, roast_level: p.roast_level, key_color: p.key_color, minPrice,
  };

  // 양식 설정(자산 강조색·폰트) — /admin/templates
  let accent = ""; let font = "";
  try {
    const { data: b } = await supabase.from("brand").select("id").eq("code", brandCode).maybeSingle();
    if (b) {
      const { data: st } = await supabase.from("site_setting").select("key,value").eq("brand_id", b.id)
        .in("key", ["asset_accent", "asset_font"]);
      const m = Object.fromEntries((st ?? []).map((r: any) => [r.key, r.value ?? ""]));
      accent = m.asset_accent ?? ""; font = m.asset_font ?? "";
    }
  } catch {}
  const tpl = { accent: accent || null, font: font || null };

  const svg = params.type === "cardnews"
    ? cardnewsSVG(ap, { name: brand.name, instagram: brand.instagram }, tpl)
    : thumbnailSVG(ap, { name: brand.name, instagram: brand.instagram }, tpl);

  return new Response(svg, {
    headers: { "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": "public, max-age=300" },
  });
}
