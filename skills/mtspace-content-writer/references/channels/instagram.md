# 인스타그램 (@mtspacecoffee)

- 캡션: 한글 먼저, 영문 나중(D-138). 첫 줄은 질문형 또는 결론형 한 줄.
- 해시태그: 고정 세트를 캡션 맨 끝에. B2B 세트(원두납품, 카페원두, 카페원두도매, 카페운영, 카페창업) / 소비자 세트(홈카페, 원두추천, 스페셜티커피, 커피원두) / 교육 세트(커피교육, 커피공부, 바리스타, 커피추출, 브루잉) + 공통(엠티스페이스커피, MTSPACECOFFEE, specialtycoffee).
- CTA: "사업자 회원가입과 납품 문의는 프로필 링크에서" (B2B 편).
- 발행 리듬: 카드뉴스 월, 목, 토 13시(B2B 2, 소비자 또는 교육 1), 단일 이미지 화, 금(D-138, D-139).
- 사진은 photo for social 폴더만. 레시피 한 장은 판매 중 상품만.
- 서버 검사(lib/social/rules.ts)와 같은 금지어로 검수한다. QC는 교육 편에서 허용.
- 저장: commerce_create_image(purpose=instagram) → commerce_social_draft_post. 승인과 예약은 /admin/social.
