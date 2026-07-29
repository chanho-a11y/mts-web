-- =====================================================================
-- MTSPACE COMMERCE MCP — 기반 마이그레이션 초안 (③)
-- 작성 2026-07-29 · 설계서 v1 §6.3·§6.4·§6.5 구현
--
-- ⚠️ 검토 전 실행 금지. 대표 확인 후 Supabase SQL Editor에서 블록 단위로 실행할 것.
-- ⚠️ §2 백필은 데이터를 변경한다. 나머지는 생성 전용이다.
--
-- 설계 원칙
--   · mcp_reader 롤은 어떤 테이블에도 권한이 없다. mcp_v_* 뷰와 지정 함수만 볼 수 있다.
--     → 뷰 정의가 곧 접근 정책이다. MCP 애플리케이션에 버그가 나도 DB가 막는다.
--   · 스토어프론트 잠금은 뷰 정의 안에 박는다. 파라미터로 바꿀 수 없다.
--     → normcorecoffee.com 데이터는 뷰를 통해 나올 수 없다.
--   · service_role 은 MCP에서 사용하지 않는다(D-092·093과 동일한 함정).
-- =====================================================================


-- =====================================================================
-- 1. MCP 설정 — 스토어프론트 잠금
-- =====================================================================

create table if not exists public.mcp_config (
  key   text primary key,
  value text not null,
  note  text
);
comment on table public.mcp_config is 'MCP 서버 고정 설정. 스토어프론트 잠금 등. 변경은 의도적 마이그레이션으로만.';

insert into public.mcp_config (key, value, note) values
  ('storefront_id', 'cfbd13ba-84cd-4a83-b2a6-eeec8419c79d', 'mtspace.coffee 고정. normcorecoffee.com은 MCP 대상이 아니다.')
on conflict (key) do nothing;

create or replace function public.mcp_storefront_id()
returns uuid
language sql
stable
security definer
set search_path to 'public'
as $$ select value::uuid from public.mcp_config where key = 'storefront_id' $$;

comment on function public.mcp_storefront_id() is 'MCP가 다루는 유일한 스토어프론트. 모든 mcp_v_* 뷰가 이 값으로 필터한다.';


-- =====================================================================
-- 2. [데이터 변경] 주문 storefront_id / brand_id 백필
--
--   실측(2026-07-29): orders 35건 전부 storefront_id·brand_id 가 NULL.
--   원인: app/checkout/actions.ts 의 orders insert 가 두 컬럼을 채우지 않음.
--   영향: MCP 주문 조회가 0건이 되는 것은 물론, normcore 스토어프론트를 열면
--         주문을 브랜드별로 나눌 수 없다(정산·분석·메일 브랜드 분기 전부).
--   조치: ① 아래 백필 ② checkout/actions.ts 수정(별도) ③ 이후 NOT NULL 검토
-- =====================================================================

-- 2-1. 실행 전 확인
select count(*) filter (where storefront_id is null) as null_storefront,
       count(*) filter (where brand_id is null)      as null_brand,
       count(*)                                       as total
from public.orders;

-- 2-2. 백필 (현재 운영 스토어프론트가 mtspace 하나뿐이므로 전량 할당)
--      ※ normcore 스토어프론트가 실제로 열린 뒤에는 이 문장을 그대로 쓰지 말 것.
update public.orders o
set storefront_id = s.id,
    brand_id      = s.brand_id
from public.storefront s
where s.id = public.mcp_storefront_id()
  and (o.storefront_id is null or o.brand_id is null);

-- 2-3. 실행 후 확인 — 두 값 모두 0이어야 한다
select count(*) filter (where storefront_id is null) as null_storefront,
       count(*) filter (where brand_id is null)      as null_brand
from public.orders;

-- 2-4. [보류] 코드 수정 배포 후에 적용할 것. 지금 걸면 체크아웃이 깨진다.
-- alter table public.orders alter column storefront_id set not null;
-- alter table public.orders alter column brand_id      set not null;


-- =====================================================================
-- 3. 마스킹 함수
-- =====================================================================

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

-- 배송지에서 광역 지역명만 추출(분석용). 상세주소는 절대 노출하지 않는다.
create or replace function public.mcp_region(addr jsonb)
returns text language sql immutable as $$
  select nullif(split_part(coalesce(addr->>'addr1',''), ' ', 1), '')
$$;


-- =====================================================================
-- 4. MCP 전용 롤
-- =====================================================================

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'mcp_reader') then
    create role mcp_reader nologin noinherit;
  end if;
end $$;

-- PostgREST(authenticator)가 이 롤로 전환할 수 있게 한다.
-- MCP 서버는 role 클레임이 mcp_reader 인 단명 JWT를 발급해 supabase-js에 붙인다.
grant mcp_reader to authenticator;

grant usage on schema public to mcp_reader;

-- 안전장치: PUBLIC 경유로 새어 들어올 수 있는 권한을 모두 회수한다.
revoke all on all tables    in schema public from mcp_reader;
revoke all on all sequences in schema public from mcp_reader;
revoke all on all functions in schema public from mcp_reader;

comment on role mcp_reader is 'MCP 읽기 전용 롤. 테이블 권한 없음. mcp_v_* 뷰와 지정 함수만 접근 가능.';


-- =====================================================================
-- 5. 화이트리스트 뷰 (mcp_v_*)
--
--   이 뷰들은 소유자(postgres) 권한으로 동작한다(security_invoker = false, 기본값).
--   의도적 선택이다: mcp_reader 에게 원본 테이블 권한을 일절 주지 않고,
--   뷰 정의에 스토어프론트 필터와 마스킹을 박아 유일한 통로로 만든다.
--   ※ Supabase Advisor 가 security_definer_view 를 경고할 수 있다. 위 이유로 수용한다.
-- =====================================================================

-- 5-1. 상품
create or replace view public.mcp_v_product as
select p.id, p.slug, p.title_ko, p.title_en, p.one_liner, p.one_liner_en,
       p.product_type, p.status, p.is_b2b_only,
       p.roast_level, p.roast_level_en, p.flavor_notes, p.flavor_notes_en,
       p.origin, p.producer, p.variety, p.process, p.altitude,
       p.weight_g, p.packaging, p.storage, p.shelf_life, p.ingredients,
       p.key_color, p.report_no, p.recipe, p.recipe_en, p.evidence,
       p.seo_title, p.seo_description, p.published_at, p.updated_at,
       ps.is_visible, ps.position
from public.product p
join public.product_storefronts ps
  on ps.product_id = p.id
 and ps.storefront_id = public.mcp_storefront_id();   -- ← normcore 차단 지점

-- 5-2. 옵션(variant)
create or replace view public.mcp_v_variant as
select v.id, v.product_id, v.sku, v.option_values, v.weight_g, v.grind,
       v.base_price, v.currency, v.is_active, v.is_b2b_only,
       v.inventory_policy, v.position
from public.product_variant v
where v.product_id in (select id from public.mcp_v_product);

-- 5-3. 등급가
create or replace view public.mcp_v_variant_price as
select vp.variant_id, vp.price, t.name as tier_name, t.is_b2b
from public.variant_prices vp
join public.price_tier t on t.id = vp.price_tier_id
where vp.variant_id in (select id from public.mcp_v_variant);

-- 5-4. 판매 재고 (원장 합계)
--      ※ 로스터리 생산·원료 수불이 아니다. RoasteryFlow 와 무관하다.
create or replace view public.mcp_v_inventory as
select v.id as variant_id, v.sku, v.product_id, v.inventory_policy, v.is_active,
       coalesce(sum(l.delta), 0)::int as on_hand
from public.mcp_v_variant v
left join public.inventory_ledger l on l.variant_id = v.id
group by v.id, v.sku, v.product_id, v.inventory_policy, v.is_active;

-- 5-5. 상품 이미지
create or replace view public.mcp_v_product_image as
select i.product_id, i.variant_id, i.storage_path, i.alt, i.position, i.is_primary
from public.product_image i
where i.product_id in (select id from public.mcp_v_product);

-- 5-6. 주문 (PII 마스킹 · 배송상세 제외)
create or replace view public.mcp_v_order as
select o.id, o.order_no, o.status, o.customer_type, o.profile_id, o.channel,
       public.mcp_mask_email(o.email) as email_masked,
       public.mcp_mask_phone(o.phone) as phone_masked,
       public.mcp_region(o.shipping_address) as region,
       o.items_subtotal, o.discount_total, o.shipping_fee, o.tax_amount,
       o.grand_total, o.currency, o.coupon_code, o.tax_invoice_requested,
       o.placed_at, o.paid_at
from public.orders o
where o.storefront_id = public.mcp_storefront_id();   -- ← normcore 차단 지점

-- 5-7. 주문 품목
create or replace view public.mcp_v_order_item as
select i.order_id, i.variant_id, i.sku, i.title_snapshot, i.option_snapshot,
       i.unit_price, i.price_source, i.qty, i.cancelled_qty, i.line_total
from public.order_item i
where i.order_id in (select id from public.mcp_v_order);

-- 5-8. 결제 (원문·토큰·PG TID 제외)
create or replace view public.mcp_v_payment as
select p.order_id, p.provider, p.method, p.status, p.amount, p.currency, p.approved_at
from public.payment p
where p.order_id in (select id from public.mcp_v_order);

-- 5-9. 배송
create or replace view public.mcp_v_shipment as
select s.order_id, s.carrier, s.status, s.shipped_at
from public.shipment s
where s.order_id in (select id from public.mcp_v_order);

-- 5-10. 고객 (PII 마스킹)
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

-- 5-11. 고객별 개별가
create or replace view public.mcp_v_customer_price as
select c.profile_id, c.variant_id, c.price, c.starts_at, c.ends_at, c.note
from public.customer_variant_prices c
where c.variant_id in (select id from public.mcp_v_variant);

-- 5-12. 콘텐츠
create or replace view public.mcp_v_content_post as
select cp.id, cp.slug, cp.title, cp.excerpt, cp.tags, cp.author, cp.status,
       cp.published_at, cp.seo_title, cp.seo_description
from public.content_post cp
where cp.storefront_id = public.mcp_storefront_id()
   or cp.storefront_id is null;

create or replace view public.mcp_v_faq as
select f.id, f.question, f.answer_html, f.category, f.is_b2b_only, f.status, f.position
from public.faq f
where f.storefront_id = public.mcp_storefront_id()
   or f.storefront_id is null;

-- 5-13. 지식베이스 (커피 모듈)
create or replace view public.mcp_v_kb_entry as
select k.id, k.term, k.definition, k.category, k.position
from public.kb_entry k;


-- =====================================================================
-- 6. 가격 확정 함수 (MCP 전용)
--
--   기존 public.resolve_price 는 호출자가 admin/service_role 이 아니면
--   p_profile_id 를 auth.uid() 로 되돌린다. mcp_reader 는 둘 다 아니므로
--   임의 고객의 단가를 확정할 수 없다. 아래 래퍼가 그 경로를 연다.
--   단가 산정 규칙(개별가 → 등급가 → 기본가)은 원본과 동일하게 유지한다.
-- =====================================================================

create or replace function public.mcp_resolve_price(
  p_variant_id uuid,
  p_profile_id uuid default null,
  p_at timestamptz default now()
)
returns table(price integer, source text)
language sql
stable
security definer
set search_path to 'public'
as $$
  with v as (
    select id from public.product_variant
     where id = p_variant_id
       and product_id in (
         select product_id from public.product_storefronts
          where storefront_id = public.mcp_storefront_id()
       )
  )
  (select cvp.price, 'individual'::text
     from public.customer_variant_prices cvp, v
    where cvp.variant_id = v.id and cvp.profile_id = p_profile_id
      and p_at >= cvp.starts_at and (cvp.ends_at is null or p_at < cvp.ends_at)
    order by cvp.starts_at desc limit 1)
  union all
  (select vp.price, 'tier'::text
     from public.variant_prices vp
     join public.profiles pr on pr.id = p_profile_id
     , v
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

comment on function public.mcp_resolve_price(uuid, uuid, timestamptz) is
  'MCP 전용 단가 확정. 스토어프론트 잠금 포함. 규칙은 public.resolve_price 와 동일(개별가→등급가→기본가).';


-- =====================================================================
-- 7. 토큰 · 감사로그
-- =====================================================================

create table if not exists public.mcp_token (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  name        text not null,
  token_hash  text not null unique,          -- 원문 미저장. SHA-256.
  scopes      text[] not null default '{}',
  expires_at  timestamptz,
  last_used_at timestamptz,
  revoked_at  timestamptz,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);
alter table public.mcp_token enable row level security;
comment on table public.mcp_token is 'MCP 접근 토큰(해시). P0 정적 헤더 인증 및 서버-투-서버용. 사람 사용자는 P1부터 OAuth 경유. service-role 전용.';

create table if not exists public.mcp_audit_log (
  id            bigserial primary key,
  token_id      uuid references public.mcp_token(id) on delete set null,
  profile_id    uuid references public.profiles(id) on delete set null,
  tool          text not null,
  args_redacted jsonb,
  scope_used    text[],
  row_count     int,
  duration_ms   int,
  status        text not null,               -- ok | denied | error
  error_code    text,
  pii_unmasked  boolean not null default false,
  raw_sql       boolean not null default false,
  created_at    timestamptz not null default now()
);
alter table public.mcp_audit_log enable row level security;
create index if not exists mcp_audit_log_created_idx on public.mcp_audit_log (created_at desc);
create index if not exists mcp_audit_log_profile_idx on public.mcp_audit_log (profile_id, created_at desc);
comment on table public.mcp_audit_log is 'MCP 전 호출 감사로그. 누가·언제·무엇을. PII 언마스킹과 raw SQL 호출은 별도 플래그.';

-- RLS: 정책을 만들지 않는다 → service_role 외에는 접근 불가.

-- mcp_reader 는 읽기 전용이지만 감사로그는 남겨야 한다. 삽입 전용 통로.
create or replace function public.mcp_audit(
  p_token_id uuid, p_profile_id uuid, p_tool text, p_args jsonb,
  p_scopes text[], p_rows int, p_ms int, p_status text,
  p_error text default null, p_pii boolean default false, p_sql boolean default false
) returns void
language sql
security definer
set search_path to 'public'
as $$
  insert into public.mcp_audit_log
    (token_id, profile_id, tool, args_redacted, scope_used, row_count, duration_ms, status, error_code, pii_unmasked, raw_sql)
  values
    (p_token_id, p_profile_id, p_tool, p_args, p_scopes, p_rows, p_ms, p_status, p_error, p_pii, p_sql)
$$;


-- =====================================================================
-- 8. 권한 부여 — 뷰와 지정 함수만
-- =====================================================================

grant select on
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
grant execute on function public.mcp_resolve_price(uuid, uuid, timestamptz) to mcp_reader;
grant execute on function public.mcp_audit(uuid, uuid, text, jsonb, text[], int, int, text, text, boolean, boolean) to mcp_reader;

-- 명시적 차단: 쓰기와 원본 테이블 접근은 어떤 경우에도 없다.
revoke insert, update, delete, truncate on all tables in schema public from mcp_reader;

-- SECURITY DEFINER 함수는 기본적으로 PUBLIC 에 EXECUTE 가 열린다.
-- D-092 잔여 항목("SECURITY DEFINER 함수 EXECUTE 회수")과 같은 취지로 즉시 회수한다.
revoke execute on function public.mcp_resolve_price(uuid, uuid, timestamptz) from public, anon, authenticated;
revoke execute on function public.mcp_audit(uuid, uuid, text, jsonb, text[], int, int, text, text, boolean, boolean) from public, anon, authenticated;
revoke execute on function public.mcp_storefront_id() from public, anon, authenticated;
-- 위 3개 회수 후 §8 상단의 grant 로 mcp_reader 에게만 다시 부여된 상태여야 한다.
-- 확인: select p.proname, array_agg(a.rolname) from pg_proc p
--        cross join lateral aclexplode(p.proacl) x join pg_roles a on a.oid = x.grantee
--        where p.proname like 'mcp\_%' group by 1;


-- =====================================================================
-- 9. 검증 — 아래 4개 침투 테스트가 모두 기대값이어야 한다
-- =====================================================================

-- 9-1. mcp_reader 가 가진 테이블 권한 → 0행이어야 한다(뷰는 제외)
select c.relname, p.privilege_type
from information_schema.table_privileges p
join pg_class c on c.relname = p.table_name
where p.grantee = 'mcp_reader' and c.relkind = 'r';

-- 9-2. 타 스토어프론트 상품이 뷰에 보이는가 → 0행이어야 한다
select count(*) as leaked_products
from public.product_storefronts ps
where ps.storefront_id <> public.mcp_storefront_id()
  and ps.product_id in (select id from public.mcp_v_product)
  and ps.product_id not in (
    select product_id from public.product_storefronts
     where storefront_id = public.mcp_storefront_id());

-- 9-3. 타 스토어프론트 주문이 뷰에 보이는가 → 0행이어야 한다
select count(*) as leaked_orders
from public.orders o
where o.storefront_id is distinct from public.mcp_storefront_id()
  and o.id in (select id from public.mcp_v_order);

-- 9-4. 뷰에 원문 PII 가 남아 있는가 → email_masked 에 '@' 앞 3자 이상 노출 없음 확인
select email_masked, phone_masked from public.mcp_v_customer limit 5;

-- 9-5. 미할당 주문 → §2 백필 후 0이어야 한다
select count(*) as unassigned_orders from public.orders where storefront_id is null;


-- =====================================================================
-- 10. 롤백 (필요 시)
-- =====================================================================
-- drop view if exists public.mcp_v_kb_entry, public.mcp_v_faq, public.mcp_v_content_post,
--   public.mcp_v_customer_price, public.mcp_v_customer, public.mcp_v_shipment,
--   public.mcp_v_payment, public.mcp_v_order_item, public.mcp_v_order,
--   public.mcp_v_product_image, public.mcp_v_inventory, public.mcp_v_variant_price,
--   public.mcp_v_variant, public.mcp_v_product;
-- drop function if exists public.mcp_resolve_price(uuid, uuid, timestamptz);
-- drop function if exists public.mcp_audit(uuid, uuid, text, jsonb, text[], int, int, text, text, boolean, boolean);
-- drop function if exists public.mcp_region(jsonb), public.mcp_mask_phone(text), public.mcp_mask_email(text);
-- drop table if exists public.mcp_audit_log; drop table if exists public.mcp_token;
-- drop function if exists public.mcp_storefront_id(); drop table if exists public.mcp_config;
-- revoke mcp_reader from authenticator; drop role if exists mcp_reader;
-- ※ §2 백필은 롤백 대상이 아니다(정상 데이터 보정).
