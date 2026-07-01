import Link from "next/link";
import { signInAction } from "@/app/account/actions";
import { getStorefrontContext } from "@/lib/storefront";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  const { locale } = await getStorefrontContext();
  const tt = t(locale);
  const input = "mt-1 w-full rounded border px-3 py-2 text-sm";
  return (
    <main className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-2xl font-bold">{tt.loginTitle}</h1>
      {searchParams.error && (
        <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-600">{searchParams.error}</p>
      )}
      <form action={signInAction} className="mt-5 space-y-4">
        <label className="block text-sm">{tt.email}<input type="email" name="email" required className={input} /></label>
        <label className="block text-sm">{tt.password}<input type="password" name="password" required className={input} /></label>
        <button type="submit" className="w-full rounded-full bg-black py-3 text-sm text-white">{tt.login}</button>
      </form>
      <p className="mt-4 text-center text-sm text-neutral-500">
        {tt.newHere} <Link href="/account/signup" className="underline">{tt.signup}</Link>
      </p>
    </main>
  );
}
