-- D-130 (2026-10-01) 사업자 전용 상품을 모든 방문자에게 정가로 노출(구매는 승인 사업자만).
-- 코드 배포(상품 상세 구매 잠금, 쇼핑 피드 제외)가 끝난 뒤 적용한다. 적용은 Claude 가 Supabase MCP 로 수행.
drop policy if exists product_public_read on public.product;
create policy product_public_read on public.product for select
  using (is_admin() or status = 'active');

drop policy if exists variant_public_read on public.product_variant;
create policy variant_public_read on public.product_variant for select
  using (is_admin() or exists (select 1 from public.product p where p.id = product_variant.product_id and p.status = 'active'));

-- 되돌리기(이전 정책):
-- product_public_read: is_admin() OR (status = 'active' AND (is_b2b_only = false OR is_approved_business()))
-- variant_public_read: is_admin() OR EXISTS (product p WHERE p.id = product_id AND p.status = 'active' AND (p.is_b2b_only = false OR is_approved_business()))

-- 함께 적용됨(2026-10-01, 마이그레이션 revoke_anon_product_cost_column): anon 의 product.cost 읽기 권한 회수.
