-- D-112 · 2026-08-11 · 주문 귀속(orders.storefront_id / brand_id) 결함 복구
-- 적용처: Supabase mtspace-commerce (apiskyivlvebpvvxfejq)
-- 적용 상태: 2026-08-11 마이그레이션 `fix_order_storefront_attribution` 으로 적용 완료
--
-- 귀속 기준 = '어느 스토어프론트에 판매 등록된 상품인가'(product_storefronts).
-- 제품 브랜드(product.brand_id)로 역산하지 않는 이유: NORMCORE 브랜드 제품이
-- mtspace.coffee 에 판매 등록돼 있어(lib/brands.ts 주석 참조), 브랜드 조인은
-- mtspace 에서 받은 주문을 normcorecoffee.com 으로 오귀속시킨다.

-- (1) 누락분 백필 — 유일하게 해석되는 주문만 채운다(모호하면 NULL 로 남겨 감시 쿼리에 걸리게)
with resolved as (
  select o.id                          as order_id,
         (array_agg(distinct s.id))[1] as storefront_id,
         count(distinct s.id)          as n
  from public.orders o
  join public.order_item oi          on oi.order_id     = o.id
  join public.product_variant pv     on pv.id           = oi.variant_id
  join public.product p              on p.id            = pv.product_id
  join public.product_storefronts ps on ps.product_id   = p.id
  join public.storefront s           on s.id            = ps.storefront_id and s.is_active
  where o.storefront_id is null
  group by o.id
)
update public.orders o
set storefront_id = sf.id,
    brand_id      = sf.brand_id
from resolved r
join public.storefront sf on sf.id = r.storefront_id
where r.order_id = o.id
  and r.n = 1;

-- (2) 재발 방지 안전망 — 앱이 값을 넣지 못한 주문만 자동 귀속
create or replace function public.fill_order_storefront()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_storefront_id uuid;
  v_brand_id      uuid;
begin
  -- 이미 귀속된 주문은 손대지 않는다. 앱이 명시한 값이 항상 우선.
  perform 1 from public.orders o where o.id = new.order_id and o.storefront_id is null;
  if not found then
    return new;
  end if;

  -- 이 품목의 상품이 판매 등록된 활성 스토어프론트가 '유일할 때만' 귀속
  with cand as (
    select distinct s.id, s.brand_id
    from public.product_variant pv
    join public.product p              on p.id          = pv.product_id
    join public.product_storefronts ps on ps.product_id = p.id
    join public.storefront s           on s.id          = ps.storefront_id and s.is_active
    where pv.id = new.variant_id
  )
  select c.id, c.brand_id
    into v_storefront_id, v_brand_id
  from cand c
  where (select count(*) from cand) = 1;

  if v_storefront_id is not null then
    update public.orders o
    set storefront_id = v_storefront_id,
        brand_id      = v_brand_id
    where o.id = new.order_id
      and o.storefront_id is null;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_fill_order_storefront on public.order_item;
create trigger trg_fill_order_storefront
after insert on public.order_item
for each row execute function public.fill_order_storefront();

comment on function public.fill_order_storefront() is
  'D-112 안전망: orders.storefront_id 가 NULL 인 주문을 상품의 판매등록 스토어프론트로 귀속. 정본은 체크아웃 코드의 명시 INSERT.';

-- ---------------------------------------------------------------------------
-- 검증
-- ---------------------------------------------------------------------------
-- select count(*) from public.orders where storefront_id is null;   -- 기대: 0
-- select count(*) as orders, sum(grand_total) as revenue
--   from public.orders
--  where placed_at >= '2026-08-07T00:00:00+09:00'
--    and status in ('paid','preparing','shipped','in_transit','delivered','partial_refunded');
--   -- 기대: 13건 / 4,235,280

-- 회귀 감시(일 1회, 0이 아니면 알림)
-- select count(*) as null_storefront_orders
--   from public.orders
--  where storefront_id is null and placed_at > now() - interval '2 days';

-- ---------------------------------------------------------------------------
-- 롤백
-- ---------------------------------------------------------------------------
-- drop trigger if exists trg_fill_order_storefront on public.order_item;
-- drop function if exists public.fill_order_storefront();
-- (백필 UPDATE 는 값을 채우기만 하므로 되돌릴 필요 없음)
