-- 상품·가격·컬렉션 정합성 검증 쿼리 (현행 Shopify 인벤토리 기준)
-- D-022 후속. 현행 라이브(2026-06-22 크롤) 대비 신규 자사몰 카탈로그 누락·불일치 점검용.
-- 실행: Supabase SQL Editor 또는 연결된 MCP. 읽기 전용(검증만).
-- 기준값 출처: mtspace_coffee_웹사이트_구조분석_20260622.md (크롤 시점 기준, 변동 가능).

-- [1] 컬렉션별 상품 수 — 현행 기대치: blends 5 / single-origins 11 / wholesale 10 / normcore 1
select c.slug, c.name_ko, count(p.id) as product_count
from category c
left join product p on p.category_id = c.id and p.status = 'active'
group by c.slug, c.name_ko
order by c.slug;

-- [2] 전체 발행 상품 수 — 현행 기대치: 29 (변형 포함 페이지 기준)
select count(*) as active_products from product where status = 'active';

-- [3] 도매 전용 블렌드 존재 확인 — 현행: 소비자용에 없는 '하우스/클래식' 블렌드가 도매(1kg)에만 존재
select title_ko, sku from product
where (title_ko ilike '%하우스%' or title_ko ilike '%클래식%')
order by title_ko;

-- [4] 가격 스팟체크 — 현행 기준 일부 (변동 가능, 참고용)
--   게이샤 핀카 하트만 125g ≈ ₩55,000 / 아리차 에이미 125g ≈ ₩13,500
--   댐굳 1kg ≈ ₩33,000 / 디카페인 예가체프 1kg ≈ ₩42,900
select title_ko, sku, price_krw from product
where title_ko ilike '%게이샤%' or title_ko ilike '%하트만%'
   or title_ko ilike '%아리차%' or title_ko ilike '%댐굳%'
order by price_krw desc;

-- [5] SKU 누락(불변 규칙: SKU 필수) — 결과가 있으면 위반
select id, title_ko from product where sku is null or sku = '';

-- [6] 정책 페이지 — 신규 코드 보유 6종(refund/shipping/privacy/terms/contact-information/legal-notice).
--   현행은 5종 + legal-notice 추가. 정책 본문이 DB가 아닌 코드(app/policies/[slug])에 있으므로 별도 점검 불필요.
