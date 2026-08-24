-- ============================================================================
-- 관리자 분석 확장 · 계측 신설 (Stage 5)
-- 2026-08-24 · Supabase mtspace-commerce (apiskyivlvebpvvxfejq)
-- 선행: analytics-foundation-20260824.sql · analytics-admin-functions-20260824.sql
--
-- 범위 결정
--   · 장바구니는 '쓰기 전용 미러'만 붙인다. 결제 경로(app/checkout/actions.ts)는
--     읽지 않으므로 중복주문(D-089) 회귀 위험이 없다.
--   · 미러는 로그인 회원 한정. 비회원 카트를 담으려면 익명 쓰기 RLS 를 새로 열어야
--     하는데, 게스트 주문이 0건이라 보안 표면만 넓히는 셈이다.
-- ============================================================================

-- ── 장바구니 미러 ──────────────────────────────────────────────────────────
-- cart/cart_item 테이블은 이미 있었으나 코드가 쓰지 않아 0행이었다(장바구니=localStorage).
-- 기존 RLS(cart_owner: profile_id = auth.uid())를 그대로 쓰므로 정책 변경이 없다.
create index if not exists idx_cart_profile_id  on public.cart (profile_id);
create index if not exists idx_cart_updated_at  on public.cart (updated_at desc);
create index if not exists idx_cart_item_cart_id on public.cart_item (cart_id);

-- 회원당 카트 1개 — 미러가 계속 새 행을 만들지 않도록.
create unique index if not exists cart_profile_uidx
  on public.cart (profile_id) where profile_id is not null;

-- ── 결제 시도 이벤트 로그 ─────────────────────────────────────────────────
-- 만료 주문이 '결제창 진입 전'인지 'PG 인증 실패'인지 구분할 근거가 없었다.
create table if not exists public.payment_event (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid references public.orders(id) on delete cascade,
  payment_id uuid references public.payment(id) on delete set null,
  provider   text,
  stage      text not null,
  ok         boolean not null default false,
  code       text,
  message    text,
  created_at timestamptz not null default now()
);

create index if not exists idx_payment_event_order_id   on public.payment_event (order_id);
create index if not exists idx_payment_event_created_at on public.payment_event (created_at desc);

alter table public.payment_event enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'payment_event' and policyname = 'payment_event_admin_read'
  ) then
    create policy payment_event_admin_read on public.payment_event
      for select using (public.is_admin());
  end if;
end $$;

comment on table public.payment_event is
  '결제 시도 단계 로그(initiate/approve/fail). 쓰기는 service-role 서버 경로만, 읽기는 관리자.';

-- 신규 테이블은 기본 권한이 회수돼 있다(D-097) → 명시적 최소 권한.
revoke all on public.payment_event from anon, public;
grant select on public.payment_event to authenticated;
grant select, insert on public.payment_event to service_role;

-- ── 이메일 성과 추적 ──────────────────────────────────────────────────────
-- 기존 email_send_log 는 발송 status 만 남아 오픈·클릭을 볼 수 없었다.
alter table public.email_send_log add column if not exists provider            text;
alter table public.email_send_log add column if not exists provider_message_id text;
alter table public.email_send_log add column if not exists subject             text;
alter table public.email_send_log add column if not exists opened_at           timestamptz;
alter table public.email_send_log add column if not exists clicked_at          timestamptz;
alter table public.email_send_log add column if not exists bounced_at          timestamptz;
alter table public.email_send_log add column if not exists complained_at       timestamptz;

create index if not exists idx_email_send_log_provider_message_id
  on public.email_send_log (provider_message_id);

-- ── 리포트 3종 ────────────────────────────────────────────────────────────
-- 장바구니 이탈 — 담아두고 주문하지 않은 회원. B2B 에서는 견적 이탈에 해당한다.
create or replace function public.admin_cart_abandonment(p_stale_hours int default 24)
returns table (
  profile_id uuid, account_name text, items int, qty int,
  est_value bigint, updated_at timestamptz, hours_idle numeric
)
language sql stable set search_path to ''
as $$
  with c as (
    select ct.id, ct.profile_id, ct.updated_at,
           count(ci.id)::int items,
           coalesce(sum(ci.qty), 0)::int qty,
           coalesce(sum(ci.qty * coalesce(ci.unit_price_snapshot, 0)), 0)::bigint est_value
    from public.cart ct
    join public.cart_item ci on ci.cart_id = ct.id
    where ct.profile_id is not null
    group by ct.id, ct.profile_id, ct.updated_at
  ),
  last_order as (
    select ord.profile_id, max(ord.placed_at) last_at
    from public.orders ord
    where ord.status::text = any (public.mcp_revenue_statuses())
    group by 1
  )
  select c.profile_id,
         coalesce(nullif(btrim(b.company_name), ''), nullif(btrim(p.name), ''), p.email),
         c.items, c.qty, c.est_value, c.updated_at,
         round(extract(epoch from (now() - c.updated_at)) / 3600.0, 1)
  from c
  join public.profiles p on p.id = c.profile_id
  left join public.business_accounts b on b.profile_id = c.profile_id
  left join last_order lo on lo.profile_id = c.profile_id
  where public.is_admin()
    and c.updated_at < now() - make_interval(hours => greatest(p_stale_hours, 1))
    and (lo.last_at is null or lo.last_at < c.updated_at)
  order by c.est_value desc
$$;

-- 결제 실패 사유 분해
create or replace function public.admin_payment_failures(
  p_from timestamptz default null, p_to timestamptz default null
)
returns table (stage text, provider text, code text, events int, orders int)
language sql stable set search_path to ''
as $$
  select e.stage, e.provider, coalesce(e.code, '-'),
         count(*)::int, count(distinct e.order_id)::int
  from public.payment_event e
  where public.is_admin()
    and e.ok = false
    and (p_from is null or e.created_at >= p_from)
    and (p_to   is null or e.created_at <  p_to)
  group by 1, 2, 3
  order by 4 desc
$$;

-- 이메일 성과 — 발송 대비 오픈·클릭
create or replace function public.admin_email_performance(
  p_from timestamptz default null, p_to timestamptz default null
)
returns table (
  kind text, sent int, delivered int, opened int, clicked int, bounced int,
  open_pct numeric, click_pct numeric
)
language sql stable set search_path to ''
as $$
  select l.kind,
         count(*)::int,
         count(*) filter (where coalesce(l.status, '') not in ('failed', 'bounced'))::int,
         count(*) filter (where l.opened_at is not null)::int,
         count(*) filter (where l.clicked_at is not null)::int,
         count(*) filter (where l.bounced_at is not null)::int,
         round(100.0 * count(*) filter (where l.opened_at is not null) / nullif(count(*), 0), 1),
         round(100.0 * count(*) filter (where l.clicked_at is not null) / nullif(count(*), 0), 1)
  from public.email_send_log l
  where public.is_admin()
    and (p_from is null or l.created_at >= p_from)
    and (p_to   is null or l.created_at <  p_to)
  group by l.kind
  order by 2 desc
$$;

revoke execute on function public.admin_cart_abandonment(int)                       from public, anon;
revoke execute on function public.admin_payment_failures(timestamptz, timestamptz)  from public, anon;
revoke execute on function public.admin_email_performance(timestamptz, timestamptz) from public, anon;

grant execute on function public.admin_cart_abandonment(int)                       to authenticated;
grant execute on function public.admin_payment_failures(timestamptz, timestamptz)  to authenticated;
grant execute on function public.admin_email_performance(timestamptz, timestamptz) to authenticated;
