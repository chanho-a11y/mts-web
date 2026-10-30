// 관리자용 유입 경로 카드(D-154). 주문 상세, 고객 상세에서 공용.
import { channelLabel, parseTouch, type Touch } from "@/lib/attribution";

function fmt(at?: string) {
  if (!at) return "-";
  return new Date(at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
}

function TouchRow({ label, t }: { label: string; t: Touch | null }) {
  if (!t) {
    return (
      <div className="border-t pt-2 first:border-t-0 first:pt-0">
        <p className="text-neutral-500">{label}</p>
        <p className="text-neutral-400">기록 없음</p>
      </div>
    );
  }
  return (
    <div className="border-t pt-2 first:border-t-0 first:pt-0">
      <p className="text-neutral-500">{label}</p>
      <p className="font-medium">{channelLabel(t.ch)} <span className="font-normal text-neutral-500">({t.src} / {t.med})</span></p>
      <p className="text-xs text-neutral-500">
        {t.cmp && <>캠페인 {t.cmp}{t.cnt ? `, 소재 ${t.cnt}` : ""}{t.trm ? `, 키워드 ${t.trm}` : ""}<br /></>}
        랜딩 <span className="font-mono">{t.lp}</span>, {fmt(t.at)}
      </p>
    </div>
  );
}

export default function AdminAttributionCard({
  title, channel, first, last, firstLabel = "첫 유입", lastLabel = "마지막 유입", note,
}: {
  title: string;
  channel: string | null | undefined;
  first: unknown;
  last: unknown;
  firstLabel?: string;
  lastLabel?: string;
  note?: string;
}) {
  const ft = parseTouch(first == null ? null : typeof first === "string" ? first : JSON.stringify(first));
  const lt = parseTouch(last == null ? null : typeof last === "string" ? last : JSON.stringify(last));
  const recorded = channel != null || ft || lt;
  return (
    <section className="rounded-card border border-line p-4 text-sm">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="font-bold">{title}</h2>
        <span className="rounded-full border px-2 py-0.5 text-xs">{recorded ? channelLabel(channel ?? lt?.ch ?? "direct") : "기록 없음"}</span>
      </div>
      {recorded ? (
        <div className="space-y-2">
          <TouchRow label={firstLabel} t={ft} />
          <TouchRow label={lastLabel} t={lt} />
        </div>
      ) : (
        <p className="text-xs text-neutral-400">유입 계측(D-154) 이전 데이터이거나 쿠키가 차단된 방문입니다.</p>
      )}
      {note && <p className="mt-2 text-xs text-neutral-400">{note}</p>}
    </section>
  );
}
