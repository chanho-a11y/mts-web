import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PromoLanding({ params }: { params: { code: string } }) {
  const supabase = createClient();
  const { data: promo } = await supabase
    .from("promotion")
    .select("title,kind,discount_type,value,banner_message,code,is_active")
    .eq("code", params.code)
    .maybeSingle();
  if (!promo || !promo.is_active) notFound();
  const disc = promo.discount_type === "percent" ? `${promo.value}%` : `${promo.value.toLocaleString()}원`;
  return (
    <main className="mx-auto max-w-2xl px-4 py-20 text-center">
      {promo.kind === "influencer" && <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">influencer partner</p>}
      <h1 className="mt-3 text-3xl font-bold">{promo.title}</h1>
      {promo.banner_message && <p className="mt-3 text-neutral-600">{promo.banner_message}</p>}
      <div className="mt-8 inline-block rounded-xl border-2 border-dashed px-8 py-5">
        <p className="text-sm text-neutral-500">할인 코드</p>
        <p className="text-2xl font-bold tracking-wider">{promo.code}</p>
        <p className="mt-1 text-sm">{disc} 할인</p>
      </div>
      <div className="mt-8">
        <Link href="/collections/all" className="rounded-full bg-black px-6 py-3 text-sm text-white">이 코드로 쇼핑하기</Link>
        <p className="mt-2 text-xs text-neutral-400">체크아웃에서 코드를 입력하면 할인이 적용됩니다.</p>
      </div>
    </main>
  );
}
