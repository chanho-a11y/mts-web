import { headers } from "next/headers";
import { brandForHost } from "@/lib/brands";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// P0 home placeholder — verifies brand routing + Supabase (DB) wiring.
export default async function Home() {
  const h = headers();
  const brand = brandForHost(h.get("host"));
  const locale = h.get("x-locale") ?? "ko";

  let categories: { slug: string; name_ko: string; name_en: string | null }[] = [];
  let dbStatus = "ok";
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("category")
      .select("slug, name_ko, name_en")
      .order("position");
    if (error) dbStatus = `error: ${error.message}`;
    categories = data ?? [];
  } catch (e) {
    dbStatus = `exception: ${String(e)}`;
  }

  return (
    <main style={{ maxWidth: 880, margin: "0 auto", padding: "64px 24px" }}>
      <p style={{ letterSpacing: "0.3em", fontSize: 12, textTransform: "uppercase" }}>
        everyday excellence
      </p>
      <h1 style={{ fontSize: 44, margin: "8px 0 4px" }}>{brand.name}</h1>
      <p style={{ opacity: 0.7 }}>
        {brand.audience.toUpperCase()} · {brand.domain} · locale: {locale}
      </p>

      <section style={{ marginTop: 40 }}>
        <h2 style={{ fontSize: 22 }}>Categories (from Supabase)</h2>
        <p style={{ fontSize: 13, opacity: 0.6 }}>DB: {dbStatus}</p>
        <ul style={{ marginTop: 12, lineHeight: 1.9 }}>
          {categories.map((c) => (
            <li key={c.slug}>
              {c.name_ko} <span style={{ opacity: 0.5 }}>/ {c.name_en} ({c.slug})</span>
            </li>
          ))}
        </ul>
      </section>

      <footer style={{ marginTop: 64, fontSize: 12, opacity: 0.6 }}>
        (주)엠티에스솔루션스 · {brand.instagram} · P0 scaffold
      </footer>
    </main>
  );
}
