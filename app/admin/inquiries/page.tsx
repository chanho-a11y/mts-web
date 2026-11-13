import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { updateInquiryAction } from "@/app/admin/inquiries/actions";
import { INQUIRY_STATUSES, STATUS_LABEL, TYPE_LABEL, isInquiryStatus, type InquiryStatus } from "@/lib/contact-inbox";

export const dynamic = "force-dynamic";

// D-166 관리자 문의함. 기본 보기는 처리 대기(신규, 보류).
type Row = {
  id: string; created_at: string; type: string | null; name: string | null; email: string;
  phone: string | null; message: string | null; status: string; admin_note: string | null; handled_at: string | null;
};

const FILTERS: { key: string; label: string; statuses: InquiryStatus[] | null }[] = [
  { key: "open", label: "처리 대기", statuses: ["new", "hold"] },
  { key: "new", label: "신규", statuses: ["new"] },
  { key: "replied", label: "회신완료", statuses: ["replied"] },
  { key: "closed", label: "종료", statuses: ["closed"] },
  { key: "duplicate", label: "중복", statuses: ["duplicate"] },
  { key: "all", label: "전체", statuses: null },
];

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", year: "2-digit", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });

const badge: Record<string, string> = {
  new: "bg-clayDeep text-white",
  hold: "bg-amber-100 text-amber-800",
  replied: "bg-neutral-200 text-neutral-700",
  closed: "bg-neutral-100 text-neutral-500",
  duplicate: "bg-neutral-100 text-neutral-400",
};

export default async function AdminInquiriesPage({ searchParams }: { searchParams: { f?: string; type?: string } }) {
  const filter = FILTERS.find((x) => x.key === searchParams.f) ?? FILTERS[0];
  const typeFilter = searchParams.type && TYPE_LABEL[searchParams.type] ? searchParams.type : null;
  const supabase = createClient();

  let q = supabase
    .from("contact_message")
    .select("id,created_at,type,name,email,phone,message,status,admin_note,handled_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (filter.statuses) q = q.in("status", filter.statuses);
  if (typeFilter) q = q.eq("type", typeFilter);
  const { data, error } = await q;
  const rows = (data ?? []) as Row[];

  const { count: openCount } = await supabase
    .from("contact_message").select("id", { count: "exact", head: true }).in("status", ["new", "hold"]);

  const href = (f: string, t: string | null) => `/admin/inquiries?f=${f}${t ? `&type=${t}` : ""}`;

  return (
    <main>
      <h1 className="mb-1 text-2xl font-bold">문의함</h1>
      <p className="mb-5 text-sm text-neutral-500">
        /contact 폼과 세금계산서 요청이 여기에 쌓입니다. 처리 대기 <b className="text-clayDeep">{openCount ?? 0}</b>건
      </p>

      <div className="mb-3 flex flex-wrap gap-2 text-sm">
        {FILTERS.map((x) => (
          <Link key={x.key} href={href(x.key, typeFilter)}
            className={`rounded-full border px-3 py-1 ${x.key === filter.key ? "bg-black text-white" : "hover:bg-neutral-100"}`}>
            {x.label}
          </Link>
        ))}
      </div>
      <div className="mb-6 flex flex-wrap gap-2 text-xs">
        <Link href={href(filter.key, null)} className={`rounded border px-2 py-0.5 ${!typeFilter ? "bg-neutral-200" : ""}`}>전체 유형</Link>
        {Object.entries(TYPE_LABEL).map(([k, v]) => (
          <Link key={k} href={href(filter.key, k)} className={`rounded border px-2 py-0.5 ${typeFilter === k ? "bg-neutral-200" : ""}`}>{v}</Link>
        ))}
      </div>

      {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700">불러오기 실패: {error.message}</p>}
      {!error && rows.length === 0 && <p className="text-sm text-neutral-500">해당하는 문의가 없습니다.</p>}

      <ul className="space-y-4">
        {rows.map((r) => {
          const st = isInquiryStatus(r.status) ? r.status : "new";
          return (
            <li key={r.id} className="rounded border p-4">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className={`rounded px-2 py-0.5 text-xs ${badge[st]}`}>{STATUS_LABEL[st]}</span>
                <span className="rounded border px-2 py-0.5 text-xs">{TYPE_LABEL[r.type || "general"] ?? r.type}</span>
                <b>{r.name || "(이름 없음)"}</b>
                <a href={`mailto:${r.email}`} className="text-clayDeep underline">{r.email}</a>
                {r.phone && <span className="text-neutral-500">{r.phone}</span>}
                <span className="ml-auto text-xs text-neutral-400">{fmt(r.created_at)}</span>
              </div>
              <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed">{r.message || "(내용 없음)"}</p>
              <form action={updateInquiryAction} className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3 text-xs">
                <input type="hidden" name="id" value={r.id} />
                <select name="status" defaultValue={st} className="rounded border px-2 py-1">
                  {INQUIRY_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                </select>
                <input name="admin_note" defaultValue={r.admin_note ?? ""} maxLength={2000} placeholder="메모(회신 내용, 후속 일정 등)"
                  className="min-w-[200px] flex-1 rounded border px-2 py-1" />
                <button className="rounded bg-black px-3 py-1 text-white">저장</button>
                {r.handled_at && <span className="text-neutral-400">처리 {fmt(r.handled_at)}</span>}
              </form>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
