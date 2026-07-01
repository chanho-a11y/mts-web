"use client";
import { useState } from "react";
import { submitContactAction } from "@/app/contact/actions";
import { t, type Locale } from "@/lib/i18n";

export default function ContactForm({ locale = "ko" }: { locale?: Locale }) {
  const tt = t(locale);
  const [msg, setMsg] = useState<string | null>(null);
  const input = "mt-1 w-full rounded border px-3 py-2 text-sm";
  async function submit(fd: FormData) {
    const r = await submitContactAction(fd);
    setMsg(r.message);
  }
  return (
    <main className="mx-auto max-w-lg px-4 py-12">
      <h1 className="text-2xl font-bold">{tt.contactTitle}</h1>
      <p className="mt-2 text-sm text-neutral-500">{tt.contactIntro}</p>
      {msg && <p className="mt-4 rounded bg-neutral-100 p-3 text-sm">{msg}</p>}
      <form action={submit} className="mt-5 space-y-4">
        <label className="block text-sm">{tt.name}<input name="name" className={input} /></label>
        <label className="block text-sm">{tt.email} *<input type="email" name="email" required className={input} /></label>
        <label className="block text-sm">{tt.phone}<input name="phone" className={input} /></label>
        <label className="block text-sm">{tt.inquiryType}
          <select name="type" className={input}>
            <option value="general">{tt.typeGeneral}</option><option value="wholesale">{tt.typeWholesale}</option>
            <option value="consulting">{tt.typeConsulting}</option><option value="education">{tt.typeEducation}</option><option value="product">{tt.typeProduct}</option>
          </select>
        </label>
        <label className="block text-sm">{tt.message}<textarea name="message" rows={4} className={input} /></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="newsletter" /> {tt.newsletterOptIn}</label>
        <button className="w-full rounded-full bg-black py-3 text-sm text-white">{tt.send}</button>
      </form>
    </main>
  );
}
