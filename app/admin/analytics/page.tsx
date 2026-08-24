import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatKRW } from "@/lib/i18n";
import {
  REVENUE_STATUSES,
  UNPAID_STATUSES,
  PERIOD_PRESETS,
  resolvePeriod,
  isInternalOrder,
  customerTypeLabel,
} from "@/lib/analytics";
import { ga4Configured, ga4TrafficSources, ga4LandingPages, ga4ProductViews } from "@/lib/ga4";

export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────────────────────
// 집계는 대부분 DB 함수(admin_*)가 한다.
// 예전에는 orders 5,000행 + order_item 20,000행을 통째로 받아 JS 에서 접었는데,
// 거래처 단위 지표를 그 위에 얹으면 행 수가 늘수록 그대로 느려진다.
// 함수는 전부 SECURITY INVOKER + 본문 is_admin() 가드다.
//   → docs/analytics-admin-functions-20260824.sql
// ─────────────────────────────────────────────────────────────────────────────

type Tab = "overview" | "accounts" | "products" | "channels";
const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "개요" },
  { key: "accounts", label: "거래처" },
  { key: "products", label: "제품 · 가격" },
  { key: "channels", label: "채널 · 콘텐츠" },
];

interface AccountHealth {
  profile_id: string;
  account_name: string | null;
  customer_type: string | null;
  biz_status: string | null;
  approved_at: string | null;
  orders: number;
  revenue: number;
  qty: number;
  sku_count: number;
  first_at: string | null;
  last_at: string | null;
  avg_reorder_days: number | null;
  days_since_last: number | null;
  lag_ratio: number | null;
  item_revenue: number;
  cogs: number;
  cost_covered_revenue: number;
}

type Rpc = <T>(fn: string, args: Record<string, unknown>) => Promise<T[]>;

const num = (v: unknown) => (typeof v === "number" ? v : Number(v ?? 0) || 0);
const pct = (v: unknown) => (v === null || v === undefined ? "—" : `${num(v)}%`);

/** 재발주 지연 등급 — 평균 재발주 간격 대비 경과일 비율 */
function riskOf(lag: number | null): { label: string; cls: string } {
  if (lag === null || lag === undefined) return { label: "판단보류", cls: "text-neutral-400" };
  if (lag >= 2) return { label: "이탈 위험", cls: "font-semibold text-red-600" };
  if (lag >= 1.5) return { label: "경고", cls: "font-medium text-orange-600" };
  if (lag >= 1) return { label: "주의", cls: "text-amber-600" };
  return { label: "정상", cls: "text-neutral-500" };
}

/** RFM — 거래처 수가 적어 분위수는 무의미하다. 절대 기준 구간으로 시작한다. */
function rfmOf(a: AccountHealth) {
  const d = a.days_since_last;
  const r = d === null ? 0 : d <= 7 ? 5 : d <= 14 ? 4 : d <= 30 ? 3 : d <= 60 ? 2 : 1;
  const f = a.orders >= 6 ? 5 : a.orders >= 4 ? 4 : a.orders >= 3 ? 3 : a.orders >= 2 ? 2 : a.orders >= 1 ? 1 : 0;
  let seg = "미개시";
  if (f > 0) {
    if (r >= 4 && f >= 4) seg = "핵심";
    else if (r >= 4 && f >= 2) seg = "성장";
    else if (r >= 4) seg = "신규";
    else if (r === 3) seg = "주의";
    else if (r === 2) seg = "휴면";
    else seg = "이탈";
  }
  return { r, f, seg };
}

const SEG_ORDER = ["핵심", "성장", "신규", "주의", "휴면", "이탈"];

const TABLE = "w-full text-sm";
const TH = "border-b py-2 text-left font-medium text-neutral-500";

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: { preset?: string; from?: string; to?: string; tab?: string };
}) {
  const period = resolvePeriod(searchParams);
  const p_from = period.fromMs !== null ? new Date(period.fromMs).toISOString() : null;
  const p_to = period.toMs !== null ? new Date(period.toMs).toISOString() : null;
  const periodArgs = { p_from, p_to };

  const tab: Tab = TABS.find((t) => t.key === searchParams.tab)?.key ?? "overview";
  const qs = (over: { tab?: Tab; preset?: string }) => {
    const p = new URLSearchParams();
    p.set("tab", over.tab ?? tab);
    p.set("preset", over.preset ?? period.preset);
    if ((over.preset ?? period.preset) === "custom") {
      if (period.fromInput) p.set("from", period.fromInput);
      if (period.toInput) p.set("to", period.toInput);
    }
    return `/admin/analytics?${p.toString()}`;
  };

  const supabase = createClient();
  const rpc: Rpc = async <T,>(fn: string, args: Record<string, unknown>) => {
    const { data, error } = await supabase.rpc(fn, args);
    if (error) {
      console.error(`[analytics] rpc ${fn} failed:`, error.message);
      return [] as T[];
    }
    return (data ?? []) as T[];
  };

  const periodNote = <span className="text-xs font-normal text-neutral-400">({period.label})</span>;

  return (
    <main className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">분석</h1>
        <p className="mt-1 text-sm text-neutral-500">
          기준 기간 <b className="text-neutral-800">{period.label}</b> · 관리자 구분으로 기록된 테스트 주문은 모든 지표에서 제외됩니다.
        </p>
      </div>

      {/* 기간 선택 */}
      <section className="rounded-xl border bg-neutral-50 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-neutral-500">기간</span>
          {PERIOD_PRESETS.map((pr) => (
            <Link
              key={pr.key}
              href={qs({ preset: pr.key })}
              className={`rounded-full border px-3 py-1 text-xs ${
                period.preset === pr.key ? "bg-black text-white" : "bg-white hover:bg-neutral-100"
              }`}
            >
              {pr.label}
            </Link>
          ))}
        </div>
        <form method="get" action="/admin/analytics" className="mt-3 flex flex-wrap items-center gap-2">
          <input type="hidden" name="preset" value="custom" />
          <input type="hidden" name="tab" value={tab} />
          <span className="text-sm text-neutral-500">직접 선택</span>
          <input type="date" name="from" defaultValue={period.fromInput} className="rounded border px-2 py-1 text-xs" />
          <span className="text-neutral-400">~</span>
          <input type="date" name="to" defaultValue={period.toInput} className="rounded border px-2 py-1 text-xs" />
          <button type="submit" className="rounded-full bg-black px-4 py-1.5 text-xs text-white">적용</button>
          {period.preset === "custom" && (
            <Link href={qs({ preset: "all" })} className="rounded-full border bg-white px-3 py-1 text-xs hover:bg-neutral-100">
              초기화
            </Link>
          )}
        </form>
        <p className="mt-2 text-[11px] text-neutral-400">
          시작·종료일 모두 포함(KST 자정 기준). 한쪽만 입력하면 그 방향으로 열린 구간이 됩니다.
        </p>
      </section>

      {/* 탭 */}
      <nav className="flex flex-wrap gap-1 border-b">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={qs({ tab: t.key })}
            className={`-mb-px border-b-2 px-4 py-2 text-sm ${
              tab === t.key
                ? "border-black font-semibold text-black"
                : "border-transparent text-neutral-500 hover:text-neutral-800"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "overview" && <OverviewTab rpc={rpc} periodArgs={periodArgs} periodNote={periodNote} />}
      {tab === "accounts" && <AccountsTab rpc={rpc} periodArgs={periodArgs} periodNote={periodNote} />}
      {tab === "products" && <ProductsTab rpc={rpc} periodArgs={periodArgs} periodNote={periodNote} />}
      {tab === "channels" && (
        <ChannelsTab rpc={rpc} periodArgs={periodArgs} periodNote={periodNote} from={period.fromInput} to={period.toInput} />
      )}
    </main>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 개요
// ═══════════════════════════════════════════════════════════════════════════
async function OverviewTab({
  rpc,
  periodArgs,
  periodNote,
}: {
  rpc: Rpc;
  periodArgs: { p_from: string | null; p_to: string | null };
  periodNote: React.ReactNode;
}) {
  const supabase = createClient();

  // 헤더 카드·상태 분포는 주문 원장이 있어야 계산된다(함수로 덮기 애매한 소수 지표).
  let oq = supabase.from("orders").select("status,grand_total,currency,customer_type,placed_at").limit(5000);
  if (periodArgs.p_from) oq = oq.gte("placed_at", periodArgs.p_from);
  if (periodArgs.p_to) oq = oq.lt("placed_at", periodArgs.p_to);
  const { data: rawOrders } = await oq;
  const orders = (rawOrders ?? []).filter((o) => !isInternalOrder(o));
  const paidOrders = orders.filter((o) => o.currency === "KRW" && REVENUE_STATUSES.includes(o.status));
  const sales = paidOrders.reduce((s, o) => s + (o.grand_total || 0), 0);
  const aov = paidOrders.length ? Math.round(sales / paidOrders.length) : 0;
  const unpaidCount = orders.filter((o) => UNPAID_STATUSES.includes(o.status)).length;
  const byStatus = new Map<string, number>();
  orders.forEach((o) => byStatus.set(o.status, (byStatus.get(o.status) ?? 0) + 1));

  const [cost] = await rpc<any>("admin_cost_coverage", periodArgs);
  const [conc] = await rpc<any>("admin_revenue_concentration", periodArgs);
  const funnel = await rpc<any>("admin_order_funnel", { ...periodArgs, p_bucket: "week" });
  const regions = await rpc<any>("admin_region_sales", periodArgs);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card label="매출 (KRW · 결제완료+)" value={formatKRW(sales)} sub={`결제완료 ${paidOrders.length}건 / 전체 ${orders.length}건`} />
        <Card label="평균 주문금액" value={formatKRW(aov)} sub={`미결제 ${unpaidCount}건`} />
        <Card
          label="총이익 (원가 입력분)"
          value={formatKRW(num(cost?.gross_profit))}
          sub={`커버리지 ${pct(cost?.coverage_pct)} · 이익률 ${pct(cost?.margin_pct)}`}
        />
        <Card
          label="매출 집중도 (Top3)"
          value={pct(conc?.top3_pct)}
          sub={`거래처 ${num(conc?.accounts)}곳 · Top1 ${pct(conc?.top1_pct)}`}
        />
      </div>

      <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <b>이익 지표 읽는 법</b> — 원가(<code>product.cost</code>)가 입력된 제품의 매출{" "}
        {formatKRW(num(cost?.revenue_with_cost))}만으로 계산합니다. 전체 상품매출은 {formatKRW(num(cost?.item_revenue))}이고, 제품{" "}
        {num(cost?.products_with_cost)}/{num(cost?.products_total)}건에 원가가 있습니다. 커버리지가 100%가 되기 전까지 이익률은
        참고치입니다. <Link href="/admin/products" className="underline">제품 관리에서 원가 입력</Link>
      </section>

      <section>
        <h2 className="mb-1 font-bold">결제 전환율 추이 {periodNote}</h2>
        <p className="mb-3 text-xs text-neutral-400">주문 생성 → 결제완료. 주(월요일 시작) 단위 · KST.</p>
        <table className={TABLE}>
          <thead>
            <tr>
              <th className={TH}>주 시작</th>
              <th className={`${TH} text-right`}>생성</th>
              <th className={`${TH} text-right`}>만료</th>
              <th className={`${TH} text-right`}>취소</th>
              <th className={`${TH} text-right`}>결제완료</th>
              <th className={`${TH} text-right`}>전환율</th>
            </tr>
          </thead>
          <tbody>
            {funnel.map((r) => (
              <tr key={r.bucket_start} className="border-b">
                <td className="py-2">{r.bucket_start}</td>
                <td className="text-right">{r.created_total}</td>
                <td className="text-right text-neutral-500">{r.expired}</td>
                <td className="text-right text-neutral-500">{r.cancelled}</td>
                <td className="text-right">{r.paid}</td>
                <td className="text-right font-medium">{pct(r.conversion_pct)}</td>
              </tr>
            ))}
            {funnel.length === 0 && <Empty cols={6} />}
          </tbody>
        </table>
      </section>

      <div className="grid gap-8 md:grid-cols-2">
        <section>
          <h2 className="mb-3 font-bold">
            지역별 매출 <span className="text-xs font-normal text-neutral-400">(배송지 시·도 정규화)</span>
          </h2>
          <table className={TABLE}>
            <thead>
              <tr>
                <th className={TH}>지역</th>
                <th className={`${TH} text-right`}>주문</th>
                <th className={`${TH} text-right`}>매출</th>
              </tr>
            </thead>
            <tbody>
              {regions.map((r) => (
                <tr key={r.region} className="border-b">
                  <td className="py-2">{r.region}</td>
                  <td className="text-right">{r.orders}</td>
                  <td className="text-right">{formatKRW(num(r.revenue))}</td>
                </tr>
              ))}
              {regions.length === 0 && <Empty cols={3} />}
            </tbody>
          </table>
        </section>

        <section>
          <h2 className="mb-3 font-bold">주문 상태 분포 {periodNote}</h2>
          <table className={TABLE}>
            <tbody>
              {[...byStatus.entries()].map(([s, n]) => (
                <tr key={s} className="border-b">
                  <td className="py-2">{s}</td>
                  <td className="text-right">{n}</td>
                </tr>
              ))}
              {byStatus.size === 0 && <Empty cols={2} />}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 거래처
// ═══════════════════════════════════════════════════════════════════════════
async function AccountsTab({
  rpc,
  periodArgs,
  periodNote,
}: {
  rpc: Rpc;
  periodArgs: { p_from: string | null; p_to: string | null };
  periodNote: React.ReactNode;
}) {
  const [act] = await rpc<any>("admin_activation_funnel", {});
  const [lead] = await rpc<any>("admin_first_order_leadtime", {});
  const health = await rpc<AccountHealth>("admin_account_health", periodArgs);

  const ordered = health.filter((a) => a.orders > 0);
  const reorderBoard = ordered
    .filter((a) => a.lag_ratio !== null)
    .sort((a, b) => num(b.lag_ratio) - num(a.lag_ratio))
    .slice(0, 15);
  const dormant = health
    .filter((a) => a.orders === 0 && a.biz_status === "approved")
    .sort((a, b) => (a.approved_at ?? "").localeCompare(b.approved_at ?? ""));

  const segCount = new Map<string, { n: number; rev: number }>();
  ordered.forEach((a) => {
    const { seg } = rfmOf(a);
    const cur = segCount.get(seg) ?? { n: 0, rev: 0 };
    cur.n += 1;
    cur.rev += num(a.revenue);
    segCount.set(seg, cur);
  });

  const approved = num(act?.approved_accounts);
  const step = (label: string, v: number) => (
    <div className="rounded-xl border p-4">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-1 text-xl font-bold">{v}</p>
      <p className="mt-1 text-[11px] text-neutral-400">{approved ? `${Math.round((v / approved) * 1000) / 10}%` : "—"}</p>
    </div>
  );

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-1 font-bold">거래처 활성화 퍼널</h2>
        <p className="mb-3 text-xs text-neutral-400">기간과 무관한 현재 스냅샷. 승인 완료된 사업자 계정 기준.</p>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {step("승인 거래처", approved)}
          {step("첫 발주", num(act?.ordered_accounts))}
          {step("재발주 (2회+)", num(act?.repeat_accounts))}
          {step("정착 (3회+)", num(act?.settled_accounts))}
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-xs text-red-700">미개시 (승인 후 0건)</p>
            <p className="mt-1 text-xl font-bold text-red-700">{num(act?.never_ordered)}</p>
            <p className="mt-1 text-[11px] text-red-600">즉시 영업 대상</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-neutral-500">
          가입→승인 중앙값 <b>{lead?.median_signup_to_approve ?? "—"}일</b> · 승인→첫 발주 중앙값{" "}
          <b>{lead?.median_approve_to_first ?? "—"}일</b> · 승인 후 14일 넘게 미발주 <b>{num(lead?.pending_over_14d)}곳</b>
        </p>
      </section>

      <section>
        <h2 className="mb-1 font-bold">재발주 지연 보드 {periodNote}</h2>
        <p className="mb-3 text-xs text-neutral-400">
          지연율 = 마지막 발주 후 경과일 ÷ 그 거래처의 평균 재발주 간격. 1.0 미만 정상 / 1.0–1.5 주의 / 1.5–2.0 경고 / 2.0 이상 이탈
          위험. 발주 2회 이상인 거래처만 계산됩니다.
        </p>
        <div className="overflow-x-auto">
          <table className={TABLE}>
            <thead>
              <tr>
                <th className={TH}>거래처</th>
                <th className={`${TH} text-right`}>발주</th>
                <th className={`${TH} text-right`}>평균 간격</th>
                <th className={`${TH} text-right`}>경과일</th>
                <th className={`${TH} text-right`}>지연율</th>
                <th className={`${TH} text-right`}>상태</th>
                <th className={`${TH} text-right`}>매출</th>
              </tr>
            </thead>
            <tbody>
              {reorderBoard.map((a) => {
                const risk = riskOf(a.lag_ratio);
                return (
                  <tr key={a.profile_id} className="border-b">
                    <td className="py-2">{a.account_name}</td>
                    <td className="text-right">{a.orders}</td>
                    <td className="text-right">{a.avg_reorder_days ?? "—"}일</td>
                    <td className="text-right">{a.days_since_last ?? "—"}일</td>
                    <td className="text-right">{a.lag_ratio ?? "—"}</td>
                    <td className={`text-right ${risk.cls}`}>{risk.label}</td>
                    <td className="text-right">{formatKRW(num(a.revenue))}</td>
                  </tr>
                );
              })}
              {reorderBoard.length === 0 && <Empty cols={7} />}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-8 md:grid-cols-2">
        <section>
          <h2 className="mb-1 font-bold">RFM 세그먼트 {periodNote}</h2>
          <p className="mb-3 text-xs text-neutral-400">거래처 수가 적어 분위수 대신 절대 기준 구간을 씁니다(R: 7/14/30/60일).</p>
          <table className={TABLE}>
            <thead>
              <tr>
                <th className={TH}>세그먼트</th>
                <th className={`${TH} text-right`}>거래처</th>
                <th className={`${TH} text-right`}>매출</th>
              </tr>
            </thead>
            <tbody>
              {SEG_ORDER.filter((s) => segCount.has(s)).map((s) => (
                <tr key={s} className="border-b">
                  <td className="py-2">{s}</td>
                  <td className="text-right">{segCount.get(s)!.n}</td>
                  <td className="text-right">{formatKRW(segCount.get(s)!.rev)}</td>
                </tr>
              ))}
              {segCount.size === 0 && <Empty cols={3} />}
            </tbody>
          </table>
        </section>

        <section>
          <h2 className="mb-1 font-bold">거래처별 마진 기여 {periodNote}</h2>
          <p className="mb-3 text-xs text-neutral-400">원가 입력분 기준. 매출 1위가 마진 1위가 아닐 수 있습니다.</p>
          <table className={TABLE}>
            <thead>
              <tr>
                <th className={TH}>거래처</th>
                <th className={`${TH} text-right`}>매출</th>
                <th className={`${TH} text-right`}>총이익</th>
                <th className={`${TH} text-right`}>이익률</th>
              </tr>
            </thead>
            <tbody>
              {ordered
                .map((a) => ({ a, gp: num(a.cost_covered_revenue) - num(a.cogs) }))
                .filter((x) => num(x.a.cost_covered_revenue) > 0)
                .sort((x, y) => y.gp - x.gp)
                .slice(0, 10)
                .map(({ a, gp }) => (
                  <tr key={a.profile_id} className="border-b">
                    <td className="py-2">{a.account_name}</td>
                    <td className="text-right">{formatKRW(num(a.revenue))}</td>
                    <td className="text-right">{formatKRW(gp)}</td>
                    <td className="text-right">
                      {num(a.cost_covered_revenue)
                        ? `${Math.round((gp / num(a.cost_covered_revenue)) * 1000) / 10}%`
                        : "—"}
                    </td>
                  </tr>
                ))}
              {ordered.length === 0 && <Empty cols={4} />}
            </tbody>
          </table>
        </section>
      </div>

      <section>
        <h2 className="mb-1 font-bold">
          미개시 거래처 <span className="text-xs font-normal text-neutral-400">(승인 완료 · 발주 0건)</span>
        </h2>
        <p className="mb-3 text-xs text-neutral-400">승인이 오래된 순. 샘플 발송·전화 우선 대상입니다.</p>
        <table className={TABLE}>
          <thead>
            <tr>
              <th className={TH}>거래처</th>
              <th className={TH}>구분</th>
              <th className={`${TH} text-right`}>승인일</th>
              <th className={`${TH} text-right`}>승인 후 경과</th>
            </tr>
          </thead>
          <tbody>
            {dormant.map((a) => {
              const days = a.approved_at ? Math.floor((Date.now() - new Date(a.approved_at).getTime()) / 86400000) : null;
              return (
                <tr key={a.profile_id} className="border-b">
                  <td className="py-2">{a.account_name}</td>
                  <td className="text-neutral-500">{customerTypeLabel(a.customer_type)}</td>
                  <td className="text-right">{a.approved_at ? a.approved_at.slice(0, 10) : "—"}</td>
                  <td className={`text-right ${days !== null && days > 14 ? "font-medium text-red-600" : ""}`}>
                    {days !== null ? `${days}일` : "—"}
                  </td>
                </tr>
              );
            })}
            {dormant.length === 0 && <Empty cols={4} />}
          </tbody>
        </table>
      </section>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 제품 · 가격
// ═══════════════════════════════════════════════════════════════════════════
async function ProductsTab({
  rpc,
  periodArgs,
  periodNote,
}: {
  rpc: Rpc;
  periodArgs: { p_from: string | null; p_to: string | null };
  periodNote: React.ReactNode;
}) {
  const price = await rpc<any>("admin_price_realization", periodArgs);
  const pen = await rpc<any>("admin_product_penetration", periodArgs);

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-1 font-bold">가격 실현율 {periodNote}</h2>
        <p className="mb-3 text-xs text-neutral-400">
          도매 개별가는 <code>discount_total</code> 이 아니라 단가에 녹아들어 할인 리포트로는 보이지 않습니다. 실현단가 ÷ 정가로 봅니다.
          실현율이 낮은데 물량이 큰 SKU 가 가격 협상 1순위입니다.
        </p>
        <div className="overflow-x-auto">
          <table className={TABLE}>
            <thead>
              <tr>
                <th className={TH}>SKU</th>
                <th className={`${TH} text-right`}>정가</th>
                <th className={`${TH} text-right`}>실현단가</th>
                <th className={`${TH} text-right`}>실현율</th>
                <th className={`${TH} text-right`}>수량</th>
                <th className={`${TH} text-right`}>거래처</th>
                <th className={`${TH} text-right`}>매출</th>
                <th className={`${TH} text-right`}>단위 마진</th>
              </tr>
            </thead>
            <tbody>
              {price.map((r) => (
                <tr key={r.sku} className="border-b">
                  <td className="py-2">
                    {r.title ?? r.sku}
                    <span className="ml-1 text-[11px] text-neutral-400">{r.sku}</span>
                  </td>
                  <td className="text-right">{formatKRW(num(r.base_price))}</td>
                  <td className="text-right">{formatKRW(num(r.realized_unit))}</td>
                  <td className={`text-right ${num(r.realization_pct) < 80 ? "font-semibold text-orange-600" : ""}`}>
                    {pct(r.realization_pct)}
                  </td>
                  <td className="text-right">{r.qty}</td>
                  <td className="text-right">{r.accounts}</td>
                  <td className="text-right">{formatKRW(num(r.revenue))}</td>
                  <td className="text-right">
                    {r.unit_margin === null ? <span className="text-neutral-300">원가 미입력</span> : formatKRW(num(r.unit_margin))}
                  </td>
                </tr>
              ))}
              {price.length === 0 && <Empty cols={8} />}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-1 font-bold">제품 침투율 {periodNote}</h2>
        <p className="mb-3 text-xs text-neutral-400">
          활성 거래처 중 이 제품을 쓰는 비율. 침투율이 낮은데 매출이 큰 제품은 크로스셀 여지가 큽니다.
        </p>
        <table className={TABLE}>
          <thead>
            <tr>
              <th className={TH}>제품</th>
              <th className={`${TH} text-right`}>구매 거래처</th>
              <th className={`${TH} text-right`}>활성 거래처</th>
              <th className={`${TH} text-right`}>침투율</th>
              <th className={`${TH} text-right`}>수량</th>
              <th className={`${TH} text-right`}>매출</th>
            </tr>
          </thead>
          <tbody>
            {pen.map((r) => (
              <tr key={r.slug} className="border-b">
                <td className="py-2">{r.title ?? r.slug}</td>
                <td className="text-right">{r.accounts_bought}</td>
                <td className="text-right text-neutral-400">{r.accounts_active}</td>
                <td className="text-right">{pct(r.penetration_pct)}</td>
                <td className="text-right">{r.qty}</td>
                <td className="text-right">{formatKRW(num(r.revenue))}</td>
              </tr>
            ))}
            {pen.length === 0 && <Empty cols={6} />}
          </tbody>
        </table>
      </section>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 채널 · 콘텐츠
// ═══════════════════════════════════════════════════════════════════════════
async function ChannelsTab({
  rpc,
  periodArgs,
  periodNote,
  from,
  to,
}: {
  rpc: Rpc;
  periodArgs: { p_from: string | null; p_to: string | null };
  periodNote: React.ReactNode;
  from: string;
  to: string;
}) {
  const email = await rpc<any>("admin_email_performance", periodArgs);
  const carts = await rpc<any>("admin_cart_abandonment", { p_stale_hours: 24 });
  const fails = await rpc<any>("admin_payment_failures", periodArgs);

  const gaOn = ga4Configured();
  const [sources, landing, views] = gaOn
    ? await Promise.all([
        ga4TrafficSources(from || undefined, to || undefined),
        ga4LandingPages(from || undefined, to || undefined),
        ga4ProductViews(from || undefined, to || undefined),
      ])
    : [null, null, null];

  return (
    <div className="space-y-8">
      <section className="rounded-xl border p-5">
        <h2 className="mb-1 font-bold">Google Analytics (유입 · 콘텐츠)</h2>
        {gaOn ? (
          <p className="text-sm text-green-700">GA4 Data API 연동됨 (속성 {process.env.GA4_PROPERTY_ID}). 30분 캐시.</p>
        ) : (
          <div className="text-sm text-neutral-600">
            <p>
              GA4 태그는 이미 심겨 있습니다. 관리자 화면에서 유입 데이터를 함께 보려면 <b>Data API 서비스 계정</b>이 필요합니다.
            </p>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>GCP 서비스 계정 생성 → 키(JSON) 발급</li>
              <li>
                GA4 속성(G-E5B18RHPNY) 관리 → 액세스 관리 → 해당 서비스 계정 이메일을 <b>뷰어</b>로 추가
              </li>
              <li>
                Vercel env 주입: <code className="rounded bg-neutral-100 px-1">GA4_PROPERTY_ID</code>(숫자 속성 ID) ·{" "}
                <code className="rounded bg-neutral-100 px-1">GA4_SA_EMAIL</code> ·{" "}
                <code className="rounded bg-neutral-100 px-1">GA4_SA_PRIVATE_KEY</code>
              </li>
            </ol>
            <p className="mt-2 text-xs text-amber-700">결제·이메일과 같은 패턴입니다 — env 를 넣으면 이 영역이 자동 활성화됩니다.</p>
          </div>
        )}
      </section>

      {gaOn && (
        <div className="grid gap-8 md:grid-cols-2">
          <section>
            <h2 className="mb-3 font-bold">유입 경로 {periodNote}</h2>
            <table className={TABLE}>
              <thead>
                <tr>
                  <th className={TH}>소스 / 매체</th>
                  <th className={`${TH} text-right`}>세션</th>
                  <th className={`${TH} text-right`}>참여</th>
                  <th className={`${TH} text-right`}>전환</th>
                </tr>
              </thead>
              <tbody>
                {(sources ?? []).map((r, i) => (
                  <tr key={i} className="border-b">
                    <td className="py-2">
                      {r.dims[0]} / {r.dims[1]}
                    </td>
                    <td className="text-right">{r.metrics[0]}</td>
                    <td className="text-right">{r.metrics[1]}</td>
                    <td className="text-right">{r.metrics[2]}</td>
                  </tr>
                ))}
                {(!sources || sources.length === 0) && <Empty cols={4} />}
              </tbody>
            </table>
          </section>

          <section>
            <h2 className="mb-3 font-bold">랜딩페이지 {periodNote}</h2>
            <table className={TABLE}>
              <thead>
                <tr>
                  <th className={TH}>경로</th>
                  <th className={`${TH} text-right`}>세션</th>
                  <th className={`${TH} text-right`}>이탈률</th>
                </tr>
              </thead>
              <tbody>
                {(landing ?? []).map((r, i) => (
                  <tr key={i} className="border-b">
                    <td className="max-w-xs truncate py-2">{r.dims[0]}</td>
                    <td className="text-right">{r.metrics[0]}</td>
                    <td className="text-right">{Math.round(r.metrics[1] * 1000) / 10}%</td>
                  </tr>
                ))}
                {(!landing || landing.length === 0) && <Empty cols={3} />}
              </tbody>
            </table>
          </section>

          <section className="md:col-span-2">
            <h2 className="mb-1 font-bold">제품 상세 조회수 {periodNote}</h2>
            <p className="mb-3 text-xs text-neutral-400">
              GA4(세션 기준)와 자사 DB(주문 기준)는 정확히 맞지 않습니다. 합산하지 말고 조회 대비 판매 비율만 읽으세요.
            </p>
            <table className={TABLE}>
              <thead>
                <tr>
                  <th className={TH}>경로</th>
                  <th className={`${TH} text-right`}>조회수</th>
                </tr>
              </thead>
              <tbody>
                {(views ?? []).map((r, i) => (
                  <tr key={i} className="border-b">
                    <td className="py-2">{r.dims[0]}</td>
                    <td className="text-right">{r.metrics[0]}</td>
                  </tr>
                ))}
                {(!views || views.length === 0) && <Empty cols={2} />}
              </tbody>
            </table>
          </section>
        </div>
      )}

      <section>
        <h2 className="mb-1 font-bold">이메일 성과 {periodNote}</h2>
        <p className="mb-3 text-xs text-neutral-400">
          오픈·클릭은 Resend 웹훅(<code>/api/webhooks/resend</code>)이 수신한 뒤부터 쌓입니다.
        </p>
        <table className={TABLE}>
          <thead>
            <tr>
              <th className={TH}>종류</th>
              <th className={`${TH} text-right`}>발송</th>
              <th className={`${TH} text-right`}>오픈</th>
              <th className={`${TH} text-right`}>클릭</th>
              <th className={`${TH} text-right`}>반송</th>
              <th className={`${TH} text-right`}>오픈율</th>
            </tr>
          </thead>
          <tbody>
            {email.map((r) => (
              <tr key={r.kind} className="border-b">
                <td className="py-2">{r.kind}</td>
                <td className="text-right">{r.sent}</td>
                <td className="text-right">{r.opened}</td>
                <td className="text-right">{r.clicked}</td>
                <td className="text-right">{r.bounced}</td>
                <td className="text-right">{pct(r.open_pct)}</td>
              </tr>
            ))}
            {email.length === 0 && <Empty cols={6} />}
          </tbody>
        </table>
      </section>

      <div className="grid gap-8 md:grid-cols-2">
        <section>
          <h2 className="mb-1 font-bold">
            장바구니 이탈 <span className="text-xs font-normal text-neutral-400">(24시간 이상 방치)</span>
          </h2>
          <p className="mb-3 text-xs text-neutral-400">로그인 회원만 기록됩니다. B2B 에서는 견적 이탈에 해당합니다.</p>
          <table className={TABLE}>
            <thead>
              <tr>
                <th className={TH}>거래처</th>
                <th className={`${TH} text-right`}>품목</th>
                <th className={`${TH} text-right`}>추정액</th>
                <th className={`${TH} text-right`}>방치</th>
              </tr>
            </thead>
            <tbody>
              {carts.map((r) => (
                <tr key={r.profile_id} className="border-b">
                  <td className="py-2">{r.account_name}</td>
                  <td className="text-right">{r.items}</td>
                  <td className="text-right">{formatKRW(num(r.est_value))}</td>
                  <td className="text-right">{Math.round(num(r.hours_idle))}시간</td>
                </tr>
              ))}
              {carts.length === 0 && <Empty cols={4} />}
            </tbody>
          </table>
        </section>

        <section>
          <h2 className="mb-1 font-bold">결제 실패 분해 {periodNote}</h2>
          <p className="mb-3 text-xs text-neutral-400">만료 주문이 어디서 멈췄는지. 이 배포 이후 시도분부터 쌓입니다.</p>
          <table className={TABLE}>
            <thead>
              <tr>
                <th className={TH}>단계</th>
                <th className={TH}>PG</th>
                <th className={TH}>코드</th>
                <th className={`${TH} text-right`}>건수</th>
              </tr>
            </thead>
            <tbody>
              {fails.map((r, i) => (
                <tr key={i} className="border-b">
                  <td className="py-2">{r.stage}</td>
                  <td>{r.provider ?? "—"}</td>
                  <td className="text-neutral-500">{r.code}</td>
                  <td className="text-right">{r.events}</td>
                </tr>
              ))}
              {fails.length === 0 && <Empty cols={4} />}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
function Card({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="rounded-xl border p-5">
      <p className="text-sm text-neutral-500">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
      {sub && <p className="mt-1 text-[11px] text-neutral-400">{sub}</p>}
    </div>
  );
}

function Empty({ cols }: { cols: number }) {
  return (
    <tr>
      <td colSpan={cols} className="py-4 text-neutral-400">
        데이터 없음
      </td>
    </tr>
  );
}
