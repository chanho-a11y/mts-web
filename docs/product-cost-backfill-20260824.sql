-- ============================================================================
-- 제조원가(product.cost) 입력 — 대표 제공값
-- 2026-08-24 · Supabase mtspace-commerce (apiskyivlvebpvvxfejq) · 적용 완료
--
-- 배경: 제품 30건 중 원가 입력이 12건뿐이라 관리자 분석의 총이익이
--       상품매출의 39.3% 를 '원가 0 = 100% 이익' 으로 계산하고 있었다(D-119).
--
-- 검산: 대표 제공값은 아래 관계를 정확히 만족한다.
--         125g 원가 = (1kg 원가 ÷ 8) + 875   (포장)
--         200g 원가 = (1kg 원가 ÷ 5) + 800   (포장)
--       하우스 4,205 / 클래식 5,050 은 125g 이 아니라 200g 식에 맞는다
--       (하우스·클래식은 소포장이 200g 이고 125g 상품이 없다).
--
-- 결과: 원가 커버리지 60.6% → 96.3%, 제품 28/30 입력
-- ============================================================================

update public.product set cost = 21020, updated_at = now() where slug = 'damn-good-1000';
update public.product set cost =  3503, updated_at = now() where slug = 'damn-good-125';

update public.product set cost = 21440, updated_at = now() where slug = 'allrounder-1000';
update public.product set cost =  3555, updated_at = now() where slug = 'allrounder-125';

update public.product set cost = 25196, updated_at = now() where slug = 'spotlight-1000';
update public.product set cost =  4025, updated_at = now() where slug = 'spotlight-125';

update public.product set cost = 24440, updated_at = now() where slug = 'ezpz-1000';
update public.product set cost =  3930, updated_at = now() where slug = 'ezpz-125';

update public.product set cost = 17024, updated_at = now() where slug = 'house-1000';
update public.product set cost =  4205, updated_at = now() where slug = 'house-200';
-- 하우스 블렌드 샘플은 하우스 1kg 과 같은 커피·용량이므로 동일 원가를 적용한다.
update public.product set cost = 17024, updated_at = now() where slug = 'house-1000-sample';

update public.product set cost = 21248, updated_at = now() where slug = 'classic-1000';
update public.product set cost =  5050, updated_at = now() where slug = 'classic-200';

-- 싱글 오리진 전 품목(125g) 일괄 6,000원
update public.product set cost = 6000, updated_at = now()
where product_type = '싱글 오리진';

-- ── 미입력으로 남은 2건 (의도적) ───────────────────────────────────────────
--  · normcore-standard-100  놈코어 스탠다드 — NORMCORE 는 이번 범위 밖
--  · yirga-decaf-1000       예가체프 디카페인 1kg — product_type 이 '블렌드' 라
--    싱글오리진 일괄 규칙(6,000원)에 들지 않고, 1kg 디카페인 원가는 별도 값이
--    필요하다. 매출 722,490원(상품매출의 3.7%). [확인 필요]
