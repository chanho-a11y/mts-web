"use client";
import { useState } from "react";
import Link from "next/link";
import { signUpAction } from "@/app/account/actions";
import AddressField from "@/components/address-field";
import { t, type Locale } from "@/lib/i18n";

export default function SignupForm({ error, locale = "ko" }: { error?: string; locale?: Locale }) {
  const tt = t(locale);
  const [role, setRole] = useState<"individual" | "business">("individual");
  const input = "mt-1 w-full rounded border px-3 py-2 text-sm";

  return (
    <main className="mx-auto max-w-lg px-4 py-12">
      <h1 className="text-2xl font-bold">{tt.signupTitle}</h1>
      {error && (
        <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      <div className="mt-5 flex gap-2">
        {(["individual", "business"] as const).map((r) => (
          <button key={r} type="button" onClick={() => setRole(r)}
            className={`flex-1 rounded border px-3 py-2 text-sm ${role === r ? "border-black bg-black text-white" : ""}`}>
            {r === "individual" ? tt.roleIndividual : tt.roleBusiness}
          </button>
        ))}
      </div>

      <form action={signUpAction} className="mt-5 space-y-4">
        <input type="hidden" name="role" value={role} />

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

        <button type="submit" className="w-full rounded-full bg-black py-3 text-sm text-white">{tt.signupSubmit}</button>
      </form>

      <p className="mt-4 text-center text-sm text-neutral-500">
        {tt.alreadyMember} <Link href="/account/login" className="underline">{tt.login}</Link>
      </p>
    </main>
  );
}
