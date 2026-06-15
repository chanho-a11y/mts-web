"use client";
import { useState } from "react";
import Link from "next/link";
import { signUpAction } from "@/app/account/actions";
import AddressField from "@/components/address-field";

export default function SignupPage({ searchParams }: { searchParams: { error?: string } }) {
  const [role, setRole] = useState<"individual" | "business">("individual");
  const input = "mt-1 w-full rounded border px-3 py-2 text-sm";

  return (
    <main className="mx-auto max-w-lg px-4 py-12">
      <h1 className="text-2xl font-bold">회원가입</h1>
      {searchParams.error && (
        <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-600">{searchParams.error}</p>
      )}

      <div className="mt-5 flex gap-2">
        {(["individual", "business"] as const).map((r) => (
          <button key={r} type="button" onClick={() => setRole(r)}
            className={`flex-1 rounded border px-3 py-2 text-sm ${role === r ? "border-black bg-black text-white" : ""}`}>
            {r === "individual" ? "일반 회원" : "기업 회원 (사업자)"}
          </button>
        ))}
      </div>

      <form action={signUpAction} className="mt-5 space-y-4">
        <input type="hidden" name="role" value={role} />

        <label className="block text-sm">이름 *<input name="name" required className={input} /></label>
        <label className="block text-sm">전화번호 *<input name="phone" required className={input} /></label>
        <label className="block text-sm">이메일 *<input type="email" name="email" required className={input} /></label>
        <label className="block text-sm">비밀번호 *<input type="password" name="password" required minLength={8} className={input} /></label>

        <fieldset className="rounded border p-3">
          <legend className="px-1 text-sm font-medium">주소</legend>
          <AddressField />
        </fieldset>

        <label className="block text-sm">사용 언어
          <select name="language" className={input}><option value="ko">한국어</option><option value="en">English</option></select>
        </label>

        {role === "business" && (
          <fieldset className="space-y-3 rounded border p-3">
            <legend className="px-1 text-sm font-medium">사업자 정보 (승인 후 도매가 적용)</legend>
            <label className="block text-sm">상호 *<input name="company_name" className={input} /></label>
            <label className="block text-sm">사업자등록번호 *<input name="biz_reg_no" className={input} /></label>
            <label className="block text-sm">대표자명<input name="representative" className={input} /></label>
            <label className="block text-sm">세금계산서 이메일<input name="tax_invoice_email" className={input} /></label>
            <p className="text-xs text-neutral-500">※ 사업자등록증 파일 업로드는 가입 후 마이페이지에서 진행합니다.</p>
          </fieldset>
        )}

        <fieldset className="space-y-2 rounded border p-3">
          <legend className="px-1 text-sm font-medium">보안 질문 (아이디/비밀번호 찾기용)</legend>
          {[1, 2, 3].map((i) => (
            <div key={i} className="grid grid-cols-2 gap-2">
              <input name={`sq${i}`} placeholder={`질문 ${i}`} className="rounded border px-3 py-2 text-sm" />
              <input name={`sa${i}`} placeholder={`답변 ${i}`} className="rounded border px-3 py-2 text-sm" />
            </div>
          ))}
        </fieldset>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="marketing" /> 마케팅 정보 수신 동의
        </label>

        <button type="submit" className="w-full rounded-full bg-black py-3 text-sm text-white">가입하기</button>
      </form>

      <p className="mt-4 text-center text-sm text-neutral-500">
        이미 회원이신가요? <Link href="/account/login" className="underline">로그인</Link>
      </p>
    </main>
  );
}
