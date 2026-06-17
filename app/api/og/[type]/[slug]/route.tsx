import { ImageResponse } from "next/og";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const FONT = "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/woff/Pretendard-Bold.woff";

function lum(hex: string) {
  const h = (hex || "").replace("#", "");
  if (h.length < 6) return 0;
  return (0.2126 * parseInt(h.slice(0, 2), 16) + 0.7152 * parseInt(h.slice(2, 4), 16) + 0.0722 * parseInt(h.slice(4, 6), 16)) / 255;
}

export async function GET(req: Request, { params }: { params: { type: string; slug: string } }) {
  try {
    const url = `${SUPA}/rest/v1/product?slug=eq.${encodeURIComponent(params.slug)}&select=title_ko,one_liner,flavor_notes,roast_level,key_color,product_variant(base_price,is_active)&limit=1`;
    const res = await fetch(url, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
    const arr = await res.json();
    const p = arr?.[0];
    if (!p) return new Response("Not found", { status: 404 });

    // 양식 설정(자산 강조색) — /admin/templates (mtspace 브랜드 기준)
    let accentOverride = "";
    try {
      const sres = await fetch(`${SUPA}/rest/v1/site_setting?brand_id=eq.a66da681-f7e1-4f1e-bf27-f6fa6edcb3e1&key=eq.asset_accent&select=value&limit=1`,
        { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
      const sarr = await sres.json();
      accentOverride = sarr?.[0]?.value || "";
    } catch {}

    const key = accentOverride || p.key_color || "#1A1A1A";
    const fg = lum(key) > 0.6 ? "#1A1A1A" : "#FFFFFF";
    const variants = (p.product_variant ?? []).filter((v: any) => v.is_active);
    const price = variants.length ? Math.min(...variants.map((v: any) => v.base_price)) : 0;
    const title = (p.title_ko || "").replace(/\[.*?\]\s*/g, "");
    const notes = (p.flavor_notes ?? []).slice(0, 3).join(" · ");
    const isCard = params.type === "cardnews";
    const W = 1080, H = isCard ? 1350 : 1080;

    const fontData = await fetch(FONT).then((r) => r.arrayBuffer());

    return new ImageResponse(
      (
        <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: key, color: fg, fontFamily: "Pretendard" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 30, letterSpacing: 2, opacity: 0.95 }}>MTSPACE COFFEE</div>
            <div style={{ fontSize: 20, opacity: 0.7, marginTop: 6 }}>{p.roast_level || ""}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 84, lineHeight: 1.1, fontWeight: 700 }}>{title}</div>
            <div style={{ fontSize: 34, marginTop: 18, opacity: 0.92 }}>{notes}</div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 26, opacity: 0.85 }}>
            <span>{price ? "₩" + price.toLocaleString() : ""}</span>
            <span>everyday excellence</span>
          </div>
        </div>
      ),
      { width: W, height: H, fonts: [{ name: "Pretendard", data: fontData, weight: 700, style: "normal" }] },
    );
  } catch {
    // 폴백: SVG 자산
    return Response.redirect(new URL(`/api/asset/${params.type}/${params.slug}`, req.url), 302);
  }
}
