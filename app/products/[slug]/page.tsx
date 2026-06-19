import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getStorefrontContext } from "@/lib/storefront";
import { getProductBySlug } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { BRANDS } from "@/lib/brands";
import { formatKRW, t } from "@/lib/i18n";
import AddToCart from "@/components/add-to-cart";
import { createSubscriptionAction } from "@/app/products/subscribe-action";
import { addReviewAction } from "@/app/products/review-action";
import { pointTheme } from "@/lib/point-color";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const p = await getProductBySlug(params.slug);
  if (!p) return {};
  const desc = p.one_liner ?? p.flavor_notes.join(" · ");
  return {
    title: `${p.title_ko.replace(/\[.*?\]\s*/g, "")} ${p.title_en ?? ""}`.trim(),
    description: desc,
    openGraph: { title: p.title_ko, description: desc, images: p.image ? [p.image] : [], type: "website" },
  };
}

// 상세페이지 디자인(킷 1:1) — 네임스페이스 .mtpdp 로 격리. 토큰/치수는 PRODUCT_DETAIL_SPEC와 동일.
const CSS = `
.mtpdp{--oat:#F6F1E7;--paper:#FCFAF5;--tint:#F1EBDD;--tint2:#F3EEE2;--ink:#3C352C;--ink-soft:#5C574E;--mute:#8A8173;--faint:#A79E8D;--hair:#ECE4D4;--hair2:#EFE7D6;--maxw:1040px;background:#e7e3dc;color:var(--ink);font-family:'Helvetica Neue',Pretendard,Arial,sans-serif}
.mtpdp .page{max-width:var(--maxw);margin:0 auto;background:var(--paper);box-shadow:0 2px 18px rgba(0,0,0,.10);overflow:hidden}
.mtpdp .accent{height:4px;background:var(--point)}
.mtpdp .mono{font-family:'IBM Plex Mono',Pretendard,monospace}
.mtpdp .serif{font-family:'Noto Serif KR',serif;font-weight:300}
.mtpdp .spectral{font-family:Spectral,serif}
.mtpdp .bar{border-bottom:1px solid var(--hair);padding:15px 34px;display:flex;align-items:center;justify-content:space-between}
.mtpdp .wm{font-weight:800;font-size:13px}.mtpdp .wm .l{font-weight:200}
.mtpdp .crumb{font-family:'IBM Plex Mono',monospace;font-size:9.5px;letter-spacing:.5px;color:var(--faint)}
.mtpdp .crumb .here{color:var(--point-text)}
.mtpdp .tagline{font-family:'IBM Plex Mono',monospace;font-size:9px;letter-spacing:1.5px;color:var(--faint);text-transform:uppercase}
.mtpdp .layout{display:flex;align-items:flex-start}
.mtpdp .rail{width:312px;flex:none;border-right:1px solid var(--hair);padding:28px 26px;position:sticky;top:0;align-self:flex-start}
.mtpdp .imgslot{background:var(--tint);border:1px solid #e3dac8;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;text-align:center;overflow:hidden}
.mtpdp .imgslot img{width:100%;height:100%;object-fit:cover}
.mtpdp .imgslot .tag{font-family:'IBM Plex Mono',monospace;font-size:9px;letter-spacing:2px;color:#b0a690}
.mtpdp .thumbs{display:flex;gap:6px;margin-top:9px}
.mtpdp .thumbs .t{flex:1;height:48px;background:var(--tint);border:1px solid #e3dac8;overflow:hidden}
.mtpdp .thumbs .t img{width:100%;height:100%;object-fit:cover}
.mtpdp .rail .kicker{font-family:'IBM Plex Mono',monospace;font-size:9px;letter-spacing:1.5px;color:var(--mute);text-transform:uppercase;margin-top:24px}
.mtpdp .rail h1{font-weight:800;font-size:27px;line-height:1.1;margin:8px 0 2px}
.mtpdp .rail .en{font-family:Spectral,serif;font-style:italic;font-size:15px;color:#6b6356}
.mtpdp .price{font-family:'IBM Plex Mono',monospace;font-size:19px;margin-top:18px}.mtpdp .price .cur{font-size:10px;color:var(--faint)}
.mtpdp .tax{font-size:10px;color:var(--faint);margin-top:8px}
.mtpdp .chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:20px}
.mtpdp .chip{font-family:'IBM Plex Mono',monospace;font-size:9px;color:var(--point-text);border:1px solid var(--point);border-radius:99px;padding:3px 9px}
.mtpdp .content{flex:1;min-width:0}
.mtpdp .hero{position:relative;padding:38px 38px 34px;color:#fff;background-color:var(--point);background-image:linear-gradient(var(--check) 1px,transparent 1px),linear-gradient(90deg,var(--check) 1px,transparent 1px);background-size:24px 24px}
.mtpdp .hero .kicker{font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,.72)}
.mtpdp .hero h1{font-weight:800;font-size:46px;line-height:1.04;margin:12px 0 6px}
.mtpdp .hero .en{font-family:Spectral,serif;font-style:italic;font-size:21px;color:rgba(255,255,255,.9)}
.mtpdp .hero .rule{width:48px;height:2px;background:rgba(255,255,255,.55);margin:18px 0}
.mtpdp .hero .notes{font-family:Spectral,serif;font-style:italic;font-size:16px;color:rgba(255,255,255,.85);line-height:1.5;max-width:460px}
.mtpdp .sec{padding:38px 38px 0}
.mtpdp .sec.first{padding-top:34px}
.mtpdp h2.head{font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:2px;color:var(--mute);text-transform:uppercase;margin:0 0 16px}
.mtpdp .lead{font-family:'Noto Serif KR',serif;font-weight:300;font-size:15px;line-height:1.95;color:var(--ink);margin:0}
.mtpdp .flav{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.mtpdp .flav .card{background:var(--tint2);border-top:2px solid var(--point);padding:18px 14px;text-align:center}
.mtpdp .flav .ft{font-family:Spectral,serif;font-size:19px;color:var(--point-text)}
.mtpdp .flav .fd{font-size:11px;color:var(--mute);margin-top:6px;line-height:1.6}
.mtpdp .about{display:flex;gap:26px;align-items:stretch}
.mtpdp .about .txt{flex:1.3}.mtpdp .about .txt p{font-family:'Noto Serif KR',serif;font-weight:300;font-size:14px;line-height:1.92;color:var(--ink);margin:0}
.mtpdp .about .txt p+p{color:var(--ink-soft);margin-top:12px}
.mtpdp .about .img{flex:1;min-height:180px}
.mtpdp .grid2{display:grid;grid-template-columns:1fr 1fr;gap:0 32px}
.mtpdp .kv{display:flex;justify-content:space-between;align-items:baseline;gap:12px;padding:9px 0;border-bottom:1px solid var(--hair2)}
.mtpdp .kv .k{font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.7px;color:#b0a690;flex:none}
.mtpdp .kv .v{font-size:13px;text-align:right}
.mtpdp .rec{display:flex;justify-content:space-between;align-items:baseline;gap:18px;padding:11px 0;border-bottom:1px solid var(--hair2)}
.mtpdp .rec .rk{font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.8px;color:var(--point-text);flex:none;width:120px}
.mtpdp .rec .rn{font-family:'IBM Plex Mono',monospace;font-size:12.5px}
.mtpdp .rec .rc{font-size:10.5px;color:var(--faint);margin-top:2px}
.mtpdp .faq{padding:13px 0;border-bottom:1px solid var(--hair)}
.mtpdp .faq .q{font-weight:700;font-size:13.5px}
.mtpdp .faq .a{font-family:'Noto Serif KR',serif;font-weight:300;font-size:13px;line-height:1.82;color:var(--ink-soft);margin-top:7px}
.mtpdp .fine{border-top:1px solid var(--hair);padding:18px 34px;font-size:9px;color:var(--faint);line-height:1.7}
.mtpdp .rev{padding:10px 0;border-bottom:1px solid var(--hair2)}
.mtpdp .frm input,.mtpdp .frm textarea,.mtpdp .frm select{border:1px solid var(--hair);background:#fff;border-radius:3px;padding:8px;font-size:13px}
@media (max-width:760px){
  .mtpdp .layout{flex-direction:column}
  .mtpdp .rail{width:100%;position:static;border-right:none;border-bottom:1px solid var(--hair);order:2}
  .mtpdp .content{order:1;width:100%}
  .mtpdp .grid2{grid-template-columns:1fr}
  .mtpdp .about{flex-direction:column}
  .mtpdp .flav{grid-template-columns:1fr 1fr}
  .mtpdp .hero h1{font-size:36px}
}
`;

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const { locale } = await getStorefrontContext();
  const tt = t(locale);
  const p = await getProductBySlug(params.slug);
  if (!p) notFound();

  const supabase = createClient();
  const { data: reviews } = await supabase
    .from("review").select("rating,title,body,author_name,created_at")
    .eq("product_id", p.id).eq("status", "published").order("created_at", { ascending: false });
  const revCount = reviews?.length ?? 0;
  const avgRating = revCount ? reviews!.reduce((s, r) => s + r.rating, 0) / revCount : 0;

  const isNormcore = p.title_ko.toLowerCase().includes("normcore");
  const pBrand = isNormcore ? BRANDS.normcore : BRANDS.mtspace;
  const theme = pointTheme({ labelPoint: p.label_point, flavorNotes: p.flavor_notes, roast: p.roast_level });
  const title = (locale === "en" && p.title_en ? p.title_en : p.title_ko).replace(/\[.*?\]\s*/g, "");
  const en = p.title_en ?? "";
  const weightTxt = p.weight_g ? `${p.weight_g}g` : "";
  const typeLine = [p.is_b2b_only ? "Wholesale" : (p.product_type || "Coffee"), p.roast_level].filter(Boolean).join(" · ");
  const notesLine = p.flavor_notes.join(" · ") + (p.one_liner ? ` — ${p.one_liner}` : "");
  const flavCards = p.flavor_notes.slice(0, 3);

  // 커피 정보
  const info: [string, string | null][] = [
    ["ROAST", p.roast_level],
    ["FLAVOUR", p.flavor_notes.join(" · ") || null],
    ["WEIGHT", weightTxt || null],
    ["ORIGIN", p.origin?.country ?? null],
    ["REGION", p.origin?.region ?? null],
    ["VARIETAL", p.variety],
    ["ALTITUDE", p.altitude],
    ["PROCESS", p.process],
  ];
  const infoRows = info.filter(([, v]) => v);

  // 추출 레시피
  const r = p.brew_recipe ?? {};
  const recipe: [string, string][] = [];
  if (r.espresso || r.es) recipe.push(["ESPRESSO", r.espresso ?? r.es]);
  if (r.milk) recipe.push(["MILK", r.milk]);
  if (r.filter || r.fil) recipe.push(["FILTER", r.filter ?? r.fil]);

  // FAQ (제품 데이터에서 생성 — AIEO)
  const faqs: { q: string; a: string }[] = [
    { q: `${title}은(는) 어떤 맛인가요?`, a: `${p.flavor_notes.join(" · ") || "균형 잡힌 향미"}의 특징을 지닌 ${p.roast_level || ""} 커피입니다. ${p.one_liner ?? ""}`.trim() },
    { q: "어떤 추출에 잘 어울리나요?", a: recipe.length ? `${recipe.map((x) => x[0]).join(" · ")} 등으로 안정적으로 즐기실 수 있습니다.` : "에스프레소 · 핸드드립(V60) · 콜드브루에 두루 어울립니다." },
    { q: "로스팅과 배송은 언제 되나요?", a: "경기도 가평 청평 자체 로스터리에서 매주 월·화 로스팅하여 화·수에 신선하게 발송합니다." },
    { q: "보관은 어떻게 하나요?", a: "개봉 후 밀폐하여 직사광선을 피해 상온 보관하고 2~3주 내 소비를 권장합니다." },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product", name: title, image: p.images.map((i) => i.storage_path),
        description: p.one_liner ?? p.flavor_notes.join(", "),
        brand: { "@type": "Brand", name: pBrand.name },
        additionalProperty: infoRows.map(([k, v]) => ({ "@type": "PropertyValue", name: k, value: v })),
        offers: { "@type": "Offer", priceCurrency: "KRW", price: p.minPrice, availability: "https://schema.org/InStock" },
        ...(revCount > 0 ? { aggregateRating: { "@type": "AggregateRating", ratingValue: avgRating.toFixed(1), reviewCount: revCount } } : {}),
      },
      { "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
      { "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://mtspace.coffee" },
        { "@type": "ListItem", position: 2, name: "Coffee", item: "https://mtspace.coffee/collections/all" },
        { "@type": "ListItem", position: 3, name: title },
      ] },
    ],
  };

  const pointVars = { ["--point" as string]: theme.point, ["--point-text" as string]: theme.pointText, ["--check" as string]: theme.check };
  const crumbCat = p.is_b2b_only ? "Wholesale" : "Coffee";

  return (
    <div className="mtpdp" style={pointVars}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="page">
        <div className="accent" />
        <header className="bar">
          <div className="wm">MTSPACE <span className="l">COFFEE</span></div>
          <nav className="crumb" aria-label="breadcrumb">Home / {crumbCat} / <span className="here">{title}</span></nav>
          <div className="tagline">everyday excellence</div>
        </header>

        <div className="layout">
          {/* LEFT: sticky buy rail */}
          <aside className="rail">
            <div className="imgslot" style={{ height: 264 }}>
              {p.image
                /* eslint-disable-next-line @next/next/no-img-element */
                ? <img src={p.image} alt={p.imageAlt ?? title} />
                : <div className="tag">IMAGE · 1:1</div>}
            </div>
            {p.images.length > 1 && (
              <div className="thumbs">
                {p.images.slice(0, 3).map((im, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <div className="t" key={i}><img src={im.storage_path} alt={im.alt ?? title} /></div>
                ))}
              </div>
            )}
            <div className="kicker">{typeLine}</div>
            <h1>{title}</h1>
            <div className="en">{en}{weightTxt ? ` · ${weightTxt}` : ""}</div>
            <div className="price">{p.minPrice > 0 ? formatKRW(p.minPrice) : "-"} <span className="cur">KRW</span></div>
            {!p.is_b2b_only && <div className="tax">세금 포함 · 배송비 결제 시 계산</div>}
            <div style={{ marginTop: 12 }}>
              <AddToCart
                slug={p.slug} title={title} image={p.image} label={tt.addToCart}
                variants={p.variants.map((v) => ({ id: v.id, base_price: v.base_price, option: (v.option_values as { option?: string })?.option ?? null }))}
              />
            </div>
            <div className="chips">
              {p.roast_level && <span className="chip">{p.roast_level}</span>}
              {weightTxt && <span className="chip">{weightTxt}</span>}
              <span className="chip">{(p.product_type || "COFFEE").toUpperCase()}</span>
            </div>
          </aside>

          {/* RIGHT: content */}
          <main className="content">
            <section className="hero">
              <div className="kicker">{typeLine}</div>
              <h1>{title}</h1>
              <div className="en">{en}{weightTxt ? ` · ${weightTxt}` : ""}</div>
              <div className="rule" />
              {notesLine.trim() && <div className="notes">{notesLine}</div>}
            </section>

            {p.one_liner && (
              <section className="sec first"><p className="lead">{p.one_liner}</p></section>
            )}

            {flavCards.length > 0 && (
              <section className="sec">
                <h2 className="head">Flavour Notes · 플레이버 노트</h2>
                <div className="flav">
                  {flavCards.map((n) => <div className="card" key={n}><div className="ft">{n}</div></div>)}
                </div>
              </section>
            )}

            <section className="sec">
              <h2 className="head">About MTSPACE COFFEE · 엠티스페이스 커피 소개</h2>
              <div className="about">
                <div className="txt">
                  <p>{locale === "en" ? pBrand.philosophy.en : pBrand.philosophy.ko}</p>
                  <p>{locale === "en" ? pBrand.about.en : pBrand.about.ko}</p>
                </div>
                <div className="imgslot img">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/images/about-roastery.jpg" alt="MTSPACE COFFEE 로스터리" />
                </div>
              </div>
            </section>

            {infoRows.length > 0 && (
              <section className="sec">
                <h2 className="head">Coffee Information · 커피 정보</h2>
                <div className="grid2">
                  {infoRows.map(([k, v]) => (
                    <div className="kv" key={k}><span className="k">{k}</span><span className="v">{v}</span></div>
                  ))}
                </div>
              </section>
            )}

            {recipe.length > 0 && (
              <section className="sec">
                <h2 className="head">Recommended Recipe · 추출 레시피</h2>
                {recipe.map(([k, v]) => (
                  <div className="rec" key={k}><span className="rk">{k}</span><div style={{ textAlign: "right" }}><div className="rn">{v}</div></div></div>
                ))}
              </section>
            )}

            {/* 정기구독 (B2C) — 디자인 톤 유지 */}
            {!p.is_b2b_only && p.variants[0] && (
              <section className="sec">
                <h2 className="head">Subscribe · 정기구독</h2>
                <form action={createSubscriptionAction} className="frm" style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                  <input type="hidden" name="variant_id" value={p.variants[0].id} />
                  <select name="interval"><option value="2w">2주마다</option><option value="4w">4주마다</option><option value="8w">8주마다</option></select>
                  <select name="grind"><option value="whole">홀빈</option><option value="drip">드립 분쇄</option><option value="espresso">에스프레소 분쇄</option></select>
                  <button style={{ background: "var(--ink)", color: "var(--oat)", border: "none", borderRadius: 3, padding: "9px 16px", fontSize: 12 }}>구독 신청</button>
                  <span style={{ fontSize: 10, color: "var(--faint)" }}>로그인 필요 · 마이페이지에서 관리</span>
                </form>
              </section>
            )}

            <section className="sec">
              <h2 className="head">FAQ · 자주 묻는 질문</h2>
              {faqs.map((f, i) => (
                <div className="faq" key={i}><div className="q">Q. {f.q}</div><div className="a">{f.a}</div></div>
              ))}
            </section>

            {/* 리뷰 — 디자인 톤 유지 */}
            <section className="sec" style={{ paddingBottom: 8 }}>
              <h2 className="head">Reviews · 리뷰 {revCount > 0 && <span style={{ color: "var(--point-text)" }}>★ {avgRating.toFixed(1)} ({revCount})</span>}</h2>
              {(reviews ?? []).map((rv, i) => (
                <div className="rev" key={i}>
                  <div style={{ fontSize: 12 }}><span style={{ color: "var(--point-text)" }}>{"★".repeat(rv.rating)}{"☆".repeat(5 - rv.rating)}</span> <b>{rv.title}</b> <span style={{ color: "var(--faint)", fontSize: 11 }}>{rv.author_name}</span></div>
                  {rv.body && <div className="serif" style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 4 }}>{rv.body}</div>}
                </div>
              ))}
              {revCount === 0 && <p style={{ fontSize: 12, color: "var(--faint)" }}>첫 리뷰를 남겨주세요.</p>}
              <form action={addReviewAction} className="frm" style={{ marginTop: 12, display: "grid", gap: 8, maxWidth: 460 }}>
                <input type="hidden" name="product_id" value={p.id} />
                <input type="hidden" name="slug" value={p.slug} />
                <select name="rating" defaultValue="5">{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n}점</option>)}</select>
                <input name="title" placeholder="제목" />
                <textarea name="body" placeholder="후기를 남겨주세요" rows={2} />
                <button style={{ background: "var(--ink)", color: "var(--oat)", border: "none", borderRadius: 3, padding: "9px 16px", fontSize: 12, width: "fit-content" }}>리뷰 등록 (로그인 필요)</button>
              </form>
            </section>

            <footer className="fine">
              MTSPACE COFFEE · 경기도 가평 청평 로스터리 · 매주 월·화 로스팅, 화·수 출고 · everyday excellence
              <br /><a href={`https://instagram.com/${pBrand.instagram.replace("@", "")}`} target="_blank" rel="noreferrer" style={{ color: "var(--point-text)" }}>Instagram {pBrand.instagram}</a>
            </footer>
          </main>
        </div>
      </div>
    </div>
  );
}
