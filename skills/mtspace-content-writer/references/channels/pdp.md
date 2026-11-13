# 원두 상세페이지

- 정본: 컵 노트 = flavor_notes, 레시피 = recipe, 가격 = variants.base_price(D-123). story와 seo가 다르면 flavor_notes에 맞춘다.
- 필드: one_liner(한 줄, 문장부호 금지 규칙 그대로), story(농장과 생산자 → 가공 디테일 → 풍미 마무리 3문단), seo.title("원산지 + 농장/로트 + 프로세스 | 컵 노트 | MTSPACE COFFEE"), seo.description(150자 안팎).
- 상품 제목과 옵션(variant)의 용량 표기는 허용. story, one_liner, seo 설명에는 용량, 요일, 지역 금지(2026-11-13).
- 컵 노트는 구체 명사 5개 이내, 산미 → 단맛 → 질감 순.
- 싱글 오리진은 라이트 로스트(D-138).
- 저장: 기존 상품은 commerce_propose_product_update(제안 큐), 새 상품은 commerce_draft_product.
