import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "자주 묻는 질문 (FAQ)" };

const CAT_LABEL: Record<string, string> = {
  shipping: "배송", return: "교환·환불", product: "제품", wholesale: "사업자(도매)",
  order: "주문", account: "계정", general: "일반",
};

export default async function FaqPage() {
  const supabase = createClient();
  const { data: faqs } = await supabase
    .from("faq")
    .select("question,answer_html,category,position")
    .eq("status", "published")
    .order("category")
    .order("position");

  const groups = new Map<string, { question: string; answer_html: string }[]>();
  (faqs ?? []).forEach((f) => {
    if (!groups.has(f.category)) groups.set(f.category, []);
    groups.get(f.category)!.push(f);
  });

  // FAQPage JSON-LD (SEO/AIEO)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: (faqs ?? []).map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer_html.replace(/<[^>]+>/g, "") },
    })),
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <h1 className="text-2xl font-bold">자주 묻는 질문</h1>
      {[...groups.entries()].map(([cat, list]) => (
        <section key={cat} className="mt-8">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-neutral-500">{CAT_LABEL[cat] ?? cat}</h2>
          <div className="divide-y rounded-xl border">
            {list.map((f, i) => (
              <details key={i} className="group p-4">
                <summary className="cursor-pointer list-none font-medium">{f.question}</summary>
                <div className="mt-2 text-sm leading-relaxed text-neutral-700" dangerouslySetInnerHTML={{ __html: f.answer_html }} />
              </details>
            ))}
          </div>
        </section>
      ))}
      {(!faqs || faqs.length === 0) && <p className="mt-8 text-neutral-500">등록된 FAQ가 없습니다.</p>}
    </main>
  );
}
