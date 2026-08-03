-- ============================================================================
-- D-101 재고 차감 시점 이전: 출고(shipped) → 결제완료(paid)
-- 2026-08-03 / mtspace-commerce (apiskyivlvebpvvxfejq)
--
-- 배경: 재고 차감이 onShip() 한 곳에만 있어, 관리자가 '출고' 상태로 넘기지 않으면
--       결제가 끝난 주문도 재고가 영구히 차감되지 않았다. 실측 결과 결제완료 17건
--       (195개)이 전부 미차감 상태였다.
--
-- 실행 순서: 이 SQL 을 먼저 적용한 뒤 코드(payments-approve / admin-orders / checkout)를 배포한다.
--            checkout 이 variant_on_hand() 를 호출하므로 함수가 먼저 존재해야 한다.
-- ============================================================================

begin;

-- 1) 고아 원장 정리 ---------------------------------------------------------
-- reason='order' 인데 ref_id 가 현존 orders.order_no 와 매칭되지 않는 행(7/2~7/22 테스트분).
-- 삭제하면 on_hand 가 되돌아 오르므로 delta 는 그대로 두고 reason 만 분리해
-- 아래 유니크 인덱스의 대상에서 빠지게 한다.
update public.inventory_ledger l
   set reason = 'order_legacy'
 where l.reason = 'order'
   and not exists (select 1 from public.orders o where o.order_no = l.ref_id);

-- 2) 중복 차감 방지 ---------------------------------------------------------
-- 주문번호 × variant 당 차감 1행만 허용. 결제 재승인·중복 콜백·구버전 onShip 재실행이
-- 모두 여기서 막힌다(unique_violation 23505).
create unique index if not exists inventory_ledger_order_uniq
    on public.inventory_ledger (variant_id, ref_id)
 where reason = 'order';

-- 3) 재고 조회 함수 ---------------------------------------------------------
-- inventory_ledger 는 RLS 가 is_admin() 전용이라 고객 세션에서 직접 못 읽는다.
-- 체크아웃 오버셀 검증용으로 합계만 노출하는 SECURITY DEFINER 함수를 둔다.
create or replace function public.variant_on_hand(p_variant_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(delta), 0)::int
    from public.inventory_ledger
   where variant_id = p_variant_id;
$$;

revoke all on function public.variant_on_hand(uuid) from public;
grant execute on function public.variant_on_hand(uuid) to anon, authenticated, service_role;

-- 4) 미차감분 소급 백필 -----------------------------------------------------
-- 결제완료 이상 주문의 (취소분 제외) 실주문 수량을 variant 단위로 합산해 1행씩 기록.
insert into public.inventory_ledger (variant_id, delta, reason, ref_id)
select oi.variant_id,
       -sum(oi.qty - coalesce(oi.cancelled_qty, 0)),
       'order',
       o.order_no
  from public.orders o
  join public.order_item oi on oi.order_id = o.id
 where o.status::text in ('paid','preparing','shipped','in_transit','delivered','partial_refunded')
   and oi.variant_id is not null
 group by oi.variant_id, o.order_no
having sum(oi.qty - coalesce(oi.cancelled_qty, 0)) > 0
    on conflict do nothing;

commit;

-- ── 검증 ────────────────────────────────────────────────────────────────────
-- (a) 미차감 주문이 0건이어야 한다
-- select o.order_no, o.status
--   from orders o
--  where o.status::text in ('paid','preparing','shipped','in_transit','delivered','partial_refunded')
--    and not exists (select 1 from inventory_ledger l where l.ref_id = o.order_no and l.reason = 'order');
--
-- (b) SKU 별 현재고
-- select v.sku, sum(l.delta) as on_hand
--   from inventory_ledger l join product_variant v on v.id = l.variant_id
--  group by 1 order by 2;
--
-- (c) 함수 동작
-- select public.variant_on_hand((select id from product_variant where sku = 'colombia-tablon-125'));
