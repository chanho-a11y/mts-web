# 저장 순서 (매체별 저장 대상)

모든 저장은 초안까지. 발행과 예약 승인은 사람이 한다.

| 매체 | 저장 대상 | 주의 |
|---|---|---|
| 자사몰 블로그 | MCP `commerce_draft_post` (body_md, cover_image) | 발행된 글은 MCP로 못 고친다. 수정은 관리자 화면 또는 대표 승인 후 DB 갱신(백업 먼저) |
| 블로그 커버 | MCP `commerce_create_image` template=signature-cover | 워시드 light, 내추럴 dark |
| 상품 상세 | 새 상품 `commerce_draft_product`, 기존 상품 `commerce_propose_product_update` (제안 큐, 관리자 승인) | 컵 노트는 flavor_notes 정본 |
| 네이버 블로그 | 원고.txt + 이미지 4장 폴더 → `naver-blog-scheduler` 스킬이 예약 | 이 스킬은 원고까지. 예약은 발행 스킬 |
| 인스타그램 | MCP `commerce_create_image`(purpose=instagram) → `commerce_social_draft_post` | 승인과 예약은 mtspace.coffee/admin/social. 사진은 photo for social 폴더만 |
| B2B 제안서, 납품 안내 | chanho-document-design 양식 PDF 또는 Docs | 신선도와 지역 표기 없음 |
| 교육 자료 | 자사몰 교육자료 섹션 원고 | 교본 v7 정본 |
| 긴 글 교정 산출물 | `scripts/build_outputs.py` → DOCX 3 + 비교 PDF + 검수 JSON | 대표 폴더에 둘 때는 device 연결로 |

저장 전 마지막 관문: `mtspace_check.py` 막음 0, `fact_lock.py diff` BLOCK 아님.
