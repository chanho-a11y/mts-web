-- =====================================================================
-- MCP 설치 1/3 — 구조 생성 (데이터를 바꾸지 않음)
-- 2026-07-29 · 전체를 한 번에 붙여넣고 Run 하면 된다.
-- 이 파일은 mcp-foundation-20260729.sql + …b.sql 을 순서대로 합쳐 정리한 것이다.
-- 재실행해도 안전하다(create or replace / if not exists).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. 설정 테이블 + 접근 함수
-- ---------------------------------------------------------------------
create table if not exists public.mcp_config (
  key   text primary key,
  value text not null,
  note  text
);
alter table public.mcp_config add column if not exists value_json jsonb;
comment on table public.mcp_config is 'MCP 서버 고정 설정. 변경은 의도적 마이그레이션으로만.';

insert into public.mcp_config (key, value, note) values
  ('storefront_id',   'cfbd13ba-84cd-4a83-b2a6-eeec8419c79d', '이 인스턴스가 다루는 스토어프론트(mtspace.coffee)'),
  ('schema_version',  '1',      '패키지가 부팅 시 검사한다. 불일치면 조용히 넘기지 않고 실패시킨다.'),
  ('enabled_modules', 'coffee', '쉼표 구분. 일반 D2C 인스턴스는 빈 값.')
on conflict (key) do nothing;

insert into public.mcp_config (key, value, value_json, note) values (
  'product_attribute_schema', 'json',
  '[
    {"key":"roast_level","label_ko":"로스팅 정도","type":"string","group":"커피","show_in_list":true},
    {"key":"flavor_notes","label_ko":"풍미 노트","type":"string[]","group":"커피","show_in_list":true},
    {"key":"origin","label_ko":"원산지","type":"object","group":"커피","show_in_list":false},
    {"key":"producer","label_ko":"생산자","type":"string","group":"커피","show_in_list":false},
    {"key":"variety","label_ko":"품종","type":"string","group":"커피","show_in_list":false},
    {"key":"altitude","label_ko":"고도","type":"string","group":"커피","show_in_list":false},
    {"key":"process","label_ko":"가공방식","type":"string","group":"커피","show_in_list":false},
    {"key":"recipe","label_ko":"추출 레시피","type":"object","group":"커피","show_in_list":false},
    {"key":"packaging","label_ko":"포장","type":"string","group":"표시사항","show_in_list":false},
    {"key":"storage","label_ko":"보관방법","type":"string","group":"표시사항","show_in_list":false},
    {"key":"shelf_life","label_ko":"소비기한","type":"string","group":"표시사항","show_in_list":false},
    {"key":"ingredients","label_ko":"원재료명","type":"string","group":"표시사항","show_in_list":false},
    {"key":"maker_info","label_ko":"제조원","type":"string","group":"표시사항","show_in_list":false},
    {"key":"report_no","label_ko":"품목보고번호","type":"string","group":"표시사항","show_in_list":false},
    {"key":"material","label_ko":"재질","type":"string","group":"표시사항","show_in_list":false},
    {"key":"label_point","label_ko":"라벨 포인트","type":"string","group":"표시사항","show_in_list":false}
  ]'::jsonb,
  '이 인스턴스의 제품 속성 정의. 업종이 다르면 이 값과 mcp_v_product 만 바꾼다.'
) on conflict (key) do update set value_json = excluded.value_json, note = excluded.note;

create or replace function public.mcp_storefront_id()
returns uuid language sql stable security definer set search_path to 'public'
as $$ select value::uuid from public.mcp_config where key = 'storefront_id' $$;

create or replace function public.mcp_config_text(p_key text)
returns text language sql stable security definer set search_path to 'public'
as $$ select value from public.mcp_config where key = p_key $$;

create or replace function public.mcp_config_json(p_key text)
returns jsonb language sql stable security definer set search_path to 'public'
as $$ select value_json from public.mcp_config where key = p_key $$;


-- ---------------------------------------------------------------------
-- 2. 마스킹 함수
-- ---------------------------------------------------------------------
create or replace function public.mcp_mask_email(v text)
returns text language sql immutable as $$
  select case
    when v is null or position('@' in v) = 0 then null
    else left(split_part(v,'@',1), 2) || repeat('*', greatest(2, length(split_part(v,'@',1)) - 2))
         || '@' || split_part(v,'@',2)
  end
$$;

create or replace function public.mcp_mask_phone(v text)
returns text language sql immutable as $$
  select case
    when v is null then null
    when length(regexp_replace(v,'[^0-9]','','g')) < 4 then '****'
    else '****' || right(regexp_replace(v,'[^0-9]','','g'), 4)
  end
$$;

-- 배송지에서 광역 지역명만. 상세주소는 절대 노출하지 않는다.
create or replace function public.mcp_region(addr jsonb)
returns text language sql immutable as $$
  select nullif(split_part(coalesce(addr->>'addr1',''), ' ', 1), '')
$$;


-- ---------------------------------------------------------------------
-- 3. MCP 전용 롤 — 테이블 권한 없음. 뷰와 지정 함수만.
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'mcp_reader') then
    create role mcp_reader nologin noinherit;
  end if;
end $$;

grant mcp_reader to authenticator;   -- PostgREST 가 이 롤로 전환할 수 있게
grant usage on schema public to mcp_reader;

revoke all on all tables    in schema public from mcp_reader;
revoke all on all sequences in schema public from mcp_reader;
revoke all on all functions in schema public from mcp_reader;

comment on role mcp_reader is 'MCP 읽기 전용 롤. 테이블 권한 없음. mcp_v_* 뷰와 지정 함수만 접근 가능.';


-- ---------------------------------------------------------------------
-- 4. 화이트리스트 뷰
--    소유자(postgres) 권한으로 동작한다. mcp_reader 에게 원본 테이블 권한을
--    일절 주지 않고, 뷰 정의에 스코프 필터와 마스킹을 박아 유일한 통로로 만든다.
--    ※ Supabase Advisor 의 security_definer_view 경고는 위 이유로 수용한다.
-- ---------------------------------------------------------------------

-- 4-1. 상점
create or replace view public.mcp_v_shop as
select s.id as storefront_id, s.domain, s.locale, s.default_customer_type, s.is_active,
       b.code as brand_code, b.name as brand_name, b.legal_entity,
       b.default_locale, b.default_audience
from public.storefront s
join public.brand b on b.id = s.brand_id
where s.id = public.mcp_storefront_id();

-- 4-2. 상품 — 이식 계약. 업종별 네이티브 컬럼을 attributes jsonb 로 사상한다.
--      다른 업종 인스턴스는 이 뷰의 jsonb_build_object 내용만 바꾼다.
create or replace view public.mcp_v_product as
select
  p.id, p.slug,
  p.title_ko as title, p.title_en as title_en,
  p.one_liner, p.one_liner_en,
  p.product_type, p.status, p.is_b2b_only,
  p.weight_g, p.key_color,
  p.seo_title, p.seo_description, p.seo_title_en, p.seo_description_en,
  p.published_at, p.updated_at,
  ps.is_visible, ps.position,
  p.evidence,
  jsonb_strip_nulls(jsonb_build_object(
    'roast_level',  p.roast_level,
    'flavor_notes', to_jsonb(p.flavor_notes),
    'origin',       p.origin,
    'producer',     p.producer,
    'variety',      p.variety,
    'altitude',     p.altitude,
    'process',      p.process,
    'recipe',       p.recipe,
    'packaging',    p.packaging,
    'storage',      p.storage,
    'shelf_life',   p.shelf_life,
    'ingredients',  p.ingredients,
    'maker_info',   p.maker_info,
    'report_no',    p.report_no,
    'material',     p.material,
    'label_point',  p.label_point
  )) as attributes,
  jsonb_strip_nulls(jsonb_build_object(
    'roast_level',  p.roast_level_en,
    'flavor_notes', to_jsonb(p.flavor_notes_en),
    'producer',     p.producer_en,
    'variety',      p.variety_en,
    'altitude',     p.altitude_en,
    'process',      p.process_en,
    'recipe',       p.recipe_en,
    'packaging',    p.packaging_en,
    'storage',      p.storage_en,
    'shelf_life',   p.shelf_life_en,
    'ingredients',  p.ingredients_en,
    'maker_info',   p.maker_info_en
  )) as attributes_en
from public.product p
join public.product_storefronts ps
  on ps.product_id = p.id
 and ps.storefront_id = public.mcp_storefront_id();

comment on view public.mcp_v_product is
  'MCP 이식 계약. 업종별 네이티브 컬럼을 attributes jsonb 로 사상한다.';

-- 4-3. 옵션 · 가격 · 재고 · 이미지
create or replace view public.mcp_v_variant as
select v.id, v.product_id, v.sku, v.option_values, v.weight_g, v.grind,
       v.base_price, v.currency, v.is_active, v.is_b2b_only,
       v.inventory_policy, v.position
from public.product_variant v
where v.product_id in (select id from public.mcp_v_product);

create or replace view public.mcp_v_variant_price as
select vp.variant_id, vp.price, t.name as tier_name, t.is_b2b
from public.variant_prices vp
join public.price_tier t on t.id = vp.price_tier_id
where vp.variant_id in (select id from public.mcp_v_variant);

create or replace view public.mcp_v_inventory as
select v.id as variant_id, v.sku, v.product_id, v.inventory_policy, v.is_active,
       coalesce(sum(l.delta), 0)::int as on_hand
from public.mcp_v_variant v
left join public.inventory_ledger l on l.variant_id = v.id
group by v.id, v.sku, v.product_id, v.inventory_policy, v.is_active;

create or replace view public.mcp_v_product_image as
select i.product_id, i.variant_id, i.storage_path, i.alt, i.position, i.is_primary
from public.product_image i
where i.product_id in (select id from public.mcp_v_product);

-- 4-4. 주문 (PII 마스킹 · 배송상세 제외)
create or replace view public.mcp_v_order as
select o.id, o.order_no, o.status, o.customer_type, o.profile_id, o.channel,
       public.mcp_mask_email(o.email) as email_masked,
       public.mcp_mask_phone(o.phone) as phone_masked,
       public.mcp_region(o.shipping_address) as region,
       o.items_subtotal, o.discount_total, o.shipping_fee, o.tax_amount,
       o.grand_total, o.currency, o.coupon_code, o.tax_invoice_requested,
       o.placed_at, o.paid_at
from public.orders o
where o.storefront_id = public.mcp_storefront_id();

create or replace view public.mcp_v_order_item as
select i.order_id, i.variant_id, i.sku, i.title_snapshot, i.option_snapshot,
       i.unit_price, i.price_source, i.qty, i.cancelled_qty, i.line_total
from public.order_item i
where i.order_id in (select id from public.mcp_v_order);

-- 결제 원문(raw_response·auth_token·pg_tid)은 아예 뽑지 않는다.
create or replace view public.mcp_v_payment as
select p.order_id, p.provider, p.method, p.status, p.amount, p.currency, p.approved_at
from public.payment p
where p.order_id in (select id from public.mcp_v_order);

create or replace view public.mcp_v_shipment as
select s.order_id, s.carrier, s.status, s.shipped_at
from public.shipment s
where s.order_id in (select id from public.mcp_v_order);

-- 4-5. 고객 (PII 마스킹)
create or replace view public.mcp_v_customer as
select pr.id, pr.name,
       public.mcp_mask_email(pr.email) as email_masked,
       public.mcp_mask_phone(pr.phone) as phone_masked,
       pr.role, pr.language, pr.marketing_opt_in, pr.archived, pr.created_at,
       t.name as price_tier, t.is_b2b,
       ba.company_name, ba.status as business_status, ba.approved_at
from public.profiles pr
left join public.price_tier t on t.id = pr.price_tier_id
left join public.business_accounts ba on ba.profile_id = pr.id;

create or replace view public.mcp_v_customer_price as
select c.profile_id, c.variant_id, c.price, c.starts_at, c.ends_at, c.note
from public.customer_variant_prices c
where c.variant_id in (select id from public.mcp_v_variant);

-- 4-6. 콘텐츠 · KB
create or replace view public.mcp_v_content_post as
select cp.id, cp.slug, cp.title, cp.excerpt, cp.tags, cp.author, cp.status,
       cp.published_at, cp.seo_title, cp.seo_description
from public.content_post cp
where cp.storefront_id = public.mcp_storefront_id() or cp.storefront_id is null;

create or replace view public.mcp_v_faq as
select f.id, f.question, f.answer_html, f.category, f.is_b2b_only, f.status, f.position
from public.faq f
where f.storefront_id = public.mcp_storefront_id() or f.storefront_id is null;

create or replace view public.mcp_v_kb_entry as
select k.id, k.term, k.definition, k.category, k.position
from public.kb_entry k;


-- ---------------------------------------------------------------------
-- 5. 단가 확정 함수 (MCP 전용)
--    기존 public.resolve_price 는 호출자가 admin/service_role 이 아니면
--    p_profile_id 를 auth.uid() 로 되돌린다 → mcp_reader 로는 개별가를 못 본다.
--    산정 규칙(개별가 → 등급가 → 기본가)은 원본과 동일하게 유지한다.
-- ---------------------------------------------------------------------
create or replace function public.mcp_resolve_price(
  p_variant_id uuid,
  p_profile_id uuid default null,
  p_at timestamptz default now()
)
returns table(price integer, source text)
language sql stable security definer set search_path to 'public'
as $$
  with v as (
    select id from public.product_variant
     where id = p_variant_id
       and product_id in (select product_id from public.product_storefronts
                           where storefront_id = public.mcp_storefront_id())
  )
  (select cvp.price, 'individual'::text
     from public.customer_variant_prices cvp, v
    where cvp.variant_id = v.id and cvp.profile_id = p_profile_id
      and p_at >= cvp.starts_at and (cvp.ends_at is null or p_at < cvp.ends_at)
    order by cvp.starts_at desc limit 1)
  union all
  (select vp.price, 'tier'::text
     from public.variant_prices vp
     join public.profiles pr on pr.id = p_profile_id, v
    where vp.variant_id = v.id and vp.price_tier_id = pr.price_tier_id
      and not exists (select 1 from public.customer_variant_prices c
                       where c.variant_id = v.id and c.profile_id = p_profile_id
                         and p_at >= c.starts_at and (c.ends_at is null or p_at < c.ends_at))
    limit 1)
  union all
  (select pv.base_price, 'base'::text
     from public.product_variant pv, v
    where pv.id = v.id
      and not exists (select 1 from public.customer_variant_prices c
                       where c.variant_id = v.id and c.profile_id = p_profile_id
                         and p_at >= c.starts_at and (c.ends_at is null or p_at < c.ends_at))
      and not exists (select 1 from public.variant_prices vp2
                       join public.profiles pr2 on pr2.id = p_profile_id
                      where vp2.variant_id = v.id and vp2.price_tier_id = pr2.price_tier_id)
    limit 1)
  limit 1
$$;


-- ---------------------------------------------------------------------
-- 6. 토큰 · 감사로그
-- ---------------------------------------------------------------------
create table if not exists public.mcp_token (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references public.profiles(id) on delete cascade,
  name         text not null,
  token_hash   text not null unique,       -- 원문 미저장. SHA-256.
  scopes       text[] not null default '{}',
  expires_at   timestamptz,
  last_used_at timestamptz,
  revoked_at   timestamptz,
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);
alter table public.mcp_token enable row level security;
comment on table public.mcp_token is 'MCP 접근 토큰(해시). RLS 정책 없음 = service-role 외 접근 불가.';

create table if not exists public.mcp_audit_log (
  id            bigserial primary key,
  token_id      uuid references public.mcp_token(id) on delete set null,
  profile_id    uuid references public.profiles(id) on delete set null,
  tool          text not null,
  args_redacted jsonb,
  scope_used    text[],
  row_count     int,
  duration_ms   int,
  status        text not null,             -- ok | denied | error
  error_code    text,
  pii_unmasked  boolean not null default false,
  raw_sql       boolean not null default false,
  created_at    timestamptz not null default now()
);
alter table public.mcp_audit_log enable row level security;
create index if not exists mcp_audit_log_created_idx on public.mcp_audit_log (created_at desc);
create index if not exists mcp_audit_log_profile_idx on public.mcp_audit_log (profile_id, created_at desc);

-- 감사로그 기록(삽입 전용 통로)
create or replace function public.mcp_audit(
  p_token_id uuid, p_profile_id uuid, p_tool text, p_args jsonb,
  p_scopes text[], p_rows int, p_ms int, p_status text,
  p_error text default null, p_pii boolean default false, p_sql boolean default false
) returns void
language sql security definer set search_path to 'public'
as $$
  insert into public.mcp_audit_log
    (token_id, profile_id, tool, args_redacted, scope_used, row_count, duration_ms, status, error_code, pii_unmasked, raw_sql)
  values
    (p_token_id, p_profile_id, p_tool, p_args, p_scopes, p_rows, p_ms, p_status, p_error, p_pii, p_sql)
$$;

-- 토큰 검증 (인증 경로에도 service_role 을 쓰지 않기 위한 통로)
create or replace function public.mcp_verify_token(p_hash text)
returns table(token_id uuid, profile_id uuid, role text, scopes text[], name text)
language sql stable security definer set search_path to 'public'
as $$
  select t.id, t.profile_id, pr.role::text, t.scopes, t.name
  from public.mcp_token t
  join public.profiles pr on pr.id = t.profile_id
  where t.token_hash = p_hash
    and t.revoked_at is null
    and (t.expires_at is null or t.expires_at > now())
    and coalesce(pr.archived, false) = false
  limit 1
$$;

create or replace function public.mcp_touch_token(p_token_id uuid)
returns void language sql security definer set search_path to 'public'
as $$ update public.mcp_token set last_used_at = now() where id = p_token_id $$;

-- 토큰 해시 계산(발급 시 사용). Postgres 내장 sha256 사용 — pgcrypto 불필요.
create or replace function public.mcp_hash_token(p_token text)
returns text language sql immutable
as $$ select encode(sha256(convert_to(p_token, 'UTF8')), 'hex') $$;


-- ---------------------------------------------------------------------
-- 7. 권한 — 뷰와 지정 함수만
-- ---------------------------------------------------------------------
grant select on
  public.mcp_v_shop,
  public.mcp_v_product,
  public.mcp_v_variant,
  public.mcp_v_variant_price,
  public.mcp_v_inventory,
  public.mcp_v_product_image,
  public.mcp_v_order,
  public.mcp_v_order_item,
  public.mcp_v_payment,
  public.mcp_v_shipment,
  public.mcp_v_customer,
  public.mcp_v_customer_price,
  public.mcp_v_content_post,
  public.mcp_v_faq,
  public.mcp_v_kb_entry
to mcp_reader;

grant execute on function public.mcp_storefront_id()                        to mcp_reader;
grant execute on function public.mcp_config_text(text)                      to mcp_reader;
grant execute on function public.mcp_config_json(text)                      to mcp_reader;
grant execute on function public.mcp_resolve_price(uuid, uuid, timestamptz) to mcp_reader;
grant execute on function public.mcp_verify_token(text)                     to mcp_reader;
grant execute on function public.mcp_touch_token(uuid)                      to mcp_reader;
grant execute on function public.mcp_audit(uuid, uuid, text, jsonb, text[], int, int, text, text, boolean, boolean) to mcp_reader;

-- SECURITY DEFINER 함수는 기본적으로 PUBLIC 에 EXECUTE 가 열린다. 즉시 회수한다.
revoke execute on function public.mcp_storefront_id()                        from public, anon, authenticated;
revoke execute on function public.mcp_config_text(text)                      from public, anon, authenticated;
revoke execute on function public.mcp_config_json(text)                      from public, anon, authenticated;
revoke execute on function public.mcp_resolve_price(uuid, uuid, timestamptz) from public, anon, authenticated;
revoke execute on function public.mcp_verify_token(text)                     from public, anon, authenticated;
revoke execute on function public.mcp_touch_token(uuid)                      from public, anon, authenticated;
revoke execute on function public.mcp_hash_token(text)                       from public, anon, authenticated;
revoke execute on function public.mcp_audit(uuid, uuid, text, jsonb, text[], int, int, text, text, boolean, boolean) from public, anon, authenticated;

revoke insert, update, delete, truncate on all tables in schema public from mcp_reader;

select '구조 생성 완료' as result;
