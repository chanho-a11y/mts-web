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

  const svg = params.type === "cardnews"
    ? cardnewsSVG(ap, { name: brand.name, instagram: brand.instagram })
    : thumbnailSVG(ap, { name: brand.name, instagram: brand.instagram });

  return new Response(svg, {
    headers: { "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": "public, max-age=300" },
  });
}
