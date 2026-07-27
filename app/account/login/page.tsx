import Link from "next/link";
import { signInAction } from "@/app/account/actions";
import { getStorefrontContext } from "@/lib/storefront";
import { t } from "@/lib/i18n";
import KakaoLoginButton from "@/components/kakao-login-button";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  const { locale } = await getStorefrontContext();
  const tt = t(locale);
  const input = "mt-1 w-full rounded border px-3 py-2 text-sm";
  // 카카오 로그인은 Supabase Provider 설정 완료 후 플래그로 활성화 (NEXT_PUBLIC_KAKAO_LOGIN_ENABLED=1)
  const kakaoEnabled = process.env.NEXT_PUBLIC_KAKAO_LOGIN_ENABLED === "1";
  return (
    <main className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-2xl font-bold">{tt.loginTitle}</h1>
      {searchParams.error && (
        <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-600">{searchParams.error}</p>
      )}

      {kakaoEnabled && (
        <>
          <div className="mt-5">
            <KakaoLoginButton label={tt.continueWithKakao} next="/account" />
          </div>
          <div className="my-5 flex items-center gap-3 text-xs text-neutral-400">
            <span className="h-px flex-1 bg-neutral-200" />
            {tt.orDivider}
            <span className="h-px flex-1 bg-neutral-200" />
          </div>
        </>
      )}

      <form action={signInAction} className={kakaoEnabled ? "space-y-4" : "mt-5 space-y-4"}>
        <label className="block text-sm">{tt.email}<input type="email" name="email" required className={input} /></label>
        <label className="block text-sm">{tt.password}<input type="password" name="password" required className={input} /></label>
        <button type="submit" className="w-full rounded-full bg-black py-3 text-sm text-white">{tt.login}</button>
      </form>
      <p className="mt-4 text-center text-sm text-neutral-500">
        <Link href="/account/forgot" className="underline">{tt.forgotPassword}</Link>
      </p>
      <p className="mt-2 text-center text-sm text-neutral-500">
        {tt.newHere} <Link href="/account/signup" className="underline">{tt.signup}</Link>
      </p>
    </main>
  );
}
