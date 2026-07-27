import Link from "next/link";
import { requestPasswordResetAction } from "./actions";
import { CODE_TTL_MIN } from "@/lib/password-reset";
import { getStorefrontContext } from "@/lib/storefront";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

// 1단계 — 가입 이메일 입력 → 6자리 인증코드 메일 발송
export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: { error?: string; email?: string };
}) {
  const { locale } = await getStorefrontContext();
  const tt = t(locale);
  const input = "mt-1 w-full rounded border px-3 py-2 text-sm";
  return (
    <main className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-2xl font-extrabold">{tt.forgotTitle}</h1>
      <p className="mt-2 text-sm leading-relaxed text-neutral-500">
        {tt.forgotIntro.replace("{min}", String(CODE_TTL_MIN))}
      </p>
      {searchParams.error && (
        <p className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-600">{searchParams.error}</p>
      )}
      <form action={requestPasswordResetAction} className="mt-6 space-y-4">
        <label className="block text-sm">
          {tt.email}
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            defaultValue={searchParams.email ?? ""}
            className={input}
          />
        </label>
        <button type="submit" className="w-full rounded-full bg-black py-3 text-sm text-white">
          {tt.sendCode}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-neutral-500">
        <Link href="/account/login" className="underline">
          {tt.backToLogin}
        </Link>
      </p>
    </main>
  );
}
