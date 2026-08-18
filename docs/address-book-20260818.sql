-- D-113 배송지 주소록 강화 (2026-08-18)
-- 적용: Supabase 마이그레이션 address_book_label_and_default_guard 로 반영 완료.
-- 이 파일은 기록용 사본이다.
--
-- ① label(별칭) 컬럼 + updated_at
-- ② 기본 배송지 1인 1건을 DB 레벨에서 강제 (기존에는 앱 로직만)
-- ③ set_default_address RPC — 해제/지정을 한 트랜잭션에서 (경합 방지)
-- ④ 기본 배송지 삭제 시 남은 주소 중 최신 1건 자동 승격

alter table public.addresses
  add column if not exists label      text,
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'addresses_label_len' and conrelid = 'public.addresses'::regclass
  ) then
    alter table public.addresses
      add constraint addresses_label_len check (label is null or char_length(label) <= 20);
  end if;
end $$;

create unique index if not exists addresses_one_default_per_profile
  on public.addresses (profile_id)
  where is_default;

-- SECURITY INVOKER: RLS(addr_self)가 그대로 적용되어 본인 행만 바뀐다(D-092 원칙).
create or replace function public.set_default_address(p_address_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.addresses
     set is_default = false, updated_at = now()
   where profile_id = (select auth.uid())
     and is_default
     and id <> p_address_id;

  update public.addresses
     set is_default = true, updated_at = now()
   where id = p_address_id
     and profile_id = (select auth.uid());
end;
$$;

revoke all on function public.set_default_address(uuid) from public;
grant execute on function public.set_default_address(uuid) to authenticated;

create or replace function public.addresses_promote_default()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  nxt uuid;
begin
  if old.is_default then
    select id into nxt
      from public.addresses
     where profile_id = old.profile_id
     order by created_at desc
     limit 1;
    if nxt is not null then
      update public.addresses set is_default = true, updated_at = now() where id = nxt;
    end if;
  end if;
  return old;
end;
$$;

drop trigger if exists addresses_promote_default_after_delete on public.addresses;
create trigger addresses_promote_default_after_delete
  after delete on public.addresses
  for each row execute function public.addresses_promote_default();

comment on column public.addresses.label is '배송지 별칭(집·회사·○○지점). 최대 20자.';
comment on index public.addresses_one_default_per_profile is '기본 배송지는 프로필당 1건 — 앱 로직 외 DB 레벨 강제(D-113).';

-- 검증
-- select profile_id, count(*) filter (where is_default) from public.addresses group by 1 having count(*) filter (where is_default) <> 1;
