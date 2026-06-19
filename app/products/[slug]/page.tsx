import { notFound } from "next/navigation";
import Image from "next/image";
import type { Metadata } from "next";
import { getStorefrontContext } from "@/lib/storefront";
import { getProductBySlug } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { BRANDS } from "@/lib/brands";
import { formatKRW, t } from "@/lib/i18n";
import AddToCart from "@/components/add-to-cart";
import { createSubscriptionAction } from "@/app/products/subscribe-action";
import { addReviewAction } from "@/app/products/review-action";
import { pointColor } from "@/lib/point-color";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const p = await getProductBySlug(params.slug);
  if (!p) return {};
  return {
    title: p.title_ko,
    description: p.one_liner ?? p.flavor_notes.join(", "),
    openGraph: { title: p.title_ko, images: p.image ? [p.image] : [] },
  };
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const { locale, brand } = await getStorefrontContext();
  const tt = t(locale);
  const p = await getProductBySlug(params.slug);
  if (!p) notFound();

  // 리뷰
  const supabase = createClient();
  const { data: reviews } = await supabase
    .from("review")
    .select("rating,title,body,author_name,created_at")
    .eq("product_id", p.id)
    .eq("status", "published")
    .order("created_at", { ascending: false });
  const revCount = reviews?.length ?? 0;
  const avgRating = revCount ? (reviews!.reduce((s, r) => s + r.rating, 0) / revCount) : 0;

  // 제품 브랜드 (놈코어/엠티스페이스) — 상세에서 표기할 브랜드
  const isNormcore = p.title_ko.toLowerCase().includes("normcore");
  const pBrand = isNormcore ? BRANDS.normcore : BRANDS.mtspace;
  const title = locale === "en" && p.title_en ? p.title_en : p.title_ko;

  // 양식(템플릿) 설정: 섹션 순서·강조색·폰트 (관리자 /admin/templates)
  let detailOrder = "";
  let detailAccent = "";
  let detailFont = "";
  try {
    const { data: b } = await supabase.from("brand").select("id").eq("code", pBrand.code).maybeSingle();
    if (b) {
      const { data: st } = await supabase.from("site_setting").select("key,value").eq("brand_id", b.id)
        .in("key", ["detail_section_order", "detail_accent", "detail_font"]);
      const m = Object.fromEntries((st ?? []).map((r) => [r.key, r.value ?? ""]));
      detailOrder = m.detail_section_order ?? "";
      detailAccent = m.detail_accent ?? "";
      detailFont = m.detail_font ?? "";
    }
  } catch {}
  const key = detailAccent || pointColor({ keyColor: p.key_color, flavorNotes: p.flavor_notes, roast: p.roast_level });

  // JSON-LD (SEO/AIEO)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: title,
    image: p.images.map((i) => i.storage_path),
    description: p.one_liner ?? p.flavor_notes.join(", "),
    brand: { "@type": "Brand", name: pBrand.name },
    offers: {
      "@type": "Offer",
      priceCurrency: "KRW",
      price: p.minPrice,
      availability: "https://schema.org/InStock",
    },
    ...(revCount > 0 ? { aggregateRating: { "@type": "AggregateRating", ratingValue: avgRating.toFixed(1), reviewCount: revCount } } : {}),
  };

  const info: [string, string | null][] = [
    [tt.origin, p.origin?.country ?? p.producer ?? null],
    [tt.variety, p.variety],
    [tt.process, p.process],
    [tt.flavor, p.flavor_notes.join(", ") || null],
    [tt.roast, p.roast_level],
    [tt.weight, p.weight_g ? `${p.weight_g}g` : null],
  ];

  // 섹션 정의 (키별) — 양식 설정(/admin/templates)으로 순서/표시 제어
  const sections: Record<string, React.ReactNode> = {
    hero: (
      <section className="relative h-[60vh] min-h-[360px] w-full overflow-hidden bg-neutral-900">
        {p.image && (
          <Image src={p.image} alt={p.imageAlt ?? title} fill priority className="object-cover opacity-80" sizes="100vw" />
        )}
        <div className="absolute inset-0 flex flex-col justify-end p-8 text-oat"
          style={{ background: `linear-gradient(to top, ${key}e6, transparent 72%)` }}>
          <p className="mb-2 flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-oat/90">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: key }} />
            {p.is_b2b_only ? "WHOLESALE" : "SINGLE ORIGIN"}{p.origin?.country ? ` · ${p.origin.country}` : ""}
          </p>
          <h1 className="max-w-3xl text-3xl font-extrabold tracking-tight md:text-5xl">{title}</h1>
          {p.flavor_notes.length > 0 && (
            <p className="prose-serif mt-2 text-base italic text-oat/95 md:text-lg">{p.flavor_notes.join(" · ")}</p>
          )}
        </div>
      </section>
    ),
    subscribe: (!p.is_b2b_only && p.variants[0]) ? (
      <section className="mx-auto max-w-3xl px-4 pt-4">
        <form action={createSubscriptionAction} className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed p-4 text-sm">
          <input type="hidden" name="variant_id" value={p.variants[0].id} />
          <span className="font-medium">정기구독</span>
          <select name="interval" className="rounded border px-2 py-1">
            <option value="2w">2주마다</option><option value="4w">4주마다</option><option value="8w">8주마다</option>
          </select>
          <select name="grind" className="rounded border px-2 py-1">
            <option value="whole">홀빈</option><option value="drip">드립 분쇄</option><option value="espresso">에스프레소 분쇄</option>
          </select>
          <button className="rounded-full border px-4 py-1.5">구독 신청</button>
          <span className="text-xs text-neutral-400">로그인 필요 · 마이페이지에서 관리</span>
        </form>
      </section>
    ) : null,
    oneliner: p.one_liner ? (
      <section className="mx-auto max-w-3xl px-4 py-12 text-center">
        <p className="prose-serif text-2xl italic text-clayDeep">{p.one_liner}</p>
      </section>
    ) : null,
    buy: (
      <section className="mx-auto max-w-3xl px-4">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-line bg-paper p-5 shadow-card">
          <div>
            <p className="text-2xl font-extrabold text-ink">{p.minPrice > 0 ? formatKRW(p.minPrice) : "-"}</p>
            {p.weight_g ? <p className="font-mono text-[11px] uppercase tracking-wider text-inkSoft">NET {p.weight_g}g</p> : null}
            {p.is_b2b_only && <p className="text-xs text-inkSoft">{tt.wholesaleOnly}</p>}
          </div>
          <AddToCart
            slug={p.slug}
            title={title}
            image={p.image}
            label={tt.addToCart}
            variants={p.variants.map((v) => ({
              id: v.id,
              base_price: v.base_price,
              option: (v.option_values as { option?: string })?.option ?? null,
            }))}
          />
        </div>
      </section>
    ),
    info: (
      <section className="mx-auto max-w-3xl px-4 py-12">
        <h2 className="mb-4 border-l-4 pl-3 text-lg font-bold" style={{ borderColor: key }}>{tt.coffeeInfo}</h2>
        <dl className="divide-y divide-line text-sm">
          {info.map(([k, v]) => (
            <div key={k} className="flex gap-4 py-2.5">
              <dt className="w-28 shrink-0 font-mono text-[11px] uppercase tracking-wider text-inkSoft">{k}</dt>
              <dd className="font-medium text-ink">{v ?? "-"}</dd>
            </div>
          ))}
        </dl>
      </section>
    ),
    brand: (
      <section className="mt-grid bg-sand py-16 text-center">
        <div className="mx-auto max-w-2xl px-4">
          <p className="mt-wordmark text-xl text-ink">MTSPACE<span className="light"> COFFEE</span></p>
          <p className="prose-serif mt-4 text-[17px] text-ink/85">{locale === "en" ? pBrand.philosophy.en : pBrand.philosophy.ko}</p>
          <p className="mt-3 text-sm text-inkSoft">{locale === "en" ? pBrand.about.en : pBrand.about.ko}</p>
        </div>
      </section>
    ),
    recipe: (
      <section className="mx-auto max-w-3xl px-4 py-12">
        <h2 className="mb-4 border-l-4 pl-3 text-lg font-bold" style={{ borderColor: key }}>{tt.recipe}</h2>
        {p.brew_recipe && Object.keys(p.brew_recipe).length > 0 ? (
          <pre className="whitespace-pre-wrap text-sm text-neutral-700">{JSON.stringify(p.brew_recipe, null, 2)}</pre>
        ) : (
          <p className="text-sm text-neutral-500">
            {p.roast_level ? `${p.roast_level} 로스트 · ` : ""}에스프레소 · 핸드드립(V60) · 콜드브루 추천
          </p>
        )}
      </section>
    ),
    more: p.body_html ? (
      <section className="mx-auto max-w-3xl px-4 pb-12">
        <h2 className="mb-4 border-l-4 pl-3 text-lg font-bold" style={{ borderColor: key }}>{tt.moreInfo}</h2>
        <div className="prose-sm text-sm leading-relaxed text-neutral-700"
          dangerouslySetInnerHTML={{ __html: p.body_html }} />
      </section>
    ) : null,
    reviews: (
      <section className="mx-auto max-w-3xl px-4 pb-12">
        <h2 className="mb-4 border-l-4 pl-3 text-lg font-bold" style={{ borderColor: key }}>
          리뷰 {revCount > 0 && <span className="text-sm font-normal text-neutral-500">★ {avgRating.toFixed(1)} ({revCount})</span>}
        </h2>
        <div className="space-y-3">
          {(reviews ?? []).map((r, i) => (
            <div key={i} className="rounded-lg border p-3 text-sm">
              <div className="flex items-center gap-2">
                <span style={{ color: key }}>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                <span className="font-medium">{r.title}</span>
                <span className="text-xs text-neutral-400">{r.author_name}</span>
              </div>
              {r.body && <p className="mt-1 text-neutral-600">{r.body}</p>}
            </div>
          ))}
          {revCount === 0 && <p className="text-sm text-neutral-400">첫 리뷰를 남겨주세요.</p>}
        </div>
        <form action={addReviewAction} className="mt-4 space-y-2 rounded-lg border p-4">
          <input type="hidden" name="product_id" value={p.id} />
          <input type="hidden" name="slug" value={p.slug} />
          <div className="flex items-center gap-2 text-sm">
            <span>평점</span>
            <select name="rating" defaultValue="5" className="rounded border px-2 py-1">
              {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n}점</option>)}
            </select>
          </div>
          <input name="title" placeholder="제목" className="w-full rounded border px-3 py-2 text-sm" />
          <textarea name="body" placeholder="후기를 남겨주세요" rows={2} className="w-full rounded border px-3 py-2 text-sm" />
          <button className="rounded-full border px-4 py-1.5 text-sm">리뷰 등록 (로그인 필요)</button>
        </form>
      </section>
    ),
    social: (
      <section className="mx-auto max-w-3xl px-4 pb-20 text-sm">
        <a href={`https://instagram.com/${pBrand.instagram.replace("@", "")}`} target="_blank" rel="noreferrer"
          className="underline" style={{ color: key }}>
          Instagram {pBrand.instagram}
        </a>
      </section>
    ),
  };

  const DEFAULT_ORDER = ["hero", "subscribe", "oneliner", "buy", "info", "brand", "recipe", "more", "reviews", "social"];
  const parsed = detailOrder
    ? detailOrder.split(/[\n,]+/).map((s) => s.trim()).filter((k) => DEFAULT_ORDER.includes(k))
    : [];
  const order = parsed.length ? parsed : DEFAULT_ORDER;

  return (
    <main style={{ ["--key" as string]: key, fontFamily: detailFont || undefined }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {order.map((k) => <div key={k}>{sections[k]}</div>)}
    </main>
  );
}
