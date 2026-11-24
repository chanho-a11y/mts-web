---
name: mtspace-product-register
description: 생두 수입사 PDF(또는 상품 페이지)만 받아 MTSPACE 자사몰 싱글 오리진 상품을 판매 직전 초안까지 완성한다. 설명 집필, 기준 레시피, 품목보고번호, 키 컬러 초안, 소비자가, 재고, 원가까지 넣는다. "제품 등록", "PDF로 상품 초안", "싱글 오리진 등록" 지시에 사용.
---

# MTSPACE 싱글 오리진 제품 등록 (D-172)

PDF만 넣으면 상품 초안이 판매 직전 상태까지 채워지게 하는 흐름이다. 발행 버튼은 항상 대표가 누른다. 이 스킬은 초안(draft)까지만 만든다.

## 0. 시작 전 확인

- 정본 순서: 대표 결정(의사결정 로그) > 이 스킬 > 기존 상품 데이터.
- 기준 코드: `new-website/lib/product-standards.ts` (관리자 폼과 같은 로직). 계산은 `node scripts/product-standards-cli.mjs '<json>'` 로 한다(대표 컴퓨터 device_bash, new-website 폴더).
- Supabase 프로젝트: mtspace-commerce `apiskyivlvebpvvxfejq`.
- 글은 반드시 `mtspace-content-writer` 스킬 기준으로 쓰고 검수한다(상품 상세 = pdp 채널).

## 1. PDF 읽기와 사실 카드

PDF마다 아래를 뽑는다. PDF가 안 읽히면 PDF에 찍힌 상품 페이지 주소를 WebFetch 로 읽는다.

| 칸 | 비고 |
|---|---|
| 제품명(국문, 영문) | "[New Crop / 소분]", 연도 표기는 뺀다. 가공 방식을 뒤에 붙인다 |
| 국가, 지역, 농장 또는 워싱스테이션, 생산자 | origin = {country, country_en, region, farm} |
| 고도, 품종, 가공 | 원문 그대로 |
| 컵 노트 | 5개 이내로 줄인다(산미 → 단맛 → 질감). 뺀 노트(예: 라운드바디)는 설명 문장에 살린다 |
| 생두가(원/kg) | 원가 계산용. PDF 상단 가격 |
| 농장 이야기 | 사실만. 수입사 문단을 그대로 옮기지 않는다 |

농장 단위 설명이 PDF에 없으면 웹에서 찾는다. 우선순위는 Cup of Excellence Farm Directory, 수출사와 로스터의 공개 로트 페이지 순이다. 찾은 사실은 출처 링크를 블로그 출처 블록에 남긴다. 고도처럼 PDF와 외부 자료가 다르면 PDF 값을 쓴다.

## 2. 대표에게 받을 값 (빠졌을 때만 한 번에 묻기)

- 소비자가(원): 제품마다 필수. 추측해서 넣지 않는다.
- 재고 수량: 지시가 없으면 묻는다.
- 가공 계열이 애매한 경우(예: 세미 워시드, 실험 가공)만 레시피 계열을 묻는다. 허니와 무산소는 내추럴 계열로 확정돼 있다.

## 3. 자동 기준 (대표 확정 2026-11-24)

| 항목 | 기준 |
|---|---|
| 기준 레시피 | 워시드 계열 = 에티오피아 코체레 다니초 워시드, 내추럴 계열(허니, 무산소 포함) = 에티오피아 타데세 욘카 내추럴. CLI 의 recipe 값을 그대로 쓴다 |
| 품목보고번호 | 원산지 국가로 자동. `report_no.origin` = 국가명. 맞는 번호가 없으면 대표에게 알린다(새 국가는 품목보고번호 관리에 먼저 추가) |
| 원재료명 | 품목보고번호 마스터의 material (기본 커피원두(100%)) |
| 제조원가 | (생두가 x 1.2) / 1000 x 중량 + 1,000원. 125g 기준 예: 28,000원 → 5,200원 |
| 중량 | 125g, SKU = 슬러그, grind whole, inventory_policy deny |
| 키 컬러 초안 | 1차 플레이버 노트(앞 노트 우선), 2차 판매중과 초안 제품 색과의 거리 15 이상. CLI keyColors 첫 번째를 넣고, 후보 3개를 보고서에 적는다. 최종 선택은 대표 |
| 로스팅 | 싱글 오리진은 라이트 |

## 4. 실행 순서

1. 판매중과 초안 상품의 키 컬러 목록을 읽는다.
   `select key_color from product where status in ('active','draft') and key_color is not null;`
2. 제품마다 CLI 를 돌린다. 이번 회차에 이미 정한 색은 taken 에 더해 서로 겹치지 않게 한다.
   `node scripts/product-standards-cli.mjs '{"notes":[...],"roast":"라이트","process":"워시드","greenPricePerKg":28000,"weightG":125,"taken":[...]}'`
3. 설명을 쓴다(mtspace-content-writer, pdp). story 3문단(농장과 생산자 → 가공 → 풍미), one_liner, seo 제목 "원산지 + 농장/로트 + 프로세스 | 컵 노트 | MTSPACE COFFEE". `mtspace_check.py --channel pdp` 막음 0, 고침 0.
4. `commerce_draft_product` 로 초안을 만든다. KO/EN 전 필드 + `recipe`(CLI 값). evidence 칸에는 자사 1차 데이터만 넣는다(생산자 수상 기록은 넣지 않는다).
5. Supabase 로 판매 값을 채운다. 반드시 draft 행만 고친다.

```sql
begin;
with d(slug, price, cost, kc, stock) as (values
  ('<slug>', <소비자가>, <원가>, '<키컬러>', <재고>)
), up as (
  update product p set weight_g = 125,
    report_no = coalesce(p.report_no, (select r.report_no from report_no r where r.origin = p.origin->>'country' limit 1)),
    material  = coalesce(p.material,  (select r.material  from report_no r where r.origin = p.origin->>'country' limit 1)),
    key_color = coalesce(p.key_color, d.kc), updated_at = now()
  from d where p.slug = d.slug and p.status = 'draft' returning p.id, p.slug
), v as (
  insert into product_variant (product_id, sku, base_price, weight_g, grind, option_values, position, is_b2b_only, is_active, currency, inventory_policy)
  select up.id, up.slug, d.price, 125, 'whole', '{}'::jsonb, 1, false, true, 'KRW', 'deny'
  from up join d on d.slug = up.slug
  where not exists (select 1 from product_variant x where x.product_id = up.id)
  returning id, product_id
), inv as (
  insert into inventory_ledger (variant_id, delta, reason)
  select v.id, d.stock, 'adjust' from v join up on up.id = v.product_id join d on d.slug = up.slug returning variant_id
), c as (
  insert into product_cost (product_id, cost) select up.id, d.cost from up join d on d.slug = up.slug
  on conflict (product_id) do update set cost = excluded.cost, updated_at = now() returning product_id
)
select (select count(*) from up) products, (select count(*) from v) variants, (select count(*) from inv) stock_rows, (select count(*) from c) costs;
commit;
```

이미 variant 가 있는 초안이면 위 insert 는 건너뛴다. 그때 가격은 `update product_variant set base_price = ... where product_id = ...` 로, 재고는 목표 수량과 `current_stock` 의 차이만큼 ledger 에 넣는다.

6. 검증: 다시 조회해 대조한다. 기대값과 하나라도 다르면 멈추고 보고한다.

```sql
select p.slug, p.status, p.weight_g, p.key_color, p.report_no, p.material, p.recipe is not null as has_recipe,
  v.base_price, (select current_stock from current_stock(v.id)) stock, c.cost
from product p join product_variant v on v.product_id = p.id left join product_cost c on c.product_id = p.id
where p.slug in (...);
```

7. 대표가 블로그와 카드뉴스를 함께 요청했으면 싱글 오리진 블로그 구조(D-123)와 카드뉴스 5장 구조로 이어서 만든다. 레시피 표는 3단계의 기준 레시피로 채우고 "MTSPACE 워시드(또는 내추럴) 계열 기준 레시피" 라고 밝힌다.

## 5. 하지 않는 것

- 발행(status active)으로 바꾸지 않는다. 보관(archived) 상품을 되살리지 않는다(대표 지시가 있을 때만).
- 판매중(active) 상품의 가격, 재고, 원가를 이 스킬로 고치지 않는다. 기존 상품 변경은 제안 큐(commerce_propose_product_update)나 관리자 화면에서 한다.
- 파일과 데이터를 지우지 않는다.
- 문장에 긴 줄표와 가운뎃점을 쓰지 않는다.

## 6. 보고 양식

제품마다 한 줄: 제품명, 소비자가, 재고, 원가(생두가), 품목보고번호, 레시피 계열, 키 컬러 초안(후보 3개). 이어서 [확인 필요] 항목(가격 미수령, 국가 번호 없음, 외부 자료와 PDF 불일치 등).
