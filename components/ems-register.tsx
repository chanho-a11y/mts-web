"use client";
// D-174: 해외 주문 EMS 운송장 입력 (관리자 주문 상세)
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { registerEmsAction } from "@/app/admin/orders/ems/actions";
import { isEmsNo, normalizeEmsNo } from "@/lib/tracking";

export default function EmsRegister({ orderId, notified }: { orderId: string; notified: boolean }) {
  const [no, setNo] = useState("");
  const [sendMail, setSendMail] = useState(true);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const valid = isEmsNo(no);

  const submit = () => {
    if (!valid || pending) return;
    start(async () => {
      const r = await registerEmsAction({ orderId, emsNo: no, sendMail });
      setMsg({ ok: r.ok, text: r.message });
      if (r.ok) { setNo(""); router.refresh(); }
    });
  };

  return (
    <div className="mt-3 border-t pt-2 text-xs">
      <p className="mb-1 font-bold">EMS 운송장 등록 (해외 주문)</p>
      <div className="flex gap-2">
        <input
          value={no}
          onChange={(e) => setNo(normalizeEmsNo(e.target.value))}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          placeholder="EE123456789KR"
          maxLength={20}
          className="w-full rounded border px-2 py-1 font-mono uppercase"
          aria-label="EMS 운송장번호"
        />
        <button
          onClick={submit}
          disabled={!valid || pending}
          className="shrink-0 rounded-full bg-ink px-3 py-1 text-white disabled:opacity-40"
        >
          {pending ? "등록 중" : "등록"}
        </button>
      </div>
      {no && !valid && <p className="mt-1 text-neutral-400">영문 2자, 숫자 9자, 영문 2자(13자리) 형식으로 입력해 주세요.</p>}
      {!notified && (
        <label className="mt-1 flex items-center gap-1 text-neutral-500">
          <input type="checkbox" checked={sendMail} onChange={(e) => setSendMail(e.target.checked)} />
          등록과 함께 고객에게 영문 출고 메일 보내기
        </label>
      )}
      {msg && <p className={`mt-1 ${msg.ok ? "text-green-700" : "text-red-600"}`}>{msg.text}</p>}
    </div>
  );
}
