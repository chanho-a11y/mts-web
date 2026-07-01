import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getStorefrontContext } from "@/lib/storefront";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";
export const metadata = { title: "Coffeelog" };

export default async function CoffeelogPage() {
  const { locale } = await getStorefrontContext();
  const tt = t(locale);
  const supabase = createClient();
  const { data: posts } = await supabase
    .from("content_post")
    .select("slug,title,excerpt,published_at")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-bold">{tt.coffeelogTitle}</h1>
      {posts && posts.length > 0 ? (
        <ul className="mt-6 divide-y">
          {posts.map((p) => (
            <li key={p.slug} className="py-4">
              <Link href={`/blogs/coffeelog/${p.slug}`} className="font-medium hover:underline">{p.title}</Link>
              {p.excerpt && <p className="mt-1 text-sm text-neutral-500">{p.excerpt}</p>}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-6 text-neutral-500">{tt.coffeelogEmpty}</p>
      )}
    </main>
  );
}
