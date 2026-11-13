// JSON-LD 구조화 데이터 렌더러 (서버 컴포넌트). AIEO/SEO 용.
import { cleanLd } from "@/lib/seo-text";
export default function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  const json = Array.isArray(data) ? data : [data];
  return (
    <>
      {json.map((d, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(cleanLd(d)) }}
        />
      ))}
    </>
  );
}
