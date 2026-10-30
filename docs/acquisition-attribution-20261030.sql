-- D-154 유입 경로(Attribution) 저장
-- 1) orders: 주문 시점의 마지막 유입 채널 + 첫, 마지막 유입 원본
-- 2) profile_attribution: 가입 시점의 첫 유입 + 가입 직전 유입 (회원 본인이 REST 로 고칠 수 없도록 profiles 와 분리)
-- 쓰기는 서버(service-role)만 한다. 관리자 화면은 세션(authenticated + is_admin)으로 읽는다.

alter table public.orders
  add column if not exists acq_channel text,
  add column if not exists acq_first jsonb,
  add column if not exists acq_last jsonb;

create index if not exists orders_acq_channel_idx on public.orders (acq_channel);

comment on column public.orders.acq_channel is 'D-154 주문 시점 마지막 비직접 유입 채널(30일 내). 없으면 direct';
comment on column public.orders.acq_first is 'D-154 첫 유입 Touch(180일 쿠키)';
comment on column public.orders.acq_last is 'D-154 마지막 비직접 유입 Touch(30일 쿠키)';

create table if not exists public.profile_attribution (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  first_channel text,
  signup_channel text,
  first_touch jsonb,
  signup_touch jsonb,
  method text,                                  -- email | oauth
  created_at timestamptz not null default now()
);

alter table public.profile_attribution enable row level security;

-- Supabase 기본 권한 회수(D-097) 후 관리자 읽기만 연다. 쓰기 정책은 두지 않는다(service-role 전용).
revoke all on public.profile_attribution from anon, authenticated, public;
grant select on public.profile_attribution to authenticated;

drop policy if exists profile_attribution_admin_read on public.profile_attribution;
create policy profile_attribution_admin_read on public.profile_attribution
  for select to authenticated
  using ((select public.is_admin()));
