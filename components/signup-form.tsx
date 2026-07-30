"use client";
import { useState } from "react";
import Link from "next/link";
import { signUpAction } from "@/app/account/actions";
import AddressField from "@/components/address-field";
import KakaoLoginButton from "@/components/kakao-login-button";
import TurnstileWidget from "@/components/turnstile-widget";
import { t, type Locale } from "@/lib/i18n";

export default function SignupForm(
  { error, locale = "ko", formToken = "" }: { error?: string; locale?: Locale; formToken?: string },
) {
  const tt = t(locale);
  const [role, setRole] = useState<"individual" | "business">("individual");
  const input = "mt-1 w-full rounded border px-3 py-2 text-sm";
  // 카카오 간편가입은 Supabase Provider 설정 완료 후 플래그로 활성화 (NEXT_PUBLIC_KAKAO_LOGIN_ENABLED=1)
  const kakaoEnabled = process.env.NEXT_PUBLIC_KAKAO_LOGIN_ENABLED === "1";

  return (
    <main className="mx-auto max-w-lg px-4 py-12">
      <h1 className="text-2xl font-bold">{tt.signupTitle}</h1>
      {error && (
        <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      {kakaoEnabled && (
        <>
          <div className="mt-5">
            <KakaoLoginButton label={tt.continueWithKakao} next="/account" />
            <p className="mt-2 text-center text-xs text-neutral-500">{tt.kakaoIndividualNote}</p>
          </div>
          <div className="my-5 flex items-center gap-3 text-xs text-neutral-400">
            <span className="h-px flex-1 bg-neutral-200" />
            {tt.orDivider}
            <span className="h-px flex-1 bg-neutral-200" />
          </div>
        </>
      )}

      <div className={kakaoEnabled ? "flex gap-2" : "mt-5 flex gap-2"}>
        {(["individual", "business"] as const).map((r) => (
          <button key={r} type="button" onClick={() => setRole(r)}
            className={`flex-1 rounded border px-3 py-2 text-sm ${role === r ? "border-black bg-black text-white" : ""}`}>
            {r === "individual" ? tt.roleIndividual : tt.roleBusiness}
          </button>
        ))}
      </div>

      <form action={signUpAction} className="mt-5 space-y-4">
        <input type="hidden" name="role" value={role} />

        {/* D-097 봇 차단 ① 허니팟 — 화면·스크린리더·탭 이동에서 모두 제외되므로 사람은 채울 수 없다.
            자동 입력 봇은 name="website" 를 채우고, 서버가 그것만 보고 거절한다. */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
          <label>
            Website
            <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
          </label>
        </div>

        {/* D-097 봇 차단 ② 제출 속도 — 서버 발급 HMAC 서명 토큰(위조 불가). 렌더 후 최소 3초. */}
        <input type="hidden" name="fts" value={formToken} />

        <label className="block text-sm">{tt.name} *<input name="name" required className={input} /></label>
        <label className="block text-sm">{tt.phone} *<input name="phone" required className={input} /></label>
        <label className="block text-sm">{tt.email} *<input type="email" name="email" required className={input} /></label>
        <label className="block text-sm">{tt.password} *<input type="password" name="password" required minLength={8} className={input} /></label>

        <fieldset className="rounded border p-3">
          <legend className="px-1 text-sm font-medium">{tt.address}</legend>
          <AddressField locale={locale} />
        </fieldset>

        <label className="block text-sm">{tt.language}
          <select name="language" className={input}><option value="ko">{tt.langKo}</option><option value="en">{tt.langEn}</option></select>
        </label>

        {role === "business" && (
          <fieldset className="space-y-3 rounded border p-3">
            <legend className="px-1 text-sm font-medium">{tt.bizInfoApproval}</legend>
            <label className="block text-sm">{tt.companyName} *<input name="company_name" required className={input} /></label>
            <label className="block text-sm">{tt.bizRegNo} *<input name="biz_reg_no" required className={input} /></label>
            <label className="block text-sm">{tt.representative}<input name="representative" className={input} /></label>
            <label className="block text-sm">{tt.taxInvoiceEmail}<input name="tax_invoice_email" className={input} /></label>
            <label className="block text-sm">{tt.bizRegFile}
              <input type="file" name="biz_reg_file" required accept=".pdf,image/png,image/jpeg,image/webp"
                className="mt-1 w-full rounded border px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-neutral-100 file:px-3 file:py-1 file:text-sm" />
            </label>
            <p className="text-xs text-neutral-500">{tt.bizRegFileNote}</p>
          </fieldset>
        )}

        <fieldset className="space-y-2 rounded border p-3">
          <legend className="px-1 text-sm font-medium">{tt.securityQuestions}</legend>
          {[1, 2, 3].map((i) => (
            <div key={i} className="grid grid-cols-2 gap-2">
              <input name={`sq${i}`} placeholder={`${tt.questionN} ${i}`} className="rounded border px-3 py-2 text-sm" />
              <input name={`sa${i}`} placeholder={`${tt.answerN} ${i}`} className="rounded border px-3 py-2 text-sm" />
            </div>
          ))}
        </fieldset>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="marketing" /> {tt.marketingOptIn}
        </label>

        {/* 봇 가입 차단 (D-091) — 사이트 키 미설정 시 렌더되지 않음 */}
        <TurnstileWidget locale={locale} />

        <button type="submit" className="w-full rounded-full bg-black py-3 text-sm text-white">{tt.signupSubmit}</button>
      </form>

      <p className="mt-4 text-center text-sm text-neutral-500">
        {tt.alreadyMember} <Link href="/account/login" className="underline">{tt.login}</Link>
      </p>
    </main>
  );
}
