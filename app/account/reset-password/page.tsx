import Link from "next/link";
import { requestPasswordResetAction, resetPasswordAction } from "@/app/account/forgot/actions";
import { CODE_TTL_MIN } from "@/lib/password-reset";
import { getStorefrontContext } from "@/lib/storefront";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

// 2단계 — 인증코드 확인 + 새 비밀번호 설정. 메일의 버튼(?code=)으로 들어오면 코드가 자동 입력된다.
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: { email?: string; code?: string; sent?: string; error?: string };
}) {
  const { locale } = await getStorefrontContext();
  const tt = t(locale);
  const email = (searchParams.email ?? "").trim();
  const code = (searchParams.code ?? "").replace(/\D/g, "").slice(0, 6);
  const input = "mt-1 w-full rounded border px-3 py-2 text-sm";

  return (
    <main className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-2xl font-extrabold">{tt.resetTitle}</h1>
      {email ? (
        <p className="mt-2 text-sm text-neutral-500">
          <b className="text-ink">{email}</b>
          <br />
          {tt.codeSentNotice.replace("{min}", String(CODE_TTL_MIN))}
        </p>
      ) : (
        <p className="mt-2 text-sm text-neutral-500">{tt.resetNeedEmail}</p>
      )}

      {searchParams.error && (
        <p className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-600">{searchParams.error}</p>
      )}
      {!searchParams.error && searchParams.sent === "1" && (
        <p className="mt-4 rounded bg-amber-50 px-3 py-2 text-sm text-amber-700">{tt.codeSentOk}</p>
      )}

      {email ? (
        <>
          <form action={resetPasswordAction} className="mt-6 space-y-4">
            <input type="hidden" name="email" value={email} />
            <label className="block text-sm">
              {tt.verificationCode}
              <input
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={6}
                required
                defaultValue={code}
                className={`${input} text-center text-lg tracking-[0.5em]`}
              />
            </label>
            <label className="block text-sm">
              {tt.newPassword}
              <input name="password" type="password" required minLength={6} autoComplete="new-password" className={input} />
            </label>
            <label className="block text-sm">
              {tt.confirmNewPassword}
              <input name="password2" type="password" required minLength={6} autoComplete="new-password" className={input} />
            </label>
            <button type="submit" className="w-full rounded-full bg-black py-3 text-sm text-white">
              {tt.resetSubmit}
            </button>
          </form>

          <form action={requestPasswordResetAction} className="mt-3">
            <input type="hidden" name="email" value={email} />
            <input type="hidden" name="stay" value="1" />
            <button type="submit" className="w-full rounded-full border border-neutral-300 py-2.5 text-sm text-neutral-600">
              {tt.resendCode}
            </button>
          </form>
        </>
      ) : (
        <p className="mt-6">
          <Link href="/account/forgot" className="text-sm underline">
            {tt.forgotTitle}
          </Link>
        </p>
      )}

      <p className="mt-6 text-center text-sm text-neutral-500">
        <Link href="/account/login" className="underline">
          {tt.backToLogin}
        </Link>
      </p>
    </main>
  );
}
