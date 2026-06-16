import { createClient } from "@/lib/supabase/server";
import CheckoutForm from "@/components/checkout-form";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({ searchParams }: { searchParams: { tip?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const tip = Math.max(0, parseInt(searchParams.tip ?? "0", 10) || 0);
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold">체크아웃</h1>
      <CheckoutForm tip={tip} email={user?.email ?? ""} />
    </main>
  );
}
