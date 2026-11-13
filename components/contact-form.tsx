"use client";
import { useRef, useState } from "react";
import { submitContactAction } from "@/app/contact/actions";
import { t, type Locale } from "@/lib/i18n";

export default function ContactForm({ locale = "ko", defaultType = "general" }: { locale?: Locale; defaultType?: string }) {
  const tt = t(locale);
  const [msg, setMsg] = useState<string | null>(null);
  // D-166: 중복 제출 방지. 전송 중에는 버튼을 잠그고, ref 로 연타(같은 틱 재진입)까지 막는다.
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const input = "mt-1 w-full rounded border px-3 py-2 text-sm";
  async function submit(fd: FormData) {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    try {
      const r = await submitContactAction(fd);
      setMsg(r.message);
      if (r.ok) formRef.current?.reset();
    } catch {
      setMsg(locale === "en" ? "Failed to send. Please try again." : "전송에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }
  return (
    <main className="mx-auto max-w-lg px-4 py-12">
      <h1 className="text-2xl font-bold">{tt.contactTitle}</h1>
      <p className="mt-2 text-sm text-neutral-500">{tt.contactIntro}</p>
      {msg && <p className="mt-4 rounded bg-neutral-100 p-3 text-sm">{msg}</p>}
      <form ref={formRef} action={submit} className="mt-5 space-y-4">
        {/* M-5 허니팟 — 봇 차단용. 사람에게 숨김. */}
        <input type="text" name="company_url" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
        <label className="block text-sm">{tt.name}<input name="name" className={input} /></label>
        <label className="block text-sm">{tt.email} *<input type="email" name="email" required className={input} /></label>
        <label className="block text-sm">{tt.phone}<input name="phone" className={input} /></label>
        <label className="block text-sm">{tt.inquiryType}
          <select name="type" className={input} defaultValue={defaultType}>
            <option value="general">{tt.typeGeneral}</option><option value="wholesale">{tt.typeWholesale}</option>
            <option value="consulting">{tt.typeConsulting}</option><option value="education">{tt.typeEducation}</option><option value="product">{tt.typeProduct}</option>
          </select>
        </label>
        <label className="block text-sm">{tt.message}<textarea name="message" rows={4} className={input} /></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="newsletter" /> {tt.newsletterOptIn}</label>
        <button type="submit" disabled={pending} aria-busy={pending} className="w-full rounded-full bg-black py-3 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50">
          {pending ? (locale === "en" ? "Sending..." : "보내는 중...") : tt.send}
        </button>
      </form>
    </main>
  );
}
