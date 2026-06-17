import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const { data } = await supabase
    .from("content_post").select("title,excerpt,seo_title,seo_description").eq("slug", params.slug).maybeSingle();
  return {
    title: data?.seo_title || data?.title || "Coffeelog",
    description: data?.seo_description || data?.excerpt || undefined,
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

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    image: post.cover_image ? [post.cover_image] : undefined,
    author: { "@type": "Organization", name: post.author || "MTSPACE COFFEE" },
    datePublished: post.published_at,
    publisher: { "@type": "Organization", name: "MTSPACE COFFEE" },
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Link href="/blogs/coffeelog" className="text-sm text-neutral-500 hover:underline">← Coffeelog</Link>
      <h1 className="mt-3 text-3xl font-bold leading-tight">{post.title}</h1>
      <p className="mt-2 text-sm text-neutral-500">
        {post.author && <span>{post.author}</span>}
        {post.published_at && <span> · {new Date(post.published_at).toLocaleDateString("ko-KR")}</span>}
      </p>
      {post.cover_image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.cover_image} alt={post.title} className="mt-6 aspect-[3/2] w-full rounded-xl object-cover" />
      )}
      <article
        className="prose prose-neutral mt-8 max-w-none leading-relaxed [&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-bold [&_li]:ml-5 [&_li]:list-disc [&_p]:mt-3"
        dangerouslySetInnerHTML={{ __html: post.body_html || "" }}
      />
      {post.tags && post.tags.length > 0 && (
        <div className="mt-8 flex flex-wrap gap-2">
          {post.tags.map((t: string) => <span key={t} className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-600">#{t}</span>)}
        </div>
      )}
    </main>
  );
}
