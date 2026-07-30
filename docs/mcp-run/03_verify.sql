-- =====================================================================
-- MCP 설치 3/3 — 검증
-- 각 블록을 하나씩 Run 하고 "기대값" 과 맞는지 본다.
-- =====================================================================

-- ---------- 1. mcp_reader 가 가진 "테이블" 권한 → 0행이어야 한다 ----------
select c.relname, p.privilege_type
from information_schema.table_privileges p
join pg_class c on c.relname = p.table_name
where p.grantee = 'mcp_reader' and c.relkind = 'r';


-- ---------- 2. 뷰 권한은 정상 부여됐는가 → 15행 ----------
select count(*) as granted_views
from information_schema.table_privileges p
join pg_class c on c.relname = p.table_name
where p.grantee = 'mcp_reader' and c.relkind = 'v' and p.privilege_type = 'SELECT';


-- ---------- 3. 이식 계약 : attributes 가 채워지는가 ----------
select slug, title, jsonb_object_keys(attributes) as attr_key
from public.mcp_v_product
order by slug
limit 20;


-- ---------- 4. 디스크립터와 실제 키 일치 → 둘 다 0 이어야 한다 ----------
with declared as (
  select jsonb_array_elements(public.mcp_config_json('product_attribute_schema'))->>'key' as k
),
actual as (
  select distinct jsonb_object_keys(attributes) as k from public.mcp_v_product
)
select
  (select count(*) from actual   a where a.k not in (select k from declared)) as undeclared_keys,
  (select count(*) from declared d where d.k not in (select k from actual))   as declared_but_unused;


-- ---------- 5. 스코프 밖 데이터가 뷰로 새는가 → 둘 다 0 ----------
select
  (select count(*) from public.orders o
    where o.storefront_id is distinct from public.mcp_storefront_id()
      and o.id in (select id from public.mcp_v_order))            as leaked_orders,
  (select count(*) from public.orders where storefront_id is null) as unassigned_orders;


-- ---------- 6. PII 가 마스킹돼 있는가 (원문이 보이면 실패) ----------
select email_masked, phone_masked from public.mcp_v_customer limit 5;


-- ---------- 7. 단가 확정 : 개별가가 걸린 조합에서 individual 이 나와야 한다 ----------
with pick as (select profile_id, variant_id from public.customer_variant_prices limit 1)
select
  (select price  from public.mcp_resolve_price((select variant_id from pick), (select profile_id from pick))) as mcp_price,
  (select source from public.mcp_resolve_price((select variant_id from pick), (select profile_id from pick))) as mcp_source;
-- 기대: mcp_source = 'individual'
-- 참고: 같은 인자로 기존 public.resolve_price 를 부르면 'base' 가 나온다(가드 때문). 정상이다.


-- ---------- 8. 설정 확인 ----------
select public.mcp_config_text('schema_version')  as schema_version,
       public.mcp_config_text('enabled_modules') as enabled_modules,
       public.mcp_config_text('storefront_id')   as storefront_id;


-- ---------- 9. 침투 테스트 : 원본 테이블 직접 접근이 막히는가 ----------
-- 아래 두 줄을 "함께" 선택해 Run 한다. 권한 오류가 나야 정상이다.
-- set local role mcp_reader;
-- select * from public.product limit 1;
--
-- 되돌리기(같은 세션에서 계속 작업하려면):
-- reset role;
