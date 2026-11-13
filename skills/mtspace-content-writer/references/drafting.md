# 초안 흐름: 사실 카드 → 개요 승인 → 초안 → 근거 감사

## 0. 데이터를 먼저 읽는 곳
| 무엇 | 어디서 |
|---|---|
| 제품 사실(컵 노트, 레시피, 가격, 산지) | MCP `commerce_get_product` (flavor_notes, recipe, variants.base_price 가 정본, D-123) |
| 기존 글(중복 피하기, 내부 링크) | MCP `commerce_search_content`, `commerce_get_post` |
| 브랜드 규범 | MCP `commerce_get_brand_tokens`, references/kb_snapshot.json |
| 커피 지식 | Supabase kb_entry (정본 1), 로컬 03_knowledge_base (교육자료 v7) |
| 대표 결정 | 의사결정 로그 최신 D 번호, 핸드오프 |

## 1. 사실 카드
칸마다 값과 출처를 적는다. 모르는 칸은 `[확인 필요]`로 두고 지어내지 않는다.

| 칸 | 값 | 출처 |
|---|---|---|
| 매체와 독자(B2B, 소비자) | | 요청 |
| 목표 행동(납품 문의, 사업자 가입, 구매) | | 요청, D-129 |
| 제품명(한, 영) | | product |
| 산지, 지역, 생산자, 워싱스테이션 | | product.attributes.origin |
| 품종, 가공, 고도 | | product.attributes |
| 로스팅 단계 | | product (싱글 오리진은 라이트, D-138) |
| 컵 노트 | | product.flavor_notes |
| 레시피(필터, 에스프레소, 밀크) | | product.recipe |
| 가격 | | variants.base_price (필요할 때만) |
| 배합비 | | 공개된 것만(댐굳 7:3, 올라운더 6:4) |
| 쓰는 사람의 장면(A1) | | 요청, 기존 글 |
| 출처 링크 | | |

## 2. 개요 + 제목 후보 3
소제목 순서, 각 소제목에서 쓸 사실 카드 칸 번호, 제목 후보 3개(SEO 제목 포함). 싱글 오리진은 D-123 구조(스토리 → 컵 노트 → 라이트 로스팅 → 추천 대상 → 레시피 표 → 스펙 표 → FAQ → English → 출처).

## 3. 담당자 승인 관문
대표가 "좋아", "그대로 써"처럼 승인할 때만 본문으로 간다. 수정 지시("2번 제목으로, 순서 바꿔")는 승인이 아니다. 고친 개요를 다시 보이고 승인을 받는다. **승인 전에는 본문을 쓰지 않는다.**

## 4. 초안
문장마다 사실 카드 칸을 근거로 쓴다. 매체 규칙(channels/)과 톤(versions.md)을 따른다.

## 5. 근거 감사
- 문장마다 근거 칸을 대 본다. 근거 없는 사실 문장 = 막음. 빼거나 [확인 필요]로 바꾼다.
- `scripts/mtspace_check.py` 를 돌려 막음 0, 고침 0을 만든다.
- `scripts/fact_lock.py lock` 으로 초안의 사실 목록을 뽑아 사실 카드와 대조한다. 카드에 없는 사실이 있으면 막음.
