import { ImageResponse } from "next/og";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
// O2(D-160): 폰트를 저장소 안 파일로 번들한다. 이전 jsDelivr 주소는 404 본문("Couldn't find...")을 돌려줘
// 모든 OG 이미지가 0바이트로 나가고 있었다(Unsupported OpenType signature Coul). 외부 의존도 없앤다.
// 800 은 라틴 서브셋(16KB)이라 한글은 500(완성형 2350자 포함)으로 받친다. 커버 렌더(mcp/render)와 같은 폰트 세트.
const FONT = new URL("../../../../../mcp/fonts/Pretendard-800.woff", import.meta.url);
const FONT_KO = new URL("../../../../../mcp/fonts/Pretendard-500.woff", import.meta.url);

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

    // 브랜드 팔레트 (oat/ink/clay) — point color는 dot/액센트에만
    const OAT = "#F6F1E7", INK = "#3C352C", INK_SOFT = "#8A8173", CLAY_DEEP = "#B0764A", LINE = "#E3DAC8";
    const point = accentOverride || p.key_color || CLAY_DEEP;
    const variants = (p.product_variant ?? []).filter((v: any) => v.is_active);
    const price = variants.length ? Math.min(...variants.map((v: any) => v.base_price)) : 0;
    const title = (p.title_ko || "").replace(/\[.*?\]\s*/g, "");
    const notes = (p.flavor_notes ?? []).slice(0, 3).join(" · ");
    const isCard = params.type === "cardnews";
    const W = 1080, H = isCard ? 1350 : 1080;

    const [fontData, fontKo] = await Promise.all([FONT, FONT_KO].map((u) => fetch(u).then((r) => r.arrayBuffer())));

    return new ImageResponse(
      (
        <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: OAT, color: INK, fontFamily: "Pretendard" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 26, letterSpacing: 2, color: INK_SOFT }}>MTSPACE COFFEE</div>
            <div style={{ width: 22, height: 22, borderRadius: 22, background: point }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ width: 140, height: 4, background: point, marginBottom: 28 }} />
            <div style={{ fontSize: 88, lineHeight: 1.05, fontWeight: 800, letterSpacing: -1 }}>{title}</div>
            <div style={{ fontSize: 36, marginTop: 20, color: CLAY_DEEP, fontStyle: "italic" }}>{notes}</div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 24, color: INK_SOFT, borderTop: `1px solid ${LINE}`, paddingTop: 24 }}>
            <span>{price ? "KRW " + price.toLocaleString() : "SINGLE ORIGIN"}</span>
            <span>everyday excellence</span>
          </div>
        </div>
      ),
      { width: W, height: H, fonts: [
        { name: "Pretendard", data: fontData, weight: 800, style: "normal" },
        { name: "Pretendard", data: fontKo, weight: 500, style: "normal" },
      ] },
    );
  } catch {
    // 폴백: SVG 자산
    return Response.redirect(new URL(`/api/asset/${params.type}/${params.slug}`, req.url), 302);
  }
}
