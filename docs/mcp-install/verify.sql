-- =====================================================================
-- MTSPACE COMMERCE MCP — 설치 검증
-- v1.0 · 2026-07-29 · 블록 하나씩 Run 하고 기대값과 대조한다.
-- =====================================================================

-- ---------- A. 종합 (모든 값이 기대값이어야 한다) ----------
select
  (select count(*) from pg_roles where rolname='mcp_reader')                              as role_should_be_1,
  (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname like 'mcp\_v\_%'
      and has_table_privilege('mcp_reader','public.'||c.relname,'select'))                as views_should_be_15,
  (select count(*) from information_schema.table_privileges p join pg_class c on c.relname=p.table_name
    where p.grantee='mcp_reader' and c.relkind='r')                                       as table_privs_should_be_0,
  (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname like 'mcp\_%'
      and (has_table_privilege('anon','public.'||c.relname,'select')
        or has_table_privilege('authenticated','public.'||c.relname,'select')))           as anon_readable_should_be_0,
  (select count(*) from public.orders where storefront_id is null)                        as unassigned_orders_should_be_0,
  public.mcp_config_text('schema_version')                                                as schema_version_should_be_1;


-- ---------- B. 최소권한 상세 (앞 5개 false, 뒤 2개 true/false) ----------
select
  has_table_privilege('mcp_reader','public.product','select')       as read_product_f,
  has_table_privilege('mcp_reader','public.orders','select')        as read_orders_f,
  has_table_privilege('mcp_reader','public.profiles','select')      as read_profiles_f,
  has_table_privilege('mcp_reader','public.payment','select')       as read_payment_f,
  has_table_privilege('mcp_reader','public.mcp_token','select')     as read_tokens_f,
  has_table_privilege('mcp_reader','public.mcp_v_product','select') as read_view_t,
  has_table_privilege('mcp_reader','public.mcp_v_product','insert') as write_view_f;


-- ---------- C. 외부 노출 차단 (전부 false) ----------
select
  has_function_privilege('anon','public.mcp_resolve_price(uuid,uuid,timestamptz)','execute') as anon_price_f,
  has_function_privilege('authenticated','public.mcp_verify_token(text)','execute')          as authed_verify_f,
  has_function_privilege('anon','public.mcp_hash_token(text)','execute')                     as anon_hash_f,
  has_table_privilege('anon','public.mcp_v_order','select')                                  as anon_orders_f,
  has_table_privilege('anon','public.mcp_v_customer','select')                               as anon_customers_f;


-- ---------- D. 이식 계약 : 디스크립터와 실제 키 일치 (undeclared = 0) ----------
with declared as (
  select jsonb_array_elements(public.mcp_config_json('product_attribute_schema'))->>'key' as k
), actual as (
  select distinct jsonb_object_keys(attributes) as k from public.mcp_v_product
)
select
  (select count(*) from actual   a where a.k not in (select k from declared)) as undeclared_should_be_0,
  (select count(*) from declared d where d.k not in (select k from actual))   as unused_ok_if_nonzero,
  (select string_agg(k, ', ' order by k) from actual)                          as keys_in_use;


-- ---------- E. PII 마스킹 (원문이 보이면 실패) ----------
select email_masked, phone_masked from public.mcp_v_customer where email_masked is not null limit 5;


-- ---------- F. 단가 확정 (mcp_source = individual 이어야 한다) ----------
with pick as (select profile_id, variant_id from public.customer_variant_prices limit 1)
select
  (select price  from public.mcp_resolve_price((select variant_id from pick), (select profile_id from pick))) as mcp_price,
  (select source from public.mcp_resolve_price((select variant_id from pick), (select profile_id from pick))) as mcp_source,
  (select source from public.resolve_price((select variant_id from pick), (select profile_id from pick), now())) as legacy_source;
-- legacy_source 가 'base' 로 나오는 것은 정상이다(가드 때문). 래퍼가 필요한 이유다.


-- ---------- G. 데이터 규모 ----------
select
  (select count(*) from public.mcp_v_product)      as products,
  (select count(*) from public.mcp_v_variant)      as variants,
  (select count(*) from public.mcp_v_order)        as orders,
  (select count(*) from public.mcp_v_order_item)   as order_items,
  (select count(*) from public.mcp_v_customer)     as customers,
  (select count(*) from public.mcp_v_kb_entry)     as kb_entries;


-- ---------- H. 신규 상품 draft 생성 함수 (D-121) ----------
-- H-1. 권한: mcp_reader 만 EXECUTE 여야 한다.
select grantee, privilege_type
from information_schema.routine_privileges
where routine_name = 'mcp_draft_product'
order by grantee;

-- H-2. draft 하드코딩 확인 — 함수 정의에 status 인자가 없어야 한다.
select pg_get_function_arguments(oid) as args_should_be_slug_and_patch_only
from pg_proc where proname = 'mcp_draft_product';
