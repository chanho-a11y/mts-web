"use client";
import { useFormState, useFormStatus } from "react-dom";
import { subscribeNewsletterAction, type NewsletterState } from "@/app/newsletter-action";

const initial: NewsletterState = { ok: false, msg: "" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-card bg-ink px-4 py-2 text-xs text-oat transition disabled:opacity-60"
    >
      {pending ? "처리 중…" : "구독"}
    </button>
  );
}

export default function NewsletterForm() {
  const [state, formAction] = useFormState(subscribeNewsletterAction, initial);
  return (
    <div className="mb-6 max-w-sm">
      <form action={formAction} className="flex gap-2">
        <input
          type="email"
          name="email"
          required
          placeholder="뉴스레터 구독 (이메일)"
          className="flex-1 rounded-card border border-line bg-paper px-4 py-2 text-xs"
        />
        {/* 허니팟(봇 차단) — 화면·탭 이동에서 숨김 */}
        <input
          type="text"
          name="company_url"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="absolute left-[-9999px] h-0 w-0 opacity-0"
        />
        <SubmitButton />
      </form>
      {state.msg && (
        <p
          role="status"
          aria-live="polite"
          className={`mt-2 text-[11px] ${state.ok ? "text-inkSoft" : "text-red-600"}`}
        >
          {state.msg}
        </p>
      )}
    </div>
  );
}
