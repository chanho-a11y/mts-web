"use client";
import { useEffect, useRef } from "react";
import { trackMeta } from "@/lib/meta-pixel";

// 상품 상세 진입 시 Meta Pixel ViewContent. content_ids 는 피드 g:id 와 같은 slug.
export default function MetaViewContent({ slug, name, value }: { slug: string; name: string; value: number }) {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current || !slug) return;
    fired.current = true;
    trackMeta("ViewContent", {
      content_ids: [slug],
      content_type: "product",
      content_name: name,
      contents: [{ id: slug, quantity: 1 }],
      value: value > 0 ? value : undefined,
      currency: "KRW",
    });
  }, [slug, name, value]);
  return null;
}
