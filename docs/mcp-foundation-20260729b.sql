-- =====================================================================
-- MTSPACE COMMERCE MCP — 기반 마이그레이션 개정분 (b)
-- 작성 2026-07-29 · 설계서 v1.2 §2.2~2.4 반영
--
-- 선행: mcp-foundation-20260729.sql 실행 후에 적용할 것.
-- ⚠️ 검토 전 실행 금지. 생성/치환 전용이며 데이터를 바꾸지 않는다.
--
-- 개정 이유
--   인도 모델이 "고객사 웹사이트를 같은 스택·구조로 개발 제공"으로 확정되면서,
--   product 56컬럼 중 29개가 커피·한국 식품표시 전용이라는 점이 이식성의 걸림돌이 됐다.
--   → 뷰를 "이식 계약"으로 승격한다. 업종 차이는 뷰가 흡수하고,
--     @mts/commerce-mcp 패키지는 네이티브 컬럼명을 일절 모른다.
-- =====================================================================


-- =====================================================================
-- 1. mcp_config 확장 — 스키마 버전 · 속성 디스크립터 · 활성 모듈
-- =====================================================================

insert into public.mcp_config (key, value, note) values
  ('schema_version', '1', '패키지가 부팅 시 검사한다. 불일치면 조용히 넘기지 않고 실패시킨다.'),
  ('enabled_modules', 'coffee', '쉼표 구분. 일반 D2C 인스턴스는 빈 값.')
on conflict (key) do nothing;

-- 디스크립터는 jsonb 라 별도 컬럼에 둔다(mcp_config.value 는 text).
alter table public.mcp_config add column if not exists value_json jsonb;
comment on column public.mcp_config.value_json is 'jsonb 설정값. product_attribute_schema 등.';

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
  '이 인스턴스의 제품 속성 정의. commerce_get_schema 가 그대로 반환한다. 업종이 다르면 이 값과 mcp_v_product 만 바꾼다.'
) on conflict (key) do update set value_json = excluded.value_json, note = excluded.note;

create or replace function public.mcp_config_json(p_key text)
returns jsonb language sql stable security definer set search_path to 'public'
as $$ select value_json from public.mcp_config where key = p_key $$;

create or replace function public.mcp_config_text(p_key text)
returns text language sql stable security definer set search_path to 'public'
as $$ select value from public.mcp_config where key = p_key $$;


-- =====================================================================
-- 2. mcp_v_product 치환 — 균일 계약 (이식의 실체)
--
--   어느 인스턴스에서든 아래 모양을 반환한다:
--     id · slug · title · title_en · one_liner(_en) · product_type · status
--     · is_b2b_only · weight_g · key_color · seo_* · published_at · updated_at
--     · is_visible · position · attributes · attributes_en · evidence
--
--   업종이 바뀌면 이 뷰의 jsonb_build_object 내용만 바꾼다.
--   패키지 코드와 툴 스키마는 손대지 않는다.
-- =====================================================================

drop view if exists public.mcp_v_product cascade;

create view public.mcp_v_product as
select
  p.id,
  p.slug,
  p.title_ko            as title,
  p.title_en            as title_en,
  p.one_liner,
  p.one_liner_en,
  p.product_type,
  p.status,
  p.is_b2b_only,
  p.weight_g,
  p.key_color,
  p.seo_title,
  p.seo_description,
  p.seo_title_en,
  p.seo_description_en,
  p.published_at,
  p.updated_at,
  ps.is_visible,
  ps.position,
  p.evidence,
  -- ↓ 업종 속성. 디스크립터(mcp_config.product_attribute_schema)의 key 와 1:1로 맞춘다.
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
  'MCP 이식 계약. 업종별 네이티브 컬럼을 attributes jsonb 로 사상한다. 다른 업종 인스턴스는 이 뷰만 다시 쓴다.';


-- =====================================================================
-- 3. cascade 로 지워진 종속 뷰 재생성
--    (mcp_v_variant · mcp_v_variant_price · mcp_v_inventory · mcp_v_product_image
--     · mcp_v_customer_price 는 mcp_v_product/mcp_v_variant 를 참조한다)
-- =====================================================================

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

create or replace view public.mcp_v_customer_price as
select c.profile_id, c.variant_id, c.price, c.starts_at, c.ends_at, c.note
from public.customer_variant_prices c
where c.variant_id in (select id from public.mcp_v_variant);


-- =====================================================================
-- 3-2. 상점 정보 뷰 (commerce_get_shop_info 용)
--      mcp_reader 는 storefront·brand 테이블에 권한이 없다. 이 뷰가 유일한 통로다.
-- =====================================================================

create or replace view public.mcp_v_shop as
select s.id as storefront_id, s.domain, s.locale, s.default_customer_type, s.is_active,
       b.code as brand_code, b.name as brand_name, b.legal_entity,
       b.default_locale, b.default_audience
from public.storefront s
join public.brand b on b.id = s.brand_id
where s.id = public.mcp_storefront_id();


-- =====================================================================
-- 3-3. 토큰 검증 함수 (P0 정적 헤더 인증)
--
--   mcp_reader 는 mcp_token 테이블에 권한이 없다. 아래 두 함수만 통한다.
--   토큰 원문은 저장하지 않으며 SHA-256 해시로만 대조한다.
--   ※ 인증 경로에도 service_role 을 쓰지 않기 위한 설계다.
-- =====================================================================

create or replace function public.mcp_verify_token(p_hash text)
returns table(token_id uuid, profile_id uuid, role text, scopes text[], name text)
language sql
stable
security definer
set search_path to 'public'
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
returns void
language sql
security definer
set search_path to 'public'
as $$
  update public.mcp_token set last_used_at = now() where id = p_token_id
$$;

-- 토큰 발급 보조: 해시 계산(관리자 화면에서 사용). pgcrypto 필요.
create extension if not exists pgcrypto with schema extensions;

create or replace function public.mcp_hash_token(p_token text)
returns text language sql immutable
as $$ select encode(extensions.digest(p_token, 'sha256'), 'hex') $$;


-- =====================================================================
-- 4. 권한 재부여 (drop/create 로 초기화됨)
-- =====================================================================

grant select on
  public.mcp_v_product,
  public.mcp_v_variant,
  public.mcp_v_variant_price,
  public.mcp_v_inventory,
  public.mcp_v_product_image,
  public.mcp_v_customer_price,
  public.mcp_v_shop
to mcp_reader;

grant execute on function public.mcp_verify_token(text) to mcp_reader;
grant execute on function public.mcp_touch_token(uuid)  to mcp_reader;
revoke execute on function public.mcp_verify_token(text) from public, anon, authenticated;
revoke execute on function public.mcp_touch_token(uuid)  from public, anon, authenticated;
revoke execute on function public.mcp_hash_token(text)   from public, anon, authenticated;

grant execute on function public.mcp_config_json(text) to mcp_reader;
grant execute on function public.mcp_config_text(text) to mcp_reader;
revoke execute on function public.mcp_config_json(text) from public, anon, authenticated;
revoke execute on function public.mcp_config_text(text) from public, anon, authenticated;


-- =====================================================================
-- 5. 검증
-- =====================================================================

-- 5-1. 균일 계약 확인 — attributes 가 채워지는가
select slug, title, jsonb_object_keys(attributes) as attr_key
from public.mcp_v_product
order by slug
limit 20;

-- 5-2. 디스크립터와 실제 키의 일치 — 양쪽 차집합이 0이어야 한다
with declared as (
  select jsonb_array_elements(public.mcp_config_json('product_attribute_schema'))->>'key' as k
),
actual as (
  select distinct jsonb_object_keys(attributes) as k from public.mcp_v_product
)
select
  (select count(*) from actual a where a.k not in (select k from declared)) as undeclared_keys,
  (select count(*) from declared d where d.k not in (select k from actual))  as declared_but_unused;

-- 5-3. 권한 재확인 — mcp_reader 의 테이블(relkind='r') 권한은 0행이어야 한다
select c.relname, p.privilege_type
from information_schema.table_privileges p
join pg_class c on c.relname = p.table_name
where p.grantee = 'mcp_reader' and c.relkind = 'r';

-- 5-4. 스키마 버전
select public.mcp_config_text('schema_version') as schema_version,
       public.mcp_config_text('enabled_modules') as enabled_modules;
