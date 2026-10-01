-- ============================================================
-- D-132 (2026-10-01) 제조원가 분리: product.cost -> public.product_cost (관리자 전용)
-- 적용 주체: Claude (Supabase MCP). 이 파일은 적용 기록과 롤백용 사본이다.
-- ============================================================

-- [1단계] 적용 완료 (마이그레이션 product_cost_split_01_table_d132)
--   create table public.product_cost(product_id uuid pk -> product, cost int >=0, updated_at, updated_by)
--   RLS: product_cost_admin_all (is_admin()) / grants: authenticated, service_role / anon 없음
--   product.cost(>0) 31건 복사. 지문 34464dc8467cf6fb915c627e23b157bb 로 원본과 일치 확인.

-- [2단계] 배포 후 적용: 이익 지표 함수 3개가 product_cost 를 읽도록 교체
--   변경점은 단 두 가지다.
--   (a) left join public.product pr on pr.id = pv.product_id
--       -> left join public.product_cost pr on pr.product_id = pv.product_id
--   (b) admin_cost_coverage 의 products_with_cost:
--       (select count(*)::int from public.product where coalesce(cost, 0) > 0)
--       -> (select count(*)::int from public.product p2 join public.product_cost pc2 on pc2.product_id = p2.id where pc2.cost > 0)
--   사전 대조(새 테이블 기준): item_revenue 40,330,245 / cogs 28,608,900 / products 32 / with_cost 31 = 기준선 일치
--   롤백: 위 (a)(b) 를 거꾸로 적용하면 된다(원 정의는 analytics-admin-functions-20260824.sql 과 Supabase 마이그레이션 이력에 있음).

-- [3단계] analytics.v_product 재생성 (oleander_ro 전용 뷰)
--   cost 컬럼을 product_cost 조인으로 대체. 컬럼 순서와 이름은 그대로 유지.

-- [5단계] 배포 후 마무리
--   update public.product set cost = null;                      -- 값만 비움, 컬럼 유지(6단계에서 별도 승인 후 삭제)
--   revoke select on public.product from anon;                  -- 오늘 임시로 준 컬럼 단위 권한 제거
--   grant select on public.product to anon;                     -- 테이블 단위 읽기로 원복(RLS 가 행을 거른다)
--   revoke insert, update, delete, truncate, references, trigger on public.product, public.product_variant from anon, authenticated;
--   (관리자 쓰기는 is_admin() RLS 정책을 거치는 authenticated 경로다 -> insert/update/delete 는 authenticated 에 다시 부여)
--   grant insert, update, delete on public.product, public.product_variant to authenticated;

-- [6단계] 1~2주 뒤 별도 승인: alter table public.product drop column cost; 킷 스키마 반영
