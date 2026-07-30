-- =====================================================================
-- MCP 설치 2/3 — 주문 storefront_id / brand_id 백필
-- ⚠️ 이 파일만 데이터를 바꾼다. 01_structure.sql 실행 후에 돌린다.
--
-- 배경(2026-07-29 실측): orders 35건 전부 storefront_id·brand_id 가 NULL.
--   app/checkout/actions.ts 의 orders insert 가 두 컬럼을 채우지 않는다.
--   → MCP 주문 툴이 0건이 되고, 스키마·구현(36파일 91곳이 storefront 참조)과
--     데이터가 어긋난 상태다.
--
-- 순서: (A) 실행 전 확인 → (B) 백필 → (C) 실행 후 확인
--       세 블록을 따로 Run 해도 되고, 전체를 붙여 Run 하면 (C) 결과만 보인다.
-- =====================================================================

-- ---------- (A) 실행 전 확인 : null_storefront 가 35 로 나올 것 ----------
select count(*) filter (where storefront_id is null) as null_storefront,
       count(*) filter (where brand_id is null)      as null_brand,
       count(*)                                      as total
from public.orders;


-- ---------- (B) 백필 ----------
-- 현재 운영 스토어프론트가 하나뿐이므로 전량 할당한다.
update public.orders o
set storefront_id = s.id,
    brand_id      = s.brand_id
from public.storefront s
where s.id = public.mcp_storefront_id()
  and (o.storefront_id is null or o.brand_id is null);


-- ---------- (C) 실행 후 확인 : 둘 다 0 이어야 한다 ----------
select count(*) filter (where storefront_id is null) as null_storefront,
       count(*) filter (where brand_id is null)      as null_brand,
       count(*)                                      as total
from public.orders;


-- ---------- (D) 보류 : 체크아웃 코드 수정·배포 후에 적용할 것 ----------
-- 지금 걸면 주문 생성이 실패한다.
-- alter table public.orders alter column storefront_id set not null;
-- alter table public.orders alter column brand_id      set not null;
