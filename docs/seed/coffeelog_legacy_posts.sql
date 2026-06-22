-- Coffeelog 레거시 콘텐츠 이관 시드 (현행 Shopify → 신규 자사몰)
-- D-022 후속. 현행 라이브 2개 아티클을 MTSPACE 스토어프론트 content_post로 등록.
-- · status='draft' 로 입력 → 관리자 검수 후 발행(published + published_at) 권장.
-- · slug 는 현행 URL과 동일하게 유지 → 자사몰 이전 시 301 매핑 연속성 확보.
-- · storefront_id 는 도메인(mtspace.coffee) 기준 서브쿼리로 해석(하드코딩 없음).
-- · ON CONFLICT(slug) 로 멱등(재실행 안전).
-- ⚠️ 본문은 현행 라이브 텍스트의 재구성 초안임(라이브 크롤 미확보). 발행 전 카피 확인 필요.

insert into content_post (slug, title, body_html, excerpt, storefront_id, status, author, seo_title, seo_description, tags)
values
(
  '어떤-커피를-원하시나요',
  '어떤 커피를 원하시나요?',
  $html$
<p>매일 마시는 커피일수록, 내 취향에 맞는 한 잔을 고르는 일이 중요합니다. MTSPACE COFFEE의 시그니쳐 블렌드와 싱글 오리진 가운데 어떤 커피가 잘 맞을지, 취향별로 안내해 드립니다.</p>
<h2>진하고 묵직한 맛을 좋아한다면</h2>
<p>다크 로스트의 <strong>댐굳(damn good)</strong>을 추천합니다. 다크초콜릿·자두·카라멜의 묵직한 단맛이 우유와도 잘 어울려, 라떼·아메리카노 모두 안정적입니다.</p>
<h2>균형 잡힌 데일리 커피를 찾는다면</h2>
<p>미디움 로스트의 <strong>올라운더(allrounder)</strong>가 좋습니다. 베리·사과·다크초콜릿이 균형을 이루어, 어떤 추출에도 무난하게 맛이 납니다.</p>
<h2>밝고 과일 같은 산미를 즐긴다면</h2>
<p>라이트 로스트의 <strong>스팟라이트(spotlight)</strong>를 권합니다. 산딸기·적포도의 프루티한 향과 깔끔한 산미가 핸드드립에서 특히 잘 살아납니다. 더 명확한 산지 개성을 원한다면 <strong>싱글 오리진</strong> 라인을 살펴보세요.</p>
<h2>카페인이 부담된다면</h2>
<p>로우 카페인 미디움 로스트의 <strong>이지피지(ezpz)</strong>가 답입니다. 카라멜·견과의 부드러운 단맛으로, 오후·저녁에도 편하게 즐길 수 있습니다. 완전한 디카페인을 원하면 디카페인 라인도 준비되어 있습니다.</p>
<h2>아이스 아메리카노를 자주 마신다면</h2>
<p>아이스 아메리카노에 특화된 미디움다크 <strong>아아 블렌드(ah-a blend)</strong>를 추천합니다. 얼음에 희석되어도 풍미가 흐트러지지 않도록 설계했습니다.</p>
<p>고르기 어렵다면 <a href="/coffee-info">커피 정보</a>에서 원두별 산지·플레이버·추천 추출을 비교해 보거나, <a href="/contact">문의</a>로 취향을 알려주세요. 맞는 한 잔을 함께 찾아드립니다.</p>
  $html$,
  '취향별로 고르는 MTSPACE COFFEE 원두 추천 가이드 — 진한 맛, 균형, 산미, 로우 카페인, 아이스 아메리카노까지.',
  (select id from storefront where domain = 'mtspace.coffee'),
  'draft',
  'MTSPACE COFFEE',
  '어떤 커피를 원하시나요? — 취향별 원두 추천 가이드',
  '진한 맛부터 밝은 산미, 로우 카페인, 아이스 아메리카노까지. MTSPACE COFFEE 시그니쳐 블렌드·싱글 오리진을 취향별로 골라보세요.',
  array['가이드','원두추천','블렌드']
),
(
  '엠티스페이스-커피-주요-제품-소개',
  '엠티스페이스 커피 주요 제품 소개',
  $html$
<p>MTSPACE COFFEE는 경기도 가평 청평 자체 로스터리에서 <strong>매주 월·화 로스팅, 화·수 출고</strong>로 신선한 원두를 제공합니다. 한국 카페 시장 데이터와 10년 로스팅 경험으로 설계한 시그니쳐 블렌드 5종을 소개합니다.</p>
<h2>댐굳 damn good — 다크</h2>
<p>다크초콜릿·자두·카라멜의 묵직한 단맛. 진하고 안정적인 맛을 좋아하는 분께, 우유 음료에도 강합니다.</p>
<h2>올라운더 allrounder — 미디움</h2>
<p>베리·사과·다크초콜릿이 균형을 이루는 데일리 블렌드. 추출 방식을 가리지 않는 만능형입니다.</p>
<h2>스팟라이트 spotlight — 라이트</h2>
<p>산딸기·적포도의 프루티한 향과 깔끔한 산미. 밝고 화사한 한 잔을 원할 때.</p>
<h2>이지피지 ezpz — 로우 카페인 미디움</h2>
<p>카라멜·견과의 부드러운 단맛에 카페인은 낮춘 블렌드. 오후·저녁에도 부담 없이.</p>
<h2>아아 블렌드 ah-a blend — 미디움다크</h2>
<p>아이스 아메리카노에 특화. 얼음에 희석되어도 풍미가 살아 있도록 설계했습니다.</p>
<p>이 외에도 산지·농장·가공을 공개하는 <strong>싱글 오리진</strong>, 카페·레스토랑·호텔을 위한 <strong>사업자 전용 도매(1kg)</strong>, 그리고 시드니 헤리티지의 <strong>Normcore Coffee 2.0</strong> 라인을 운영합니다. 전체 제품은 <a href="/collections/all">쇼핑</a>에서 확인하세요.</p>
  $html$,
  'MTSPACE COFFEE 시그니쳐 블렌드 5종(댐굳·올라운더·스팟라이트·이지피지·아아) 한눈에 보기.',
  (select id from storefront where domain = 'mtspace.coffee'),
  'draft',
  'MTSPACE COFFEE',
  '엠티스페이스 커피 주요 제품 소개 — 시그니쳐 블렌드 5종',
  '댐굳·올라운더·스팟라이트·이지피지·아아 블렌드. 가평 청평 로스터리에서 매주 로스팅하는 MTSPACE COFFEE 시그니쳐 블렌드 5종을 소개합니다.',
  array['제품소개','블렌드','시그니쳐']
)
on conflict (slug) do update set
  title = excluded.title,
  body_html = excluded.body_html,
  excerpt = excluded.excerpt,
  seo_title = excluded.seo_title,
  seo_description = excluded.seo_description,
  tags = excluded.tags;

-- 발행 시(검수 후):
-- update content_post set status='published', published_at=now()
--   where slug in ('어떤-커피를-원하시나요','엠티스페이스-커피-주요-제품-소개');
