-- D-111 · 2026-08-10 · 도매 등급가를 '변형별 행' → '등급 기본할인율 규칙' 으로 전환
-- 적용처: Supabase mtspace-commerce (apiskyivlvebpvvxfejq)
-- 적용 완료 (MCP apply_migration): tier_default_discount_01~04
--
-- 배경: 등급가가 variant_prices 의 변형별 행으로만 존재해 신규 제품에 자동 반영되지 않았다.
--       resolve_price 는 행이 없으면 곧장 base(정가)로 떨어진다.
-- 원칙: 사업자(도매-기본)는 소매용 전 제품 무조건 40%. 정가 인상 시에도 자동 반영.

-- ─────────────────────────────────────────────────────────────
-- 01. 등급 기본할인율 + 규칙 계산 함수
-- ─────────────────────────────────────────────────────────────
alter table public.price_tier
  add column if not exists default_discount_pct numeric(5,2);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'price_tier_default_discount_pct_ck') then
    alter table public.price_tier
      add constraint price_tier_default_discount_pct_ck
      check (default_discount_pct is null or (default_discount_pct >= 0 and default_discount_pct < 100));
  end if;
end $$;

comment on column public.price_tier.default_discount_pct is
  '등급 기본 할인율(%). NULL 이면 규칙 미적용. 소매용 변형(is_b2b_only=false)에만 적용되며 variant_prices 수동 지정이 우선.';

update public.price_tier set default_discount_pct = 40 where name = '도매-기본';

-- 규칙 적용가 단일 정본. 도매전용 변형은 base_price 가 이미 도매가라 제외한다.
create or replace function public.tier_default_price(p_variant_id uuid, p_price_tier_id uuid)
returns integer
language sql stable security definer set search_path to 'public'
as $function$
  select round(v.base_price * (100 - t.default_discount_pct) / 100.0)::int
    from public.product_variant v
    join public.price_tier t on t.id = p_price_tier_id
   where v.id = p_variant_id
     and v.base_price is not null
     and coalesce(v.is_b2b_only, false) = false
     and t.default_discount_pct is not null
     and t.default_discount_pct > 0
$function$;

comment on function public.tier_default_price(uuid, uuid) is
  '등급 기본할인율 규칙가. 소매용 변형만 대상. resolve_price / mcp_resolve_price / admin_tier_price_table 이 공유하는 단일 계산식.';

revoke all on function public.tier_default_price(uuid, uuid) from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- 02. 단가 확정 4단계 확장
--     individual > tier(수동 예외) > tier_default(규칙) > base
--     IDOR 가드(D-094)는 그대로 유지
-- ─────────────────────────────────────────────────────────────
create or replace function public.resolve_price(
  p_variant_id uuid,
  p_profile_id uuid default auth.uid(),
  p_at timestamp with time zone default now()
)
returns table(price integer, source text)
language sql stable security definer set search_path to 'public'
as $function$
  with req as (
    select case
             when p_profile_id is null then auth.uid()
             when p_profile_id = auth.uid() then p_profile_id
             when coalesce(auth.role(),'') = 'service_role' or public.is_admin() then p_profile_id
             else auth.uid()
           end as pid
  ),
  cand as (
    (select 1 as pri, cvp.price as p_val, 'individual'::text as p_src
       from public.customer_variant_prices cvp
      where cvp.variant_id = p_variant_id
        and cvp.profile_id = (select pid from req)
        and p_at >= cvp.starts_at and (cvp.ends_at is null or p_at < cvp.ends_at)
      order by cvp.starts_at desc limit 1)
    union all
    (select 2, vp.price, 'tier'::text
       from public.variant_prices vp
       join public.profiles pr on pr.id = (select pid from req)
      where vp.variant_id = p_variant_id and vp.price_tier_id = pr.price_tier_id
      limit 1)
    union all
    (select 3, public.tier_default_price(p_variant_id, pr.price_tier_id), 'tier_default'::text
       from public.profiles pr where pr.id = (select pid from req) limit 1)
    union all
    (select 4, v.base_price, 'base'::text
       from public.product_variant v where v.id = p_variant_id limit 1)
  )
  select c.p_val, c.p_src from cand c where c.p_val is not null order by c.pri limit 1;
$function$;

comment on function public.resolve_price(uuid, uuid, timestamptz) is
  '적용 단가 확정. 개별가 > 수동 등급가 > 등급 기본할인율 규칙가 > 정가. 호출자가 본인/관리자/service_role 이 아니면 p_profile_id 를 auth.uid() 로 되돌린다(D-094).';

create or replace function public.mcp_resolve_price(
  p_variant_id uuid,
  p_profile_id uuid default null::uuid,
  p_at timestamp with time zone default now()
)
returns table(price integer, source text)
language sql stable security definer set search_path to 'public'
as $function$
  with v as (
    select id from public.product_variant
     where id = p_variant_id
       and product_id in (select product_id from public.product_storefronts
                           where storefront_id = public.mcp_storefront_id())
  ),
  cand as (
    (select 1 as pri, cvp.price as p_val, 'individual'::text as p_src
       from public.customer_variant_prices cvp, v
      where cvp.variant_id = v.id and cvp.profile_id = p_profile_id
        and p_at >= cvp.starts_at and (cvp.ends_at is null or p_at < cvp.ends_at)
      order by cvp.starts_at desc limit 1)
    union all
    (select 2, vp.price, 'tier'::text
       from public.variant_prices vp
       join public.profiles pr on pr.id = p_profile_id, v
      where vp.variant_id = v.id and vp.price_tier_id = pr.price_tier_id
      limit 1)
    union all
    (select 3, public.tier_default_price(v.id, pr.price_tier_id), 'tier_default'::text
       from public.profiles pr, v where pr.id = p_profile_id limit 1)
    union all
    (select 4, pv.base_price, 'base'::text
       from public.product_variant pv, v where pv.id = v.id limit 1)
  )
  select c.p_val, c.p_src from cand c where c.p_val is not null order by c.pri limit 1;
$function$;

comment on function public.mcp_resolve_price(uuid, uuid, timestamptz) is
  'MCP 전용 단가 확정. 스토어프론트 잠금 포함. 규칙은 public.resolve_price 와 동일(개별가→수동 등급가→등급 기본할인율→정가).';

grant execute on function public.mcp_resolve_price(uuid, uuid, timestamptz) to mcp_reader;
revoke execute on function public.mcp_resolve_price(uuid, uuid, timestamptz) from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- 03. 규칙값과 동일한 수동 등급가 행 제거 (16행)
--     남겨두면 정가 인상 시 옛 등급가에 묶여 할인율이 틀어진다.
--     규칙값과 다른(=진짜 예외) 행은 건드리지 않는다.
-- ─────────────────────────────────────────────────────────────
delete from public.variant_prices vp
 where vp.price is not distinct from public.tier_default_price(vp.variant_id, vp.price_tier_id);

-- ─────────────────────────────────────────────────────────────
-- 04. 관리자 등급가 표 RPC (뷰 대신 함수 — D-097 기본권한 함정 회피)
-- ─────────────────────────────────────────────────────────────
create or replace function public.admin_tier_price_table(p_price_tier_id uuid)
returns table(
  variant_id uuid, sku text, title_ko text, weight_g integer,
  base_price integer, effective_price integer, origin text,
  is_b2b_only boolean, product_status text
)
language sql stable security definer set search_path to 'public'
as $function$
  select v.id, v.sku, p.title_ko, v.weight_g, v.base_price,
         coalesce(vp.price, public.tier_default_price(v.id, p_price_tier_id), v.base_price)::int,
         case when vp.price is not null then 'manual'
              when public.tier_default_price(v.id, p_price_tier_id) is not null then 'rule'
              else 'base' end,
         coalesce(v.is_b2b_only, false),
         p.status
    from public.product_variant v
    join public.product p on p.id = v.product_id
    left join public.variant_prices vp
           on vp.variant_id = v.id and vp.price_tier_id = p_price_tier_id
   where v.is_active and public.is_admin()
   order by p.title_ko, v.weight_g nulls first;
$function$;

comment on function public.admin_tier_price_table(uuid) is
  '관리자 전용 등급가 표. origin: manual(수동 예외) / rule(등급 기본할인율) / base(규칙 미적용=정가).';

revoke all on function public.admin_tier_price_table(uuid) from public, anon;
grant execute on function public.admin_tier_price_table(uuid) to authenticated, service_role;


-- ═════════════════════════════════════════════════════════════
-- 롤백 — 삭제한 16행 재삽입 + 규칙 해제
-- (함수 본문 롤백이 필요하면 D-094 이전 정의를 pg_get_functiondef 백업에서 복원)
-- ═════════════════════════════════════════════════════════════
-- update public.price_tier set default_discount_pct = null where name = '도매-기본';
-- insert into public.variant_prices (variant_id, price_tier_id, price) values
--   ('5bf130c3-4b72-4801-86d7-a379afdb40e3'::uuid, 'a94104af-622b-4812-8b41-16ffee5cb057'::uuid, 7794),   -- aha-125
--   ('6841800a-f367-43c8-8a1e-1471715cafa7'::uuid, 'a94104af-622b-4812-8b41-16ffee5cb057'::uuid, 7194),   -- allrounder-125
--   ('c2d82215-c36f-48a9-b068-8b39494c5e34'::uuid, 'a94104af-622b-4812-8b41-16ffee5cb057'::uuid, 12600),  -- colombia-tablon-125
--   ('436c59e2-8bd2-4d0b-8001-3fc79e6e553c'::uuid, 'a94104af-622b-4812-8b41-16ffee5cb057'::uuid, 6594),   -- damn-good-125
--   ('6e08992c-6822-487b-b764-74287e627eef'::uuid, 'a94104af-622b-4812-8b41-16ffee5cb057'::uuid, 8100),   -- ethiopia-aricha-125
--   ('40faff02-80c3-491d-a063-3a8c2d641961'::uuid, 'a94104af-622b-4812-8b41-16ffee5cb057'::uuid, 15000),  -- ethiopia-bekele-125
--   ('abf151a9-42b7-4ac1-a5ad-f45d2e002ea8'::uuid, 'a94104af-622b-4812-8b41-16ffee5cb057'::uuid, 10200),  -- ethiopia-genet-125
--   ('7d868464-e233-4945-89cd-6c88a1574dd8'::uuid, 'a94104af-622b-4812-8b41-16ffee5cb057'::uuid, 7194),   -- ezpz-125
--   ('1486eeba-8f15-4100-8638-3e9715978d77'::uuid, 'a94104af-622b-4812-8b41-16ffee5cb057'::uuid, 11400),  -- guatemala-vista-125
--   ('22184d7a-11cd-488d-8b24-e6bebaa0b5fa'::uuid, 'a94104af-622b-4812-8b41-16ffee5cb057'::uuid, 12000),  -- honduras-monarca-125
--   ('2ce3b085-31e0-4902-b3b5-7e4e366f162a'::uuid, 'a94104af-622b-4812-8b41-16ffee5cb057'::uuid, 9000),   -- kenya-mugaya-125
--   ('aa3374ec-90dd-40c8-a6b1-7d1ef6ffea1c'::uuid, 'a94104af-622b-4812-8b41-16ffee5cb057'::uuid, 13800),  -- panama-auromar-125
--   ('47d31090-0320-4e49-9d97-f54bc043f24c'::uuid, 'a94104af-622b-4812-8b41-16ffee5cb057'::uuid, 33000),  -- panama-geisha-125
--   ('9085e391-49cd-451d-b895-8295de211f8e'::uuid, 'a94104af-622b-4812-8b41-16ffee5cb057'::uuid, 12600),  -- peru-tiringes-125
--   ('b16e3b5f-7065-46d2-8076-4c2032740846'::uuid, 'a94104af-622b-4812-8b41-16ffee5cb057'::uuid, 7794),   -- spotlight-125
--   ('4a968a6d-c165-4b27-96af-58661cb17707'::uuid, 'a94104af-622b-4812-8b41-16ffee5cb057'::uuid, 8400);   -- yirga-decaf-125


-- ═════════════════════════════════════════════════════════════
-- 검증
-- ═════════════════════════════════════════════════════════════
-- 소매용 변형은 전부 40%, 도매전용은 정가여야 한다.
-- select v.sku, v.base_price, coalesce(v.is_b2b_only,false) as b2b,
--        (select price  from public.mcp_resolve_price(v.id, '<도매-기본 고객 profile_id>')) as p,
--        (select source from public.mcp_resolve_price(v.id, '<도매-기본 고객 profile_id>')) as s
--   from public.product_variant v where v.is_active order by v.sku;
--
-- 신규 함수 권한 (기대: f / f / f / t)
-- select has_function_privilege('anon','public.tier_default_price(uuid,uuid)','execute'),
--        has_function_privilege('authenticated','public.tier_default_price(uuid,uuid)','execute'),
--        has_function_privilege('anon','public.admin_tier_price_table(uuid)','execute'),
--        has_function_privilege('authenticated','public.admin_tier_price_table(uuid)','execute');
