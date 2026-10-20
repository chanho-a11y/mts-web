-- ============================================================================
-- 공지 팝업 (D-148, 2026-10-20)
-- 홈(메인)에만 노출. 유형별 1개(특별 1 + 상시 1), 특별 먼저 순차 표시.
-- 같은 유형이 동시에 여러 개 노출 조건이면 priority 높은 순, 같으면 시작일 최신 1개만.
--
-- 보안 설계 (supabase-default-grants-trap / D-097 기준)
--  · RLS ON + 정책 0개 + anon/authenticated 권한 회수.
--  · 읽기/쓰기 모두 서버(service-role)에서만. 노출 대상(사업자 전용 공지) 필터를
--    서버가 하므로, REST 로 공지 원문을 직접 읽는 경로를 열지 않는다.
--  · 관리자 쓰기는 Server Action 첫 줄 requireAdmin() (D-092).
-- ============================================================================

create table if not exists public.site_popup (
  id            uuid primary key default gen_random_uuid(),
  brand_id      uuid not null references public.brand(id) on delete cascade,
  kind          text not null check (kind in ('regular', 'special')),
  title         text not null check (char_length(title) between 1 and 60),
  body          text not null default '' check (char_length(body) <= 1000),
  title_en      text check (title_en is null or char_length(title_en) between 1 and 80),
  body_en       text check (body_en is null or char_length(body_en) <= 1500),
  image_url     text check (image_url is null or image_url ~ '^https://'),
  cta_label     text check (cta_label is null or char_length(cta_label) <= 20),
  cta_label_en  text check (cta_label_en is null or char_length(cta_label_en) <= 30),
  -- 내부 경로(/로 시작, // 금지) 또는 https 만 허용. javascript: 등 차단.
  cta_url       text check (cta_url is null or cta_url ~ '^(/($|[^/])|https://)'),
  audience      text not null default 'all' check (audience in ('all', 'business', 'consumer')),
  starts_at     timestamptz not null default now(),
  ends_at       timestamptz,                      -- null = 종료일 없음
  priority      integer not null default 0,
  is_active     boolean not null default true,
  archived_at   timestamptz,                      -- not null = 보관(복구 가능)
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  updated_by    uuid references auth.users(id) on delete set null,
  constraint site_popup_period_chk check (ends_at is null or ends_at > starts_at)
);

create index if not exists site_popup_live_idx
  on public.site_popup (brand_id, kind, priority desc, starts_at desc)
  where archived_at is null and is_active;

alter table public.site_popup enable row level security;
-- 정책 없음: service-role 외 접근 불가

revoke all on public.site_popup from anon, authenticated, public;
grant all on public.site_popup to service_role;

-- ----------------------------------------------------------------------------
-- 검증 (적용 후 실행, 기대값 주석)
-- ----------------------------------------------------------------------------
-- select has_table_privilege('anon','public.site_popup','select')          -- false
--      , has_table_privilege('authenticated','public.site_popup','select') -- false
--      , has_table_privilege('anon','public.site_popup','insert')          -- false
--      , (select relrowsecurity from pg_class where oid='public.site_popup'::regclass) -- true
--      , (select count(*) from pg_policies where tablename='site_popup');  -- 0
