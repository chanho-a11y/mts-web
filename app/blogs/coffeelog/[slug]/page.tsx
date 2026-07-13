import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sanitizeHtml } from "@/lib/sanitize";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const { data } = await supabase
    .from("content_post").select("title,excerpt,seo_title,seo_description,cover_image").eq("slug", params.slug).maybeSingle();
  const title = data?.seo_title || data?.title || "Coffeelog";
  const description = data?.seo_description || data?.excerpt || undefined;
  return {
    title,
    description,
    alternates: { canonical: `/blogs/coffeelog/${params.slug}` },
    openGraph: { title, description, type: "article", ...(data?.cover_image ? { images: [data.cover_image] } : {}) },
  };
}

export default async function CoffeelogPostPage({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const { data: post } = await supabase
    .from("content_post")
    .select("title,body_html,excerpt,cover_image,author,tags,published_at,status")
    .eq("slug", params.slug)
    .maybeSingle();
  if (!post || post.status !== "published") notFound();

  // E-E-A-T 저자(실명 홍찬호 + 약력) — 발행 페이지 공통 정본
  const AUTHOR = {
    name: "홍찬호",
    role: "MTSPACE COFFEE 대표 · 경쟁 바리스타",
    bio: "한·호주 스페셜티 커피 경쟁 바리스타(입상 14회). 그린빈 QA·로스팅·카페 운영 실무를 바탕으로 MTSPACE COFFEE를 운영합니다.",
    url: "https://mtspace.coffee/about",
  };
  const authorName = post.author && post.author !== "통합 스튜디오" ? post.author : AUTHOR.name;
  const pageUrl = `https://mtspace.coffee/blogs/coffeelog/${params.slug}`;
  const dateModified = post.published_at; // 갱신 시 dateModified 관리(P2)

  // 본문에서 FAQ(Q./답변) 추출 → FAQPage 스키마(AIEO 인용 대상)
  const strip = (s: string) => s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const faqEntities: { "@type": "Question"; name: string; acceptedAnswer: { "@type": "Answer"; text: string } }[] = [];
  const faqRe = /<p>\s*<strong>\s*Q\.\s*([\s\S]*?)<\/strong>\s*(?:<br\s*\/?>)?\s*([\s\S]*?)<\/p>/gi;
  let m: RegExpExecArray | null;
  while ((m = faqRe.exec(post.body_html || "")) !== null) {
    const q = strip(m[1]); const a = strip(m[2]);
    if (q && a) faqEntities.push({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } });
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: post.title,
        image: post.cover_image ? [post.cover_image] : undefined,
        author: { "@type": "Person", name: authorName, jobTitle: "대표 · 경쟁 바리스타", worksFor: { "@type": "Organization", name: "MTSPACE COFFEE" }, url: AUTHOR.url },
        datePublished: post.published_at,
        dateModified,
        publisher: { "@type": "Organization", name: "MTSPACE COFFEE", url: "https://mtspace.coffee" },
        mainEntityOfPage: { "@type": "WebPage", "@id": pageUrl },
      },
      ...(faqEntities.length ? [{ "@type": "FAQPage", mainEntity: faqEntities }] : []),
    ],
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Link href="/blogs/coffeelog" className="text-sm text-neutral-500 hover:underline">← Coffeelog</Link>
      <h1 className="mt-3 text-3xl font-bold leading-tight">{post.title}</h1>
      <div className="mt-3 border-l-2 border-neutral-200 pl-3 text-sm text-neutral-500">
        <p><span className="font-semibold text-neutral-700">{authorName}</span> · {AUTHOR.role}
          {post.published_at && <span> · {new Date(post.published_at).toLocaleDateString("ko-KR")}</span>}
        </p>
        <p className="mt-0.5 text-xs text-neutral-400">{AUTHOR.bio}</p>
      </div>
      {post.cover_image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.cover_image} alt={post.title} className="mt-6 aspect-[3/2] w-full rounded-xl object-cover" />
      )}
      <article
        className="prose prose-neutral mt-8 max-w-none leading-relaxed [&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-bold [&_li]:ml-5 [&_li]:list-disc [&_p]:mt-3"
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.body_html) }}
      />
      {post.tags && post.tags.length > 0 && (
        <div className="mt-8 flex flex-wrap gap-2">
          {post.tags.map((t: string) => <span key={t} className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-600">#{t}</span>)}
        </div>
      )}
    </main>
  );
}
