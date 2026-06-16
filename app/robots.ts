import type { MetadataRoute } from "next";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  const host = headers().get("host") ?? "mtspace.coffee";
  const base = `https://${host}`;
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/account"] }],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
