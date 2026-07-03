import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getStorefrontContext } from "@/lib/storefront";
import { getProductBySlug, getRelatedProducts } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { BRANDS } from "@/lib/brands";
import { formatKRW, t } from "@/lib/i18n";
import AddToCart from "@/components/add-to-cart";
import ProductCard from "@/components/product-card";
import { addReviewAction } from "@/app/products/review-action";
import { resolveTheme } from "@/lib/point-color";
import { recipeDisplay, type RecipeData } from "@/lib/recipe";

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
/* 레시피 — 메서드별 카드(레이블 디자인 참조): 포인트 헤더 + 정렬된 행 */
.mtpdp .recgrp{border:1px solid var(--hair2);border-radius:12px;overflow:hidden;margin-bottom:12px;background:var(--paper)}
.mtpdp .recgrp-h{background:var(--point);color:#fff;font-family:'IBM Plex Mono',monospace;font-size:10.5px;letter-spacing:2px;text-transform:uppercase;padding:8px 15px}
.mtpdp .recgrp-b{padding:4px 15px 6px}
.mtpdp .rec{display:flex;justify-content:space-between;align-items:baseline;gap:18px;padding:9px 0;border-bottom:1px solid var(--hair2)}
.mtpdp .recgrp-b .rec:last-child{border-bottom:none}
.mtpdp .rec .rk{font-family:'IBM Plex Mono',monospace;font-size:10.5px;letter-spacing:.6px;color:var(--mute);flex:none}
.mtpdp .rec .rn{font-family:'IBM Plex Mono',monospace;font-size:12.5px;color:var(--ink);text-align:right}
.mtpdp .rec .rc{font-size:10.5px;color:var(--faint);margin-top:2px}
.mtpdp .faq{padding:13px 0;border-bottom:1px solid var(--hair)}
.mtpdp .faq .q{font-weight:700;font-size:13.5px}
.mtpdp .faq .a{font-family:'Noto Serif KR',serif;font-weight:300;font-size:13px;line-height:1.82;color:var(--ink-soft);margin-top:7px}
.mtpdp .more{list-style:none;margin:0;padding:0}
.mtpdp .more li{position:relative;padding:11px 0 11px 26px;border-bottom:1px solid var(--hair2);font-size:13px;line-height:1.75;color:var(--ink-soft)}
.mtpdp .more li:last-child{border-bottom:none}
.mtpdp .more li::before{content:"❗";position:absolute;left:0;top:11px;font-size:12px;color:var(--point-text)}
.mtpdp .more li b{color:var(--ink);font-weight:700}
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
  const { locale, storefrontId } = await getStorefrontContext();
  const tt = t(locale);
  const p = await getProductBySlug(params.slug);
  if (!p) notFound();

  // 연관 제품 3개 — 블렌드: 블렌드2+싱글1 / 싱글: 싱글2+디카페인1(없으면 싱글로 폴백)
  const isBlend = p.categories.some((c) => c.slug === "blends");
  const related = await getRelatedProducts(storefrontId, p.slug, isBlend);

  const supabase = createClient();
  const { data: reviews } = await supabase
    .from("review").select("rating,title,body,author_name,created_at")
    .eq("product_id", p.id).eq("status", "published").order("created_at", { ascending: false });
  const revCount = reviews?.length ?? 0;
  const avgRating = revCount ? reviews!.reduce((s, r) => s + r.rating, 0) / revCount : 0;

  const isNormcore = p.title_ko.toLowerCase().includes("normcore");
  const pBrand = isNormcore ? BRANDS.normcore : BRANDS.mtspace;
  const theme = resolveTheme({ keyColor: p.key_color, labelPoint: p.label_point, flavorNotes: p.flavor_notes, roast: p.roast_level });
  const title = (locale === "en" && p.title_en ? p.title_en : p.title_ko).replace(/\[.*?\]\s*/g, "");
  const en = p.title_en ?? "";
  const weightTxt = p.weight_g ? `${p.weight_g}g` : "";

  // locale별 노출값(제품 등록 한/영 입력 정본 → 상세 반영)
  const oneLiner = (locale === "en" && p.one_liner_en ? p.one_liner_en : p.one_liner) ?? null;
  const flavorArr = (locale === "en" && p.flavor_notes_en?.length ? p.flavor_notes_en : p.flavor_notes);
  const roastTxt = (locale === "en" && p.roast_level_en ? p.roast_level_en : p.roast_level) ?? null;
  const varietyTxt = (locale === "en" && p.variety_en ? p.variety_en : p.variety) ?? null;
  const processTxt = (locale === "en" && p.process_en ? p.process_en : p.process) ?? null;
  const altitudeTxt = (locale === "en" && p.altitude_en ? p.altitude_en : p.altitude) ?? null;
  const originCountry = (locale === "en" && p.origin?.country_en ? p.origin.country_en : p.origin?.country) ?? null;

  const typeLine = [p.is_b2b_only ? "Wholesale" : (p.product_type || "Coffee"), roastTxt].filter(Boolean).join(" · ");
  const notesLine = flavorArr.join(" · ") + (oneLiner ? ` — ${oneLiner}` : "");
  const flavCards = flavorArr.slice(0, 3);

  // 커피 정보
  const info: [string, string | null][] = [
    ["ROAST", roastTxt],
    ["FLAVOUR", flavorArr.join(" · ") || null],
    ["WEIGHT", weightTxt || null],
    ["ORIGIN", originCountry],
    ["REGION", p.origin?.region ?? null],
    ["VARIETAL", varietyTxt],
    ["ALTITUDE", altitudeTxt],
    ["PROCESS", processTxt],
  ];
  const infoRows = info.filter(([, v]) => v);

  // 추출 레시피 — 구조화(recipe) 우선, 없으면 구 brew_recipe 폴백
  const recipeBlocks = recipeDisplay(p.recipe as RecipeData | null, locale);
  const r = p.brew_recipe ?? {};
  const legacyRecipe: [string, string][] = [];
  if (!recipeBlocks.length) {
    if (r.espresso || r.es) legacyRecipe.push(["ESPRESSO", r.espresso ?? r.es]);
    if (r.milk) legacyRecipe.push(["MILK", r.milk]);
    if (r.filter || r.fil) legacyRecipe.push(["FILTER", r.filter ?? r.fil]);
  }
  const hasRecipe = recipeBlocks.length > 0 || legacyRecipe.length > 0;

  // FAQ (통합 내용 — 제품별 상이 X, 브랜드 공통 답변 · AIEO)
  //  ① 추출 어울림: 블렌드(에스프레소·아메리카노·라떼) vs 싱글오리진(필터·에스프레소)
  //  ② MTSPACE 로스팅 스타일  ③ 에이징·출고일(상세 more information 참조)
  const isSingleOrigin = p.categories.some((c) => c.slug === "single-origins");
  // 로스팅 스타일 — 싱글 설명 + 블렌드 설명 + 공통 마무리를 하나로 합침(제품 공통)
  const roastingAko = "싱글 오리진의 경우 당화(sugar browning)로 향을 덧입히기보다 원두 본연의 향미를 선명하게 살리는 방향으로 로스팅해, 갓 볶은 신선한 상태에서 산지의 개성이 가장 또렷하게 살아납니다. 블렌드는 엠티스페이스만의 독창적인 캐릭터를 보여주며, 안정적인 공급을 위해 에티오피아 내추럴 커피와 에티오피아 워시드 커피를 로스팅 정도에 맞게 배합하여 제공합니다. 싱글 오리진과 블렌드 모두 언제 마셔도 훌륭한 퀄리티를 느낄 수 있도록 최적의 로스팅을 제공합니다.";
  const roastingAen = "For single origins, we roast to reveal the bean's own character rather than layering flavour through sugar browning, so the origin's personality is clearest when freshly roasted. Our blends express a character unique to MTSPACE: for consistent supply, we blend Ethiopian natural and Ethiopian washed coffees, each roasted to the right degree. Both single origins and blends are roasted to deliver excellent quality in every cup, whenever you drink them.";
  const faqs: { q: string; a: string }[] = locale === "en"
    ? [
        { q: "Which brew methods suit it best?", a: isSingleOrigin
          ? "Single origins express their origin character most clearly through filter (pour-over) and espresso."
          : "Blends are built for daily menus and perform reliably across espresso, americano, and latte." },
        { q: "What is MTSPACE COFFEE's roasting style?", a: roastingAen },
        { q: "When is it roasted and shipped, and how does aging work?", a: "We roast every Monday and Tuesday and ship on Tuesday and Wednesday. Beans settle into their fullest flavour after a short resting (aging) period — see the recommended drinking window under more information below." },
      ]
    : [
        { q: "어떤 추출에 잘 어울리나요?", a: isSingleOrigin
          ? "싱글 오리진은 필터 커피(핸드드립)와 에스프레소에서 산지 본연의 개성이 가장 또렷하게 드러납니다."
          : "블렌드는 에스프레소 · 아메리카노 · 라떼 등 데일리 메뉴에 안정적으로 어울립니다." },
        { q: "MTSPACE COFFEE의 로스팅 스타일은 어떤가요?", a: roastingAko },
        { q: "언제 로스팅·출고되며 에이징은 어떻게 하나요?", a: "매주 월·화요일 로스팅해 화·수요일에 출고합니다. 원두는 로스팅 후 짧은 에이징(숙성)을 거치면 풍미가 안정되며, 권장 음용 시점은 아래 more information을 참고해 주세요." },
      ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product", name: title, image: p.images.map((i) => i.storage_path),
        description: oneLiner ?? flavorArr.join(", "),
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
            {!p.is_b2b_only && <div className="tax">{locale === "en" ? "Tax included · shipping calculated at checkout" : "세금 포함 · 배송비 결제 시 계산"}</div>}
            <div style={{ marginTop: 12 }}>
              <AddToCart
                slug={p.slug} title={title} image={p.image} label={tt.addToCart} locale={locale}
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

            {oneLiner && (
              <section className="sec first"><p className="lead">{oneLiner}</p></section>
            )}

            {flavCards.length > 0 && (
              <section className="sec">
                <h2 className="head">{locale === "en" ? "Flavour Notes" : "Flavour Notes · 플레이버 노트"}</h2>
                <div className="flav">
                  {flavCards.map((n) => <div className="card" key={n}><div className="ft">{n}</div></div>)}
                </div>
              </section>
            )}

            <section className="sec">
              <h2 className="head">{locale === "en" ? "About MTSPACE COFFEE" : "About MTSPACE COFFEE · 엠티스페이스 커피 소개"}</h2>
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

            {(infoRows.length > 0 || hasRecipe) && (
              <section className="sec">
                <h2 className="head">{locale === "en" ? "Coffee Information" : "Coffee Information · 커피 정보"}</h2>
                {infoRows.length > 0 && (
                  <div className="grid2">
                    {infoRows.map(([k, v]) => (
                      <div className="kv" key={k}><span className="k">{k}</span><span className="v">{v}</span></div>
                    ))}
                  </div>
                )}
                {hasRecipe && (
                  <div style={{ marginTop: infoRows.length > 0 ? 22 : 0 }}>
                    <h3 className="head" style={{ margin: "0 0 12px" }}>{locale === "en" ? "Recipe" : "Recipe · 레시피"}</h3>
                    {recipeBlocks.length > 0 ? (
                      recipeBlocks.map((b) => (
                        <div className="recgrp" key={b.mode}>
                          <div className="recgrp-h">{b.title}</div>
                          <div className="recgrp-b">
                            {b.rows.map((row) => (
                              <div className="rec" key={row.label}><span className="rk">{row.label}</span><span className="rn">{row.value}</span></div>
                            ))}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="recgrp">
                        <div className="recgrp-b">
                          {legacyRecipe.map(([k, v]) => (
                            <div className="rec" key={k}><span className="rk">{k}</span><span className="rn">{v}</span></div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </section>
            )}

            <section className="sec">
              <h2 className="head">{locale === "en" ? "FAQ" : "FAQ · 자주 묻는 질문"}</h2>
              {faqs.map((f, i) => (
                <div className="faq" key={i}><div className="q">Q. {f.q}</div><div className="a">{f.a}</div></div>
              ))}
            </section>

            {/* more information — 전 제품 공통 구매·신선도·정책 안내 (정본: 월·화 로스팅 / 화·수 출고) */}
            <section className="sec" style={{ paddingBottom: 8 }}>
              <h2 className="head">{locale === "en" ? "more information" : "more information · 구매 안내"}</h2>
              {locale === "en" ? (
                <ul className="more">
                  <li>MTSPACE COFFEE is at its best when enjoyed <b>14–28 days after roasting</b>, on average.</li>
                  <li>That said, we design our coffees so their character comes through beautifully before and after that window too, depending on your brew method.</li>
                  <li>Apart from our blends (dark · medium · light), we do not roast single origins separately for espresso and filter. We prefer to express the coffee's inherent flavour rather than flavour developed through sugar browning during the roast.</li>
                  <li>We roast <b>every Monday & Tuesday</b>.</li>
                  <li>Online orders ship <b>every Tuesday & Wednesday</b>.</li>
                  <li>If an item is out of stock, it is roasted fresh on the next roast day before shipping.</li>
                  <li>In that case, please allow roughly <b>3–5 additional business days</b>.</li>
                  <li>Orders are filled with the earliest-roasted coffee first (up to 7 days after roasting). If you'd prefer a fresher batch, please leave a note with your order.</li>
                  <li>Courier: <b>Lotte Global Logistics</b></li>
                  <li>Refunds or exchanges are possible only when the contents and packaging remain intact (whole bean, not ground, unopened, undamaged).</li>
                  <li>MTSPACE COFFEE complies with consumer protection law.</li>
                </ul>
              ) : (
                <ul className="more">
                  <li>엠티스페이스 커피 제품은 평균적으로 <b>로스팅 후 14–28일</b> 구간에 사용하는 것이 가장 이상적입니다.</li>
                  <li>하지만 그 전이나 후에도 추출 방법에 따라 본연의 맛이 잘 나올 수 있게끔 디자인했습니다.</li>
                  <li>블렌드(다크·미디엄·라이트)를 제외한 싱글 오리진은 에스프레소와 필터를 별도로 로스팅하지 않습니다. 이는 엠티스페이스 커피가 추구하는 방향이 커피 고유의 향미를 표현하는 것이 로스팅 중 sugar browning에 의한 향미 표현보다 저희 취향에 더 잘 맞기 때문입니다.</li>
                  <li>엠티스페이스 커피는 <b>매주 월·화요일에 로스팅</b>합니다.</li>
                  <li>온라인 주문은 <b>매주 화·수요일에 출고</b>됩니다.</li>
                  <li>재고가 없을 시 다음 로스팅일에 새로 로스팅되어 출고됩니다.</li>
                  <li>이 경우 영업일 기준 약 <b>3–5일</b> 정도 추가 소요될 수 있습니다.</li>
                  <li>주문 후 가장 먼저 로스팅된 커피(최장 로스팅 후 7일)가 발송되며, 더 신선한 제품을 원하시면 별도의 요청사항을 남겨주세요.</li>
                  <li>택배사: <b>롯데택배</b></li>
                  <li>제품의 환불 혹은 교환은 제품의 내용물과 포장이 온전한 상태(홀빈, 분쇄없음, 미개봉, 미손상)일 때 가능합니다.</li>
                  <li>엠티스페이스 커피는 소비자 보호법을 준수합니다.</li>
                </ul>
              )}
            </section>

            {/* 리뷰 — 가장 마지막(연관 제품 위)으로 이동 */}
            <section className="sec" style={{ paddingBottom: 8 }}>
              <h2 className="head">{locale === "en" ? "Reviews" : "Reviews · 리뷰"} {revCount > 0 && <span style={{ color: "var(--point-text)" }}>★ {avgRating.toFixed(1)} ({revCount})</span>}</h2>
              {(reviews ?? []).map((rv, i) => (
                <div className="rev" key={i}>
                  <div style={{ fontSize: 12 }}><span style={{ color: "var(--point-text)" }}>{"★".repeat(rv.rating)}{"☆".repeat(5 - rv.rating)}</span> <b>{rv.title}</b> <span style={{ color: "var(--faint)", fontSize: 11 }}>{rv.author_name}</span></div>
                  {rv.body && <div className="serif" style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 4 }}>{rv.body}</div>}
                </div>
              ))}
              {revCount === 0 && <p style={{ fontSize: 12, color: "var(--faint)" }}>{tt.firstReview}</p>}
              <form action={addReviewAction} className="frm" style={{ marginTop: 12, display: "grid", gap: 8, maxWidth: 460 }}>
                <input type="hidden" name="product_id" value={p.id} />
                <input type="hidden" name="slug" value={p.slug} />
                <select name="rating" defaultValue="5">{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{locale === "en" ? `${n} ★` : `${n}점`}</option>)}</select>
                <input name="title" placeholder={tt.reviewTitlePlaceholder} />
                <textarea name="body" placeholder={tt.reviewBodyPlaceholder} rows={2} />
                <button style={{ background: "var(--ink)", color: "var(--oat)", border: "none", borderRadius: 3, padding: "9px 16px", fontSize: 12, width: "fit-content" }}>{tt.submitReview}</button>
              </form>
            </section>
          </main>
        </div>
      </div>

      {/* 연관 제품 3개 — 상세 카드 하단 (블렌드2+싱글1 / 싱글2+디카페인1→폴백싱글) */}
      {related.length > 0 && (
        <div style={{ maxWidth: 1040, margin: "28px auto 0", padding: "0 4px" }}>
          <h2 style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, letterSpacing: 2, color: "#8A8173", textTransform: "uppercase", margin: "0 0 16px" }}>
            {locale === "en" ? "You may also like" : "함께 보면 좋은 제품"}
          </h2>
          <div className="grid grid-cols-3 gap-4">
            {related.map((rp) => <ProductCard key={rp.slug} p={rp} locale={locale} />)}
          </div>
        </div>
      )}
    </div>
  );
}
