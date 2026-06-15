"use client";
import { useState } from "react";
import { submitContactAction } from "@/app/contact/actions";

export default function ContactPage() {
  const [msg, setMsg] = useState<string | null>(null);
  const input = "mt-1 w-full rounded border px-3 py-2 text-sm";
  async function submit(fd: FormData) {
    const r = await submitContactAction(fd);
    setMsg(r.message);
  }
  return (
    <main className="mx-auto max-w-lg px-4 py-12">
      <h1 className="text-2xl font-bold">문의하기</h1>
      <p className="mt-2 text-sm text-neutral-500">납품·컨설팅·교육·제품 등 어떤 문의든 편하게 남겨주세요.</p>
      {msg && <p className="mt-4 rounded bg-neutral-100 p-3 text-sm">{msg}</p>}
      <form action={submit} className="mt-5 space-y-4">
        <label className="block text-sm">이름<input name="name" className={input} /></label>
        <label className="block text-sm">이메일 *<input type="email" name="email" required className={input} /></label>
        <label className="block text-sm">전화번호<input name="phone" className={input} /></label>
        <label className="block text-sm">문의 유형
          <select name="type" className={input}>
            <option value="general">일반</option><option value="wholesale">도매·납품</option>
            <option value="consulting">컨설팅</option><option value="education">교육</option><option value="product">제품</option>
          </select>
        </label>
        <label className="block text-sm">문의 내용<textarea name="message" rows={4} className={input} /></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="newsletter" /> 뉴스레터 수신 동의</label>
        <button className="w-full rounded-full bg-black py-3 text-sm text-white">보내기</button>
      </form>
    </main>
  );
}
