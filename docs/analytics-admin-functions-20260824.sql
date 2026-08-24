-- ============================================================================
-- 관리자 분석 집계 함수 (Stage 1)
-- 2026-08-24 · Supabase mtspace-commerce (apiskyivlvebpvvxfejq)
-- 선행: analytics-foundation-20260824.sql
--
-- 보안 모델 (중요)
--   · 전부 SECURITY INVOKER(기본값). 관리자 분석 페이지는 service-role 이 아니라
--     RLS 를 타는 anon 키 + 사용자 세션 클라이언트를 쓰기 때문이다.
--     기존 RLS 정책이 모두 `OR is_admin()` 을 갖고 있어 관리자=전체 / 회원=본인이
--     정책 변경 없이 성립한다.
--   · 그 위에 본문 `where public.is_admin()` 가드를 한 번 더 둔다(이중 방어).
--   · 함수는 PUBLIC 에 기본 EXECUTE 가 붙으므로(anon 이 상속) 마지막에 회수한다.
--
-- 검증 결과 (2026-08-24)
--   · 관리자 JWT   → 정상 반환
--   · 사업자회원 JWT → 12종 전부 0행
--   · anon EXECUTE → false
-- ============================================================================

-- ── 1. 거래처 건강도 — 재발주 지연 보드·RFM·마진·미개시 명단의 공통 원천 ────
create or replace function public.admin_account_health(
  p_from timestamptz default null,
  p_to   timestamptz default null
)
returns table (
  profile_id uuid, account_name text, customer_type text, biz_status text,
  approved_at timestamptz, orders int, revenue bigint, qty int, sku_count int,
  first_at timestamptz, last_at timestamptz, avg_reorder_days numeric,
  days_since_last int, lag_ratio numeric,
  item_revenue bigint, cogs bigint, cost_covered_revenue bigint
)
language sql stable set search_path to ''
as $$
  with o as (
    select ord.id, ord.profile_id, ord.placed_at, ord.grand_total, ord.customer_type
    from public.orders ord
    where ord.status::text = any (public.mcp_revenue_statuses())
      and ord.currency = 'KRW'
      and ord.profile_id is not null
      and coalesce(ord.customer_type, '') <> 'admin'
      and (p_from is null or ord.placed_at >= p_from)
      and (p_to   is null or ord.placed_at <  p_to)
  ),
  ord_agg as (
    select o.profile_id,
           count(*)::int              as orders,
           sum(o.grand_total)::bigint as revenue,
           min(o.placed_at)           as first_at,
           max(o.placed_at)           as last_at,
           max(o.customer_type)       as customer_type
    from o group by 1
  ),
  item_agg as (
    select o.profile_id,
           sum(oi.qty)::int            as qty,
           count(distinct oi.sku)::int as sku_count,
           sum(oi.line_total)::bigint  as item_revenue,
           sum(oi.qty * coalesce(pr.cost, 0))::bigint as cogs,
           sum(case when coalesce(pr.cost, 0) > 0 then oi.line_total else 0 end)::bigint as cost_covered_revenue
    from o
    join public.order_item oi on oi.order_id = o.id
    left join public.product_variant pv on pv.id = oi.variant_id
    left join public.product pr on pr.id = pv.product_id
    group by 1
  )
  select
    p.id,
    coalesce(nullif(btrim(b.company_name), ''), nullif(btrim(p.name), ''), p.email, left(p.id::text, 8)),
    coalesce(a.customer_type, p.role::text),
    b.status::text,
    b.approved_at,
    coalesce(a.orders, 0),
    coalesce(a.revenue, 0),
    coalesce(i.qty, 0),
    coalesce(i.sku_count, 0),
    a.first_at,
    a.last_at,
    case when coalesce(a.orders, 0) >= 2
         then round((((a.last_at at time zone 'Asia/Seoul')::date - (a.first_at at time zone 'Asia/Seoul')::date))::numeric
                    / (a.orders - 1), 1)
    end,
    case when a.last_at is not null
         then (((now() at time zone 'Asia/Seoul')::date - (a.last_at at time zone 'Asia/Seoul')::date))::int
    end,
    case when coalesce(a.orders, 0) >= 2
          and (((a.last_at at time zone 'Asia/Seoul')::date - (a.first_at at time zone 'Asia/Seoul')::date)) > 0
         then round(
                ((((now() at time zone 'Asia/Seoul')::date - (a.last_at at time zone 'Asia/Seoul')::date))::numeric)
                / (((((a.last_at at time zone 'Asia/Seoul')::date - (a.first_at at time zone 'Asia/Seoul')::date))::numeric)
                   / (a.orders - 1)),
              2)
    end,
    coalesce(i.item_revenue, 0),
    coalesce(i.cogs, 0),
    coalesce(i.cost_covered_revenue, 0)
  from public.profiles p
  left join public.business_accounts b on b.profile_id = p.id
  left join ord_agg a on a.profile_id = p.id
  left join item_agg i on i.profile_id = p.id
  where public.is_admin()
    and p.role::text <> 'admin'
    and coalesce(p.archived, false) = false
$$;

comment on function public.admin_account_health(timestamptz, timestamptz) is
  '거래처 단위 건강도. 재발주 지연(lag_ratio)·RFM·마진·미개시 명단 공통 원천. INVOKER + is_admin() 가드.';

-- ── 2. 거래처 활성화 퍼널 (기간 무관 현재 스냅샷) ──────────────────────────
create or replace function public.admin_activation_funnel()
returns table (
  approved_accounts int, ordered_accounts int, repeat_accounts int,
  settled_accounts int, never_ordered int
)
language sql stable set search_path to ''
as $$
  with paid as (
    select ord.profile_id, count(*) n
    from public.orders ord
    where ord.status::text = any (public.mcp_revenue_statuses())
      and ord.profile_id is not null
      and coalesce(ord.customer_type, '') <> 'admin'
    group by 1
  ),
  acc as (
    select b.profile_id, coalesce(p.n, 0) n
    from public.business_accounts b
    left join paid p on p.profile_id = b.profile_id
    where b.status = 'approved'
  )
  select count(*)::int,
         count(*) filter (where n >= 1)::int,
         count(*) filter (where n >= 2)::int,
         count(*) filter (where n >= 3)::int,
         count(*) filter (where n = 0)::int
  from acc
  where public.is_admin()
$$;

-- ── 3. 결제 전환율 추이 ────────────────────────────────────────────────────
create or replace function public.admin_order_funnel(
  p_from timestamptz default null, p_to timestamptz default null, p_bucket text default 'week'
)
returns table (
  bucket_start date, created_total int, expired int, cancelled int, paid int, conversion_pct numeric
)
language sql stable set search_path to ''
as $$
  with o as (
    select date_trunc(
             case when p_bucket in ('day', 'week', 'month') then p_bucket else 'week' end,
             (ord.placed_at at time zone 'Asia/Seoul')
           )::date as b,
           ord.status::text as st
    from public.orders ord
    where coalesce(ord.customer_type, '') <> 'admin'
      and ord.placed_at is not null
      and (p_from is null or ord.placed_at >= p_from)
      and (p_to   is null or ord.placed_at <  p_to)
  )
  select b,
         count(*)::int,
         count(*) filter (where st = 'expired')::int,
         count(*) filter (where st = 'cancelled')::int,
         count(*) filter (where st = any (public.mcp_revenue_statuses()))::int,
         round(100.0 * count(*) filter (where st = any (public.mcp_revenue_statuses()))
               / nullif(count(*), 0), 1)
  from o
  where public.is_admin()
  group by b
  order by b
$$;

-- ── 4. 가격 실현율 ─────────────────────────────────────────────────────────
-- 도매 개별가는 discount_total 이 아니라 단가에 녹아들어 할인 리포트로는 안 보인다.
create or replace function public.admin_price_realization(
  p_from timestamptz default null, p_to timestamptz default null
)
returns table (
  sku text, title text, base_price int, realized_unit int, realization_pct numeric,
  qty int, accounts int, revenue bigint, cost int, unit_margin int, margin_pct numeric
)
language sql stable set search_path to ''
as $$
  with li as (
    select oi.sku, oi.title_snapshot, oi.qty, oi.line_total, oi.variant_id, ord.profile_id
    from public.order_item oi
    join public.orders ord on ord.id = oi.order_id
    where ord.status::text = any (public.mcp_revenue_statuses())
      and ord.currency = 'KRW'
      and coalesce(ord.customer_type, '') <> 'admin'
      and (p_from is null or ord.placed_at >= p_from)
      and (p_to   is null or ord.placed_at <  p_to)
  )
  select li.sku,
         max(li.title_snapshot),
         max(pv.base_price),
         round(sum(li.line_total)::numeric / nullif(sum(li.qty), 0))::int,
         round(100.0 * (sum(li.line_total)::numeric / nullif(sum(li.qty), 0))
               / nullif(max(pv.base_price), 0), 1),
         sum(li.qty)::int,
         count(distinct li.profile_id)::int,
         sum(li.line_total)::bigint,
         max(pr.cost),
         case when max(pr.cost) is not null
              then (round(sum(li.line_total)::numeric / nullif(sum(li.qty), 0)) - max(pr.cost))::int
         end,
         case when coalesce(max(pr.cost), 0) > 0
              then round(100.0 * (round(sum(li.line_total)::numeric / nullif(sum(li.qty), 0)) - max(pr.cost))
                         / nullif(round(sum(li.line_total)::numeric / nullif(sum(li.qty), 0)), 0), 1)
         end
  from li
  left join public.product_variant pv on pv.id = li.variant_id
  left join public.product pr on pr.id = pv.product_id
  where public.is_admin()
  group by li.sku
  order by sum(li.line_total) desc
$$;

-- ── 5. 매출 집중도 ─────────────────────────────────────────────────────────
create or replace function public.admin_revenue_concentration(
  p_from timestamptz default null, p_to timestamptz default null
)
returns table (accounts int, total_revenue bigint, top1_pct numeric, top3_pct numeric, top5_pct numeric)
language sql stable set search_path to ''
as $$
  with r as (
    select ord.profile_id, sum(ord.grand_total)::bigint rev
    from public.orders ord
    where ord.status::text = any (public.mcp_revenue_statuses())
      and ord.currency = 'KRW'
      and ord.profile_id is not null
      and coalesce(ord.customer_type, '') <> 'admin'
      and (p_from is null or ord.placed_at >= p_from)
      and (p_to   is null or ord.placed_at <  p_to)
    group by 1
  ),
  ranked as (select rev, row_number() over (order by rev desc) rn from r)
  select count(*)::int,
         coalesce(sum(rev), 0)::bigint,
         round(100.0 * coalesce(sum(rev) filter (where rn <= 1), 0) / nullif(sum(rev), 0), 1),
         round(100.0 * coalesce(sum(rev) filter (where rn <= 3), 0) / nullif(sum(rev), 0), 1),
         round(100.0 * coalesce(sum(rev) filter (where rn <= 5), 0) / nullif(sum(rev), 0), 1)
  from ranked
  where public.is_admin()
$$;

-- ── 6. 원가 커버리지 ───────────────────────────────────────────────────────
-- 이익 지표의 신뢰도를 지표로 표시한다. 원가 미입력 제품 매출은 이익 계산에서 제외
-- (기존 화면은 이를 0원가 = 100% 이익으로 잡아 이익률을 부풀리고 있었다).
create or replace function public.admin_cost_coverage(
  p_from timestamptz default null, p_to timestamptz default null
)
returns table (
  item_revenue bigint, revenue_with_cost bigint, coverage_pct numeric,
  cogs bigint, gross_profit bigint, margin_pct numeric,
  products_total int, products_with_cost int
)
language sql stable set search_path to ''
as $$
  with li as (
    select oi.qty, oi.line_total, coalesce(pr.cost, 0) cost
    from public.order_item oi
    join public.orders ord on ord.id = oi.order_id
    left join public.product_variant pv on pv.id = oi.variant_id
    left join public.product pr on pr.id = pv.product_id
    where ord.status::text = any (public.mcp_revenue_statuses())
      and ord.currency = 'KRW'
      and coalesce(ord.customer_type, '') <> 'admin'
      and (p_from is null or ord.placed_at >= p_from)
      and (p_to   is null or ord.placed_at <  p_to)
  )
  select coalesce(sum(li.line_total), 0)::bigint,
         coalesce(sum(li.line_total) filter (where li.cost > 0), 0)::bigint,
         round(100.0 * coalesce(sum(li.line_total) filter (where li.cost > 0), 0)
               / nullif(sum(li.line_total), 0), 1),
         coalesce(sum(li.qty * li.cost), 0)::bigint,
         (coalesce(sum(li.line_total) filter (where li.cost > 0), 0) - coalesce(sum(li.qty * li.cost), 0))::bigint,
         round(100.0 * (coalesce(sum(li.line_total) filter (where li.cost > 0), 0) - coalesce(sum(li.qty * li.cost), 0))
               / nullif(sum(li.line_total) filter (where li.cost > 0), 0), 1),
         (select count(*)::int from public.product),
         (select count(*)::int from public.product where coalesce(cost, 0) > 0)
  from li
  where public.is_admin()
$$;

-- ── 7. 제품 침투율 (크로스셀 대상 선정) ────────────────────────────────────
create or replace function public.admin_product_penetration(
  p_from timestamptz default null, p_to timestamptz default null
)
returns table (
  slug text, title text, accounts_bought int, accounts_active int,
  penetration_pct numeric, qty int, revenue bigint
)
language sql stable set search_path to ''
as $$
  with o as (
    select ord.id, ord.profile_id
    from public.orders ord
    where ord.status::text = any (public.mcp_revenue_statuses())
      and ord.currency = 'KRW'
      and ord.profile_id is not null
      and coalesce(ord.customer_type, '') <> 'admin'
      and (p_from is null or ord.placed_at >= p_from)
      and (p_to   is null or ord.placed_at <  p_to)
  ),
  active as (select count(distinct profile_id)::int n from o),
  li as (
    select pr.slug, pr.title_ko, o.profile_id, oi.qty, oi.line_total
    from o
    join public.order_item oi on oi.order_id = o.id
    left join public.product_variant pv on pv.id = oi.variant_id
    left join public.product pr on pr.id = pv.product_id
    where pr.slug is not null
  )
  select li.slug,
         max(li.title_ko),
         count(distinct li.profile_id)::int,
         (select n from active),
         round(100.0 * count(distinct li.profile_id) / nullif((select n from active), 0), 1),
         sum(li.qty)::int,
         sum(li.line_total)::bigint
  from li
  where public.is_admin()
  group by li.slug
  order by sum(li.line_total) desc
$$;

-- ── 8. 지역별 매출 (region_normalize 로 17개 시·도 표준명) ─────────────────
create or replace function public.admin_region_sales(
  p_from timestamptz default null, p_to timestamptz default null
)
returns table (region text, orders int, revenue bigint)
language sql stable set search_path to ''
as $$
  select public.mcp_region(ord.shipping_address),
         count(*)::int,
         sum(ord.grand_total)::bigint
  from public.orders ord
  where ord.status::text = any (public.mcp_revenue_statuses())
    and ord.currency = 'KRW'
    and coalesce(ord.customer_type, '') <> 'admin'
    and (p_from is null or ord.placed_at >= p_from)
    and (p_to   is null or ord.placed_at <  p_to)
    and public.is_admin()
  group by 1
  order by 3 desc
$$;

-- ── 9. 가입 → 승인 → 첫 발주 리드타임(중앙값, 일) ─────────────────────────
-- 병목이 '승인'인지 '승인 이후'인지 가른다.
create or replace function public.admin_first_order_leadtime()
returns table (
  accounts int, approved_accounts int, first_ordered int,
  median_signup_to_approve numeric, median_approve_to_first numeric,
  pending_over_14d int
)
language sql stable set search_path to ''
as $$
  with f as (
    select ord.profile_id, min(ord.placed_at) first_at
    from public.orders ord
    where ord.status::text = any (public.mcp_revenue_statuses())
      and ord.profile_id is not null
      and coalesce(ord.customer_type, '') <> 'admin'
    group by 1
  ),
  b as (
    select ba.profile_id, ba.status::text st, ba.created_at, ba.approved_at,
           p.created_at signup_at, f.first_at
    from public.business_accounts ba
    left join public.profiles p on p.id = ba.profile_id
    left join f on f.profile_id = ba.profile_id
  )
  select count(*)::int,
         count(*) filter (where st = 'approved')::int,
         count(*) filter (where first_at is not null)::int,
         round(percentile_cont(0.5) within group (
           order by extract(epoch from (approved_at - signup_at)) / 86400.0
         )::numeric, 1),
         round(percentile_cont(0.5) within group (
           order by extract(epoch from (first_at - approved_at)) / 86400.0
         )::numeric, 1),
         count(*) filter (
           where st = 'approved' and first_at is null
             and approved_at < now() - interval '14 days'
         )::int
  from b
  where public.is_admin()
$$;

-- ── 권한 ───────────────────────────────────────────────────────────────────
-- 함수는 PUBLIC 에 기본 EXECUTE 가 붙고 anon 이 이를 상속한다(D-097 계열).
-- is_admin() 가드 덕에 데이터가 새지는 않지만 이중 방어로 회수한다.
revoke execute on function public.admin_account_health(timestamptz, timestamptz)        from public, anon;
revoke execute on function public.admin_activation_funnel()                              from public, anon;
revoke execute on function public.admin_order_funnel(timestamptz, timestamptz, text)     from public, anon;
revoke execute on function public.admin_price_realization(timestamptz, timestamptz)      from public, anon;
revoke execute on function public.admin_revenue_concentration(timestamptz, timestamptz)  from public, anon;
revoke execute on function public.admin_cost_coverage(timestamptz, timestamptz)          from public, anon;
revoke execute on function public.admin_product_penetration(timestamptz, timestamptz)    from public, anon;
revoke execute on function public.admin_region_sales(timestamptz, timestamptz)           from public, anon;
revoke execute on function public.admin_first_order_leadtime()                            from public, anon;

grant execute on function public.admin_account_health(timestamptz, timestamptz)       to authenticated;
grant execute on function public.admin_activation_funnel()                             to authenticated;
grant execute on function public.admin_order_funnel(timestamptz, timestamptz, text)    to authenticated;
grant execute on function public.admin_price_realization(timestamptz, timestamptz)     to authenticated;
grant execute on function public.admin_revenue_concentration(timestamptz, timestamptz) to authenticated;
grant execute on function public.admin_cost_coverage(timestamptz, timestamptz)         to authenticated;
grant execute on function public.admin_product_penetration(timestamptz, timestamptz)   to authenticated;
grant execute on function public.admin_region_sales(timestamptz, timestamptz)          to authenticated;
grant execute on function public.admin_first_order_leadtime()                           to authenticated;
