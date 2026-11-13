-- D-167 콘텐츠 소급 정정 (2026-11-13). 요일, 지역, 용량, 줄표, 가운뎃점 정리 + 상품 seo 컵 노트 정본 맞춤 + 케냐 고도.
-- 백업: content_post_bak_20261113, product_bak_20261113 (RLS 켬). 롤백은 문서 맨 아래 주석 참조.
create table if not exists public.content_post_bak_20261113 as select * from public.content_post;
alter table public.content_post_bak_20261113 enable row level security;
create table if not exists public.product_bak_20261113 as select * from public.product;
alter table public.product_bak_20261113 enable row level security;
-- content_post 어떤-커피를-원하시나요
update public.content_post set body_html = $mcw4649d0ba$
<p>원두를 고를 때 가장 먼저 정할 것은 어떤 맛을 좋아하는지, 그리고 어떻게 마시는지입니다. MTSPACE COFFEE의 블렌드 4종은 로스팅 단계마다 성격이 분명해서, 취향만 정하면 한 봉을 고르기 쉽습니다. 취향과 상황별로 맞는 원두를 안내합니다.</p>
<table><thead><tr><th>취향과 상황</th><th>추천 원두</th><th>로스팅</th><th>플레이버 노트</th></tr></thead><tbody><tr><td>진하고 묵직한 맛, 라떼</td><td>댐굳</td><td>다크</td><td>다크 초콜릿, 자두, 바닐라</td></tr><tr><td>균형 잡힌 데일리 커피</td><td>올라운더</td><td>미디움</td><td>베리류, 사과, 카카오, 아몬드</td></tr><tr><td>과일 같은 산미, 핸드드립</td><td>스팟라이트</td><td>라이트</td><td>귤, 자몽, 적포도, 살구</td></tr><tr><td>오후와 저녁, 카페인 부담</td><td>이지피지</td><td>미디움</td><td>카라멜, 견과류, 시트러스</td></tr></tbody></table>
<h2>진하고 묵직한 맛을 좋아한다면</h2>
<p>다크 로스트 <a href="/products/damn-good-125"><strong>댐굳(damn good)</strong></a>을 권합니다. 다크 초콜릿, 자두, 바닐라로 이어지는 묵직한 단맛이 중심이고 산미는 낮습니다. 우유를 더하면 단맛과 바디가 살아나 라떼와 플랫화이트에 잘 어울립니다.</p>
<h2>균형 잡힌 데일리 커피를 찾는다면</h2>
<p>미디움 로스트 <a href="/products/allrounder-125"><strong>올라운더(allrounder)</strong></a>가 좋습니다. 베리류와 사과의 산미를 카카오와 아몬드의 고소함이 받쳐 주어, 에스프레소와 필터, 라떼 어디에 써도 균형이 유지됩니다. 원두를 한 종류만 두고 싶을 때 가장 무난한 선택입니다.</p>
<h2>밝고 과일 같은 산미를 즐긴다면</h2>
<p>라이트 로스트 <a href="/products/spotlight-125"><strong>스팟라이트(spotlight)</strong></a>를 권합니다. 귤과 자몽의 경쾌한 산미, 적포도와 살구의 은은한 단맛이 핸드드립에서 특히 잘 드러납니다. 산지의 개성을 더 분명하게 느끼고 싶다면 <a href="/collections/single-origins">싱글 오리진</a>을 살펴보세요.</p>
<h2>카페인이 부담된다면</h2>
<p>로우 카페인 미디움 블렌드 <a href="/products/ezpz-125"><strong>이지피지(ez pz)</strong></a>가 맞습니다. 디카페인 원두를 섞어 카페인을 낮춘 블렌드로, 카라멜과 견과류의 부드러운 단맛에 은은한 시트러스가 따라옵니다. 카페인을 완전히 뺀 디카페인과는 다른 제품입니다.</p>
<h2>아이스 아메리카노를 자주 마신다면</h2>
<p>진하게 마시는 편이라면 댐굳, 가볍고 균형 있게 마시는 편이라면 올라운더를 권합니다.</p>
<p>고르기 어렵다면 <a href="/blogs/coffeelog/blog-blend-4-comparison">블렌드 4종 비교</a>에서 산미와 단맛, 바디를 나란히 비교해 보거나, <a href="/coffee-info">커피 정보</a>에서 원두별 추천 레시피를 확인해 보세요.</p>
<h2>자주 묻는 질문</h2>
<p><strong>Q. 산미가 없는 원두는 무엇인가요?</strong><br />댐굳입니다. 블렌드 4종 가운데 산미가 가장 낮고 다크 초콜릿 같은 단맛과 묵직함이 중심입니다.</p>
<p><strong>Q. 원두를 하나만 둔다면 무엇이 좋나요?</strong><br />올라운더입니다. 에스프레소, 필터, 밀크 어디에 써도 균형이 무너지지 않도록 기획한 미디움 블렌드입니다.</p>
<p><strong>Q. 핸드드립에는 어떤 원두가 맞나요?</strong><br />스팟라이트입니다. 라이트 로스트의 과일 향을 살리면서 추출이 흔들리지 않도록 설계했습니다.</p>
<p><strong>Q. 볶은 원두는 언제 오나요?</strong><br />미리 볶아 쌓아 두지 않고, 가장 가까운 로스팅 회차에 볶아 보냅니다.</p>
<hr />
<h3>출처</h3>
<ul><li>제품 정보와 플레이버 노트: MTSPACE COFFEE 상품 데이터</li><li>상황별 추천: MTSPACE COFFEE 블로그 「블렌드 4종 비교」</li></ul>$mcw4649d0ba$
 where id = '22d64954-96e6-4389-b38f-02b2ae81811f';
-- content_post 엠티스페이스-커피-주요-제품-소개
update public.content_post set excerpt = $mcw4649d0ba$MTSPACE COFFEE 시그니쳐 블렌드 4종(댐굳, 올라운더, 스팟라이트, 이지피지)과 싱글 오리진, 사업자 전용 라인을 한눈에 봅니다.$mcw4649d0ba$,
  body_html = $mcw4649d0ba$
<p>MTSPACE COFFEE의 주요 제품은 시그니쳐 블렌드 4종, 싱글 오리진, 사업자 전용 라인입니다. 한국 카페 시장 데이터와 15년 로스팅 경험으로 설계했고, 미리 볶아 쌓아 두지 않고 보냅니다.</p>
<h2>시그니쳐 블렌드 4종 한눈에 보기</h2>
<table><thead><tr><th>블렌드</th><th>로스팅</th><th>플레이버 노트</th><th>이런 분께</th></tr></thead><tbody><tr><td>댐굳 damn good</td><td>다크</td><td>다크 초콜릿, 자두, 바닐라</td><td>진한 맛, 라떼</td></tr><tr><td>올라운더 allrounder</td><td>미디움</td><td>베리류, 사과, 카카오, 아몬드</td><td>추출 방식을 가리지 않는 데일리</td></tr><tr><td>스팟라이트 spotlight</td><td>라이트</td><td>귤, 자몽, 적포도, 살구</td><td>과일 같은 산미, 핸드드립</td></tr><tr><td>이지피지 ez pz</td><td>미디움</td><td>카라멜, 견과류, 시트러스</td><td>오후와 저녁, 로우 카페인</td></tr></tbody></table>
<h2>댐굳 damn good, 다크</h2>
<p>다크 초콜릿, 자두, 바닐라의 묵직한 단맛이 중심입니다. 진하고 안정적인 맛을 좋아하는 분께 권하며 우유 음료에 잘 어울립니다. <a href="/blogs/coffeelog/blog-damn-good-story">댐굳 이야기 보기</a></p>
<h2>올라운더 allrounder, 미디움</h2>
<p>베리류와 사과의 산미를 카카오와 아몬드가 받쳐 주는 데일리 블렌드입니다. 에스프레소, 필터, 라떼 어디에 써도 균형이 유지됩니다. <a href="/blogs/coffeelog/blog-allrounder-story">올라운더 이야기 보기</a></p>
<h2>스팟라이트 spotlight, 라이트</h2>
<p>귤과 자몽의 경쾌한 산미, 적포도와 살구의 은은한 단맛이 특징입니다. 밝고 산뜻한 한 잔을 원할 때 맞습니다. <a href="/blogs/coffeelog/blog-spotlight-story">스팟라이트 이야기 보기</a></p>
<h2>이지피지 ez pz, 로우 카페인 미디움</h2>
<p>카라멜과 견과류의 부드러운 단맛에 카페인은 낮춘 블렌드입니다. 디카페인 원두를 섞어 카페인을 줄인 로우 카페인 제품으로, 카페인을 완전히 뺀 디카페인과는 다릅니다. <a href="/blogs/coffeelog/blog-easy-peasy-story">이지피지 이야기 보기</a></p>
<h2>싱글 오리진과 사업자 전용 라인</h2>
<p>블렌드 외에도 산지와 생산자, 가공 방식을 공개하는 <a href="/collections/single-origins"><strong>싱글 오리진</strong></a>과, 카페와 사업장을 위한 <strong>사업자 전용 라인</strong>을 운영합니다. 사업자 단가는 사업자 회원 승인 후 등급별로 적용됩니다. 전체 제품은 <a href="/collections/all">쇼핑</a>에서 확인하세요.</p>
<h2>자주 묻는 질문</h2>
<p><strong>Q. 블렌드는 어떤 포장으로 판매하나요?</strong><br />블렌드 4종 모두 소비자용 소포장과 사업자 전용 라인으로 판매합니다.</p>
<p><strong>Q. 블렌드 4종은 어떻게 다른가요?</strong><br />로스팅 단계만 다른 것이 아니라 설계 목적이 다릅니다. 자세한 비교는 「블렌드 4종 비교」 글에서 볼 수 있습니다.</p>
<p><strong>Q. 볶은 원두는 언제 오나요?</strong><br />미리 볶아 쌓아 두지 않고, 가장 가까운 로스팅 회차에 볶아 보냅니다.</p>
<hr />
<h3>출처</h3>
<ul><li>제품 정보와 플레이버 노트: MTSPACE COFFEE 상품 데이터</li><li>블렌드별 설계 목적: MTSPACE COFFEE 블로그 「블렌드 4종 비교」</li></ul>$mcw4649d0ba$,
  seo_description = $mcw4649d0ba$댐굳, 올라운더, 스팟라이트, 이지피지. MTSPACE COFFEE 시그니쳐 블렌드 4종과 싱글 오리진, 사업자 전용 라인을 소개합니다.$mcw4649d0ba$
 where id = '3690b838-8b3d-4e33-a969-2a01bca77462';
-- content_post blog-damn-good-story
update public.content_post set title = $mcw4649d0ba$댐굳 damn good: 10년을 이어온 MTSPACE COFFEE 대표 블렌드$mcw4649d0ba$,
  excerpt = $mcw4649d0ba$2016년 호주에서 태어나 지금까지 사랑받는 다크 블렌드, 댐굳. 다크초콜릿, 자두, 바닐라의 묵직한 단맛과 즐기는 법을 소개합니다.$mcw4649d0ba$,
  body_html = $mcw4649d0ba$<p>댐굳(damn good)은 MTSPACE COFFEE를 대표하는 다크 로스트 블렌드입니다. 다크초콜릿, 자두, 바닐라로 이어지는 묵직한 단맛이 특징이며, 진하게 내린 블랙부터 부드러운 라떼까지 두루 어울립니다. 매일 흔들림 없는 한 잔을 찾는 분께 저희가 가장 먼저 권하는 커피이기도 합니다.</p><figure><img src="https://apiskyivlvebpvvxfejq.supabase.co/storage/v1/object/public/product-assets/blog/blends/damn-good-hero.jpg" alt="댐굳으로 내린 라떼 — MTSPACE COFFEE" style="width:100%;border-radius:14px;margin:0" loading="lazy" /><figcaption style="text-align:center;color:#8A8173;font-size:0.85rem;margin-top:8px">댐굳으로 내린 라떼: MTSPACE COFFEE</figcaption></figure><h2>2016년, 호주에서 시작된 이름</h2><p>커피 한 잔이 브랜드의 얼굴이 되기까지는 생각보다 긴 시간이 필요합니다. 댐굳은 2016년, MTSPACE COFFEE의 전신인 호주 놈코어 커피(Normcore Coffee) 시절에 태어났습니다. 다양한 소비자층을 앞에 두고 수개월에 걸쳐 원료를 고르고, 로스팅 프로파일을 다듬고, 추출 레시피를 바꿔가며 테스트를 반복했습니다. 여러 지역과 환경에서 진행한 필드 테스트를 통해, 어디에서 누가 내려도 가장 안정적이고 일관된 맛이 나도록 완성한 블렌드입니다.</p><figure><img src="https://apiskyivlvebpvvxfejq.supabase.co/storage/v1/object/public/product-assets/blog/blends/damn-good-sydney.jpg" alt="댐굳이 처음 태어난 호주 시드니" style="width:100%;border-radius:14px;margin:0" loading="lazy" /><figcaption style="text-align:center;color:#8A8173;font-size:0.85rem;margin-top:8px">댐굳이 처음 태어난 호주 시드니</figcaption></figure><p>브랜드가 MTSPACE COFFEE로 이어지면서, 댐굳은 더 좋은 원료와 한층 정교해진 로스팅 프로파일로 다시 태어났습니다. 오래 사랑받아 온 특유의 캐릭터는 그대로 지키되, 추출 안정성은 크게 끌어올리고 플레이버는 더 선명하게 다듬었습니다. 이렇게 시간을 두고 쌓인 신뢰가 댐굳을 브랜드를 대표하는 블렌드로 만들었습니다.</p><h2>다크초콜릿, 자두, 바닐라: 묵직하지만 우아하게</h2><p>댐굳의 첫인상은 묵직한 바디와 고소한 뉘앙스입니다. 그 위로 다크초콜릿의 진한 단맛, 잘 익은 자두의 은은한 산미, 바닐라의 부드러운 여운이 층을 이루며 천천히 퍼집니다. 블랙으로 마시면 깊고 긴 여운이 남고, 우유를 더하면 단맛과 바디가 한층 풍성해집니다. 자극적인 쓴맛 대신 진한 단맛으로 기억되는, 다루기 쉬운 다크 로스트입니다.</p><figure><img src="https://apiskyivlvebpvvxfejq.supabase.co/storage/v1/object/public/product-assets/blog/blends/damn-good-bag.jpg" alt="댐굳 damn good 원두" style="width:100%;border-radius:14px;margin:0" loading="lazy" /><figcaption style="text-align:center;color:#8A8173;font-size:0.85rem;margin-top:8px">댐굳 damn good 원두</figcaption></figure><h2>이런 분께 권합니다</h2><ul><li>진하고 묵직한 다크 로스트를 좋아하는 분</li><li>라떼, 플랫화이트 등 밀크 베이스를 즐겨 마시는 분</li><li>매일 마셔도 물리지 않는 데일리 원두를 찾는 분</li><li>안정적인 추출이 중요한 카페, 사업장(도매)</li></ul><h2>추천 레시피</h2><ul><li><strong>에스프레소</strong>: 도징 20g / 추출 32g / 23초 (물 93℃, 9bar)</li><li><strong>라떼(밀크)</strong>: 도징 22g / 추출 28g / 28초, 6oz 싱글샷</li><li><strong>필터(V60)</strong>: 도징 12g / 블룸 36g, 60초 / 총 180g / 1:50~2:10</li></ul><h2>자주 묻는 질문</h2><p><strong>Q. 댐굳은 어떤 맛인가요?</strong><br>다크초콜릿, 자두, 바닐라를 중심으로 한 묵직하고 고소한 단맛의 다크 로스트 블렌드입니다. 쓴맛보다 진한 단맛과 깊은 여운이 특징입니다.</p><p><strong>Q. 라떼로 마셔도 잘 어울리나요?</strong><br>네. 밀크 베이스에서 단맛과 바디가 풍성하게 살아나 라떼, 플랫화이트에 특히 잘 어울립니다.</p><p><strong>Q. 산미가 강한 편인가요?</strong><br>산미는 낮고 단맛과 바디가 중심입니다. 신맛이 부담스러운 분께 적합합니다.</p><hr><h2>English</h2><p><em>Damn Good</em> is MTSPACE COFFEE's flagship dark-roast blend, layered notes of dark chocolate, plum and vanilla over a heavy body. Born in 2016 during our Sydney-era predecessor Normcore Coffee, it was developed over months of sourcing, roast-profile design and field testing to deliver a consistent cup anywhere. Bold and lingering as black, soft and richly sweet as a latte. Recipes: espresso 20g/32g/23s, latte 22g/28g/28s, filter (V60) 12g, 36g bloom 60s, 180g total, 1:50~2:10.</p>
<hr />
<h3>출처</h3>
<ul><li>제품 정보, 플레이버 노트, 추천 레시피: MTSPACE COFFEE 상품 데이터와 자체 로스팅 기록</li><li>블렌드 개발 배경: MTSPACE COFFEE 브랜드 기록</li></ul>$mcw4649d0ba$,
  seo_title = $mcw4649d0ba$댐굳 damn good 원두 이야기 | 다크초콜릿, 자두, 바닐라 다크 블렌드 - MTSPACE COFFEE$mcw4649d0ba$,
  seo_description = $mcw4649d0ba$2016년 호주 놈코어 커피 시절 태어나 리뉴얼된 MTSPACE COFFEE 대표 블렌드 댐굳. 다크초콜릿, 자두, 바닐라의 풍미와 라떼, 에스프레소, 필터 추천 레시피, 어울리는 사람까지 정리했습니다.$mcw4649d0ba$
 where id = '72b6f128-a18e-4167-8631-82a547d266a8';
-- content_post blog-blend-4-comparison
update public.content_post set title = $mcw4649d0ba$블렌드 4종 비교: 댐굳, 올라운더, 스팟라이트, 이지피지, 어떻게 다른가$mcw4649d0ba$,
  excerpt = $mcw4649d0ba$로스팅 단계가 아니라 설계 목적이 다릅니다. 산미, 단맛, 바디, 밀크 궁합을 5단계 게이지로 비교하고, 어떤 사람에게 어떤 블렌드가 맞는지 정리했습니다.$mcw4649d0ba$,
  body_html = $mcw4649d0ba$<p>블렌드를 고를 때 기준은 대개 "진한 거냐, 산미 있는 거냐" 둘로 좁혀집니다. 그런데 MTSPACE COFFEE의 블렌드 4종은 로스팅 단계만 다른 것이 아닙니다. 각각 <strong>처음부터 서로 다른 목적을 위해 설계</strong>된 커피입니다. 어떤 잔을 위해 만들어졌는지 알고 나면, 고르는 일이 훨씬 단순해집니다.</p>
<h2>한눈에 보는 4종</h2>
<table><thead><tr><th>항목</th><th>댐굳 damn good</th><th>올라운더 allrounder</th><th>스팟라이트 spotlight</th><th>이지피지 ez pz</th></tr></thead><tbody><tr><td>로스팅</td><td>다크</td><td>미디움</td><td>라이트</td><td>미디움</td></tr><tr><td>플레이버</td><td>다크초콜릿, 자두, 바닐라</td><td>베리류, 사과, 카카오, 아몬드</td><td>귤, 자몽, 적포도, 살구</td><td>카라멜, 견과류, 시트러스</td></tr><tr><td>설계 목적</td><td>브랜드 시그니처, 진한 단맛</td><td>어떤 추출에도 통하는 균형</td><td>다루기 쉬운 라이트 스페셜티</td><td>카페인 부담 없는 한 잔</td></tr><tr><td>카페인</td><td>일반</td><td>일반</td><td>일반</td><td>낮음 (로우 카페인)</td></tr><tr><td>소비자가</td><td>10,990원</td><td>11,990원</td><td>12,990원</td><td>11,990원</td></tr></tbody></table>
<h2>관능 비교 차트</h2>
<p>5단계 게이지입니다. MTSPACE COFFEE 사내 커핑 평가 기준이며, 밀크 궁합은 각 제품의 공식 밀크 레시피 수율비를 근거로 했습니다.</p>
<table><thead><tr><th>항목</th><th>댐굳</th><th>올라운더</th><th>스팟라이트</th><th>이지피지</th></tr></thead><tbody><tr><td>산미</td><td>●○○○○</td><td>●●●○○</td><td>●●●●●</td><td>●●○○○</td></tr><tr><td>단맛</td><td>●●●●○</td><td>●●●●○</td><td>●●●○○</td><td>●●●●○</td></tr><tr><td>바디</td><td>●●●●●</td><td>●●●○○</td><td>●●○○○</td><td>●●●●○</td></tr><tr><td>로스팅 강도</td><td>●●●●●</td><td>●●●○○</td><td>●○○○○</td><td>●●●○○</td></tr><tr><td>밀크 궁합</td><td>●●●●●</td><td>●●●●○</td><td>●●○○○</td><td>●●●●○</td></tr></tbody></table>
<blockquote><p>밀크 레시피 수율비: 댐굳 22g→28g(1.27), 이지피지 22g→36g(1.64), 올라운더 22g→38g(1.73), 스팟라이트 22g→42g(1.91). 수율비가 낮을수록 농도가 높아, 우유를 만났을 때 커피 맛이 밀리지 않습니다.</p></blockquote>
<h2>어떤 사람에게 맞나</h2>
<h3>댐굳: 라떼를 마시는 사람, 산미가 불편한 사람</h3>
<p>2016년 호주 놈코어 커피 시절에 태어나 지금까지 이어지는 블렌드입니다. 다크 초콜릿과 자두, 바닐라의 묵직한 단맛이 중심이고 산미는 거의 드러나지 않습니다. 밀크 레시피가 4종 중 가장 진하게 설계되어 있어, 집에서 라떼나 플랫화이트를 자주 만든다면 실패할 확률이 가장 낮습니다.</p>
<p>이런 분께 권합니다. 카페에서 늘 라떼를 시키는 분, "커피는 좀 써야 한다"고 생각하는 분, 산미를 신맛으로 느끼는 분.</p>
<h3>올라운더: 기구가 여러 개거나, 식구마다 취향이 다른 집</h3>
<p>호주 카페의 '올라운드 플레이어'에서 이름을 가져온 블렌드입니다. 에스프레소, 필터, 밀크 어디에 넣어도 균형이 무너지지 않도록 기획했습니다. 베리와 사과의 정제된 산미 위에 카카오와 아몬드의 단맛이 받쳐, 어느 한쪽으로 치우치지 않습니다. 한 봉지로 아침엔 드립, 오후엔 라떼까지 소화해야 한다면 가장 합리적인 선택입니다.</p>
<p>이런 분께 권합니다. 드립, 모카포트, 머신을 번갈아 쓰는 분, 원두를 한 종류만 두고 싶은 분, 스페셜티를 이제 시작하는 분.</p>
<h3>스팟라이트: 아침 첫 잔, 핸드드립을 즐기는 사람</h3>
<p>라이트 로스팅 특유의 화사함은 살리되 추출 안정성을 함께 확보하는 것이 설계 기준이었습니다. 귤과 자몽의 경쾌한 산미, 적포도와 살구의 은은한 단맛이 맑고 가벼운 바디 위에 얹힙니다. 4종 중 산미가 가장 높고 바디가 가장 가벼워, 물 온도와 분쇄도를 바꿔가며 맛이 변하는 과정을 즐기기에 좋습니다.</p>
<p>이런 분께 권합니다. 핸드드립, 푸어오버를 즐기는 분, 과일 같은 산미를 좋아하는 분, 하루를 환기하는 첫 잔이 필요한 분.</p>
<h3>이지피지: 오후 늦게도 커피를 마시고 싶은 사람</h3>
<p>카페인은 낮추고 플레이버 경험은 그대로 가져가는 것이 목표였습니다. C2 공법 디카페인 원두를 사용해 카페인 부담을 덜어낸 로우 카페인 블렌드입니다. 카라멜과 견과의 고소한 단맛에 은은한 시트러스가 따라붙고, 바디가 4종 중 두 번째로 두툼해 '연하게 마시는 커피'로 느껴지지 않습니다.</p>
<p>이런 분께 권합니다. 저녁에 커피를 마시면 잠들기 어려운 분, 하루 세 잔 이상 마시는 분, 식후에 가족과 함께 커피를 나누는 분.</p>
<h2>상황별 매칭</h2>
<table><thead><tr><th>상황</th><th>추천</th></tr></thead><tbody><tr><td>라떼, 플랫화이트 중심</td><td>댐굳</td></tr><tr><td>아이스 아메리카노</td><td>댐굳(진하게) 또는 올라운더</td></tr><tr><td>핸드드립, 푸어오버</td><td>스팟라이트</td></tr><tr><td>모카포트, 에어로프레스</td><td>올라운더</td></tr><tr><td>오후, 저녁 시간대</td><td>이지피지</td></tr><tr><td>원두를 딱 하나만 둔다면</td><td>올라운더</td></tr></tbody></table>
<h2>두 종을 함께 두는 법</h2>
<p>한 종만 고르기 아쉽다면, 성격이 겹치지 않게 두 종을 두는 편이 효율이 좋습니다.</p>
<ul><li><strong>대비 조합: 댐굳 + 스팟라이트</strong>: 아침은 맑게, 저녁은 진하게. 하루의 맛 폭이 가장 넓어집니다.</li><li><strong>실용 조합: 올라운더 + 이지피지</strong>: 낮에는 올라운더, 오후엔 이지피지. 맛의 결은 비슷하게 유지하면서 카페인 총량만 조절할 수 있습니다.</li><li><strong>입문 조합: 올라운더로 시작</strong>: 한 달 마셔보고 산미 쪽이 당기면 스팟라이트, 진한 쪽이 당기면 댐굳으로 넓히면 됩니다.</li></ul>
<h2>주문 전에 알아두면 좋은 것</h2>
<p>원두는 주문 시점이 아니라 정해진 로스팅 주기에 맞춰 나가기 때문에, 받는 순간의 신선도가 일정하게 유지됩니다.</p>
<p>소비자용 한 봉은 하루 한두 잔 기준 약 2주 분량입니다. 4종을 한 봉지씩 돌려 마시며 취향을 좁히기에 알맞은 단위입니다.</p>
<ul><li><a href="/products/damn-good-125">댐굳</a>: 10,990원</li><li><a href="/products/allrounder-125">올라운더</a>: 11,990원</li><li><a href="/products/spotlight-125">스팟라이트</a>: 12,990원</li><li><a href="/products/ezpz-125">이지피지</a>: 11,990원</li></ul>
<p>아직 애매하다면 <a href="/coffee-info">커피 정보</a>에서 원두별 산지, 플레이버, 추천 레시피를 비교해 보세요.</p>
<h2>카페를 운영하신다면</h2>
<p>4종 모두 사업자 라인이 있습니다. 매장에서는 취향보다 <strong>그라인더 수</strong>가 먼저 기준이 됩니다.</p>
<ul><li><strong>그라인더 1대</strong>: 올라운더. 에스프레소, 밀크, 필터를 한 원두로 처리할 수 있어 메뉴 폭이 넓고, 바 교육 부담이 적습니다.</li><li><strong>그라인더 2대</strong>: 댐굳(밀크 메뉴) + 스팟라이트(블랙, 필터). 라떼와 필터의 캐릭터가 뚜렷하게 갈려, 메뉴판에서 설명이 됩니다.</li><li><strong>디카페인 수요 대응</strong>: 이지피지. 디카페인 SKU를 별도로 두기 부담스러운 규모에서 로우 카페인 옵션으로 운용할 수 있습니다.</li></ul>
<p>사업자 단가는 회원 승인 후 등급별로 적용됩니다. <a href="/account/signup">사업자 회원가입</a> 후 승인 절차를 진행하시거나, <a href="/contact">문의</a>로 매장 상황을 알려주시면 메뉴 구성 단계부터 함께 제안드립니다.</p>
<h2>자주 묻는 질문</h2>
<p><strong>Q. 블렌드 4종 중 산미가 가장 낮은 것은 무엇인가요?</strong><br />댐굳입니다. 사내 커핑 평가 기준으로 산미가 5단계 중 1로 가장 낮고, 다크 초콜릿과 자두, 바닐라의 단맛이 중심입니다.</p>
<p><strong>Q. 라떼에는 어떤 블렌드가 잘 맞나요?</strong><br />댐굳입니다. 밀크 레시피가 원두 22g에 추출량 28g으로 4종 중 가장 진하게 설계되어 있어 우유를 만나도 커피 맛이 밀리지 않습니다.</p>
<p><strong>Q. 원두를 하나만 둔다면 무엇이 좋나요?</strong><br />올라운더입니다. 에스프레소, 필터, 밀크 어디에 써도 균형이 무너지지 않도록 기획한 미디움 블렌드입니다.</p>
<p><strong>Q. 이지피지는 디카페인인가요?</strong><br />아닙니다. C2 공법 디카페인 원두를 섞어 카페인을 낮춘 로우 카페인 블렌드입니다.</p>
<hr />
<h2>English</h2>
<p><strong>Four MTSPACE blends compared.</strong> The four blends differ by purpose, not only by roast level. Damn Good is a dark roast with notes of dark chocolate, plum and vanilla, built for milk drinks, with the lowest acidity. Allrounder is a medium roast with berries, apple, cacao and almond that stays balanced across espresso, filter and milk. Spotlight is a light roast with mandarin, grapefruit, red grape and apricot that suits pour-over and has the brightest acidity. EZPZ is a medium roast with caramel, nuts and citrus, a low-caffeine blend rather than a decaf. All four come in a retail bag and in the business line.</p>
<hr />
<h3>출처</h3>
<ul><li>제품 정보, 플레이버 노트, 레시피, 가격: MTSPACE COFFEE 상품 데이터와 자체 로스팅 기록</li><li>관능 비교 차트: MTSPACE COFFEE 사내 커핑 평가</li></ul>$mcw4649d0ba$,
  seo_title = $mcw4649d0ba$블렌드 4종 비교: 댐굳, 올라운더, 스팟라이트, 이지피지 | MTSPACE COFFEE$mcw4649d0ba$,
  seo_description = $mcw4649d0ba$MTSPACE COFFEE 시그니처 블렌드 4종을 산미, 단맛, 바디, 밀크 궁합 5단계 게이지로 비교합니다. 라떼 중심, 핸드드립, 오후 커피, 원두 한 종만 둘 때 각각 무엇을 고르면 되는지 상황별로 안내합니다.$mcw4649d0ba$
 where id = '29700c1d-7132-4c21-ae43-939809d1ae79';
-- content_post blog-kenya-mugaya-aa-washed
update public.content_post set title = $mcw4649d0ba$무가야 AA 워시드: 6시간 침지가 만든 케냐 키리냐가의 맑음$mcw4649d0ba$,
  excerpt = $mcw4649d0ba$케냐식 워시드는 씻는 데서 끝나지 않습니다. 씻어낸 파치먼트를 6시간 더 물에 담가 두는 재침지, 무가야 특유의 맑은 산미는 여기서 만들어집니다. 키리냐가 무티라 협동조합의 1975년 워싱스테이션과 대회용 라이트 프로파일로 완성한 싱글 오리진.$mcw4649d0ba$,
  body_html = $mcw4649d0ba$<p>케냐 커피는 진하고 강한 산미로 기억되곤 합니다. 무가야는 조금 다릅니다. 씻어낸 뒤 한 번 더 물에 담가 두는 공정 하나가, 이 커피의 인상을 &#39;강한 산미&#39;에서 &#39;맑은 산미&#39;로 옮겨 놓습니다.</p>
<p><a href="https://mtspace.coffee/products/kenya-mugaya-aa-washed-125"><strong>케냐 무가야 AA 워시드</strong> 보러 가기 →</a></p>
<h2>케냐산 자락, 반세기를 지킨 워싱스테이션</h2>
<p>무가야 워싱스테이션은 1975년에 문을 열었습니다. 케냐산 남쪽 자락 키리냐가 카구모 타운 인근, 붉은 화산토 고지대에 자리하고 있고, 무티라 협동조합이 운영하는 열 개 가공소 가운데 하나입니다. 반세기 가까이 같은 자리를 지켜온 곳입니다.</p>
<p>체리를 가져오는 사람은 약 1,700명의 소농입니다. 평균 경작 면적은 0.1헥타르: 밭이라기보다 텃밭에 가까운 규모이고, 그 안에 옥수수와 콩, 채소를 커피와 함께 심습니다. 커피만으로 한 해를 버티는 것이 아니라, 살림의 한 축으로 커피를 짓는 방식입니다.</p>
<p>재배 고도는 해발 1,700~1,800m. 심어진 나무의 90% 이상이 <strong>SL28과 SL34</strong>이고, 여기에 <strong>루이루11</strong>과 <strong>바티안</strong>이 소량 섞여 있습니다. SL28과 SL34는 1930년대 스콧 연구소(Scott Laboratories)에서 선발된 계통으로, 오늘날 케냐 커피 특유의 붉은 과일, 시트러스 계열 산미를 이야기할 때 빠지지 않는 품종입니다.</p>
<h2>씻고, 한 번 더 담근다</h2>
<p>무가야의 가공은 케냐식 워시드의 교과서에 가깝습니다.</p>
<ol><li>디스크 펄퍼로 과육을 벗겨낸 뒤 <strong>24시간 건식 발효</strong></li><li>케냐산 삼림에서 내려오는 <strong>르와무탐비(Rwamuthambi) 강물</strong>로 점액질 세척</li><li>여기서 끝내지 않고 <strong>6시간 재침지(soaking)</strong></li><li>아프리칸 베드에서 천천히 건조</li></ol>
<p>핵심은 3번입니다. 대부분의 워시드는 세척에서 공정을 끝냅니다. 케냐에서는 씻어낸 파치먼트를 깨끗한 물에 다시 담가 두는데, 이 과정에서 잔여 점액질과 발효 부산물이 한 번 더 빠져나갑니다. 무가야 특유의 맑음: 산미가 날카롭게 튀지 않고 투명하게 정리되는 인상, 은 이 6시간에서 만들어집니다.</p>
<h2>크랜베리에서 자몽으로</h2>
<p>컵 노트는 <strong>크랜베리, 사과, 사탕수수, 자몽</strong>입니다.</p>
<p>첫 모금은 크랜베리와 사과에 가깝습니다. 붉은 과일의 산미인데 뾰족하지 않고 둥글게 들어옵니다. 중간에서 사탕수수의 단맛이 받쳐 주고, 마지막에 자몽 껍질 쪽의 쌉쌀한 시트러스가 길게 남습니다. 바디는 케냐치고 가벼운 편이고, 끝은 깨끗합니다.</p>
<p>식을수록 사탕수수의 단맛이 앞으로 나옵니다. 뜨거울 때 산미가 강하다고 느껴지면, 잠시 두었다가 다시 마셔보시길 권합니다.</p>
<p><a href="https://mtspace.coffee/products/kenya-mugaya-aa-washed-125"><strong>맑은 케냐를 확인해 보세요, 18,000원</strong> →</a></p>
<h2>AA는 등급이 아니라 크기입니다</h2>
<p>케냐 커피의 AA, AB, PB는 품질 등급이 아니라 <strong>생두 크기 분류</strong>입니다. AA는 스크린 18을 통과하고 17에 걸리는, 가장 큰 생두를 모은 것입니다. AB는 스크린 16/17, PB(피베리)는 체리 안에 한 알만 자란 둥근 생두를 따로 모은 것입니다.</p>
<p>크기는 눈에 보이는 단순한 지표일 뿐, 컵 퀄리티를 그대로 보증하지는 않습니다. 잘 만든 AB가 평범한 AA보다 좋은 경우도 흔합니다. 다만 생두 크기가 고르면 로스팅 중 열이 균일하게 들어가기 때문에, 라이트 프로파일처럼 여유가 적은 설정에서는 다루기가 수월해집니다. 이 로트를 AA로 고른 이유입니다.</p>
<h2>대회에서 쓰는 라이트 프로파일 그대로</h2>
<p>라이트 로스팅은 덜 볶는 것이 아닙니다. 산미만 남고 단맛이 비는 라이트는 흔하고, 그래서 MTSPACE는 이 커피에 대회에서 쓰는 것과 같은 프로파일을 그대로 적용했습니다.</p>
<blockquote><p>1차 크랙 6분 30초, 크랙 이후 5℃ 상승, 디벨롭먼트 타임 45초</p></blockquote>
<p>크랙 이후 온도를 5℃만 밀어 올리고 45초에서 끊습니다. 향이 날아가기 전에 단맛이 붙는 구간을 확보하기 위한 설정이고, 덕분에 라이트 로스트치고 추출이 예민하지 않습니다.</p>
<p>원두는 미리 볶아 쌓아 두지 않습니다. 주문 시점 기준으로 가장 가까운 로스팅 날짜의 원두가 나갑니다.</p>
<h2>이런 분께 권합니다</h2>
<ul><li>케냐를 좋아하지만 산미가 부담스러웠던 분</li><li>필터, 핸드드립으로 향과 단맛의 변화를 즐기는 홈브루어</li><li>붉은 과일 계열의 워시드 아프리카 커피를 찾는 분</li><li>에티오피아 워시드와 다른 결의 라이트 로스트를 마셔보고 싶은 분</li></ul>
<p>라이트 로스트가 처음이라면 블렌드인 <a href="https://mtspace.coffee/blogs/coffeelog/blog-spotlight-story">스팟라이트 spotlight</a>부터, 다른 산지도 함께 보고 싶다면 <a href="https://mtspace.coffee/collections/single-origins">싱글 오리진 전체</a>를 확인해 보세요.</p>
<h2>추천 레시피</h2>
<table><thead><tr><th>추출</th><th>도징</th><th>추출량</th><th>시간</th></tr></thead><tbody><tr><td>필터(V60)</td><td>15g, 분쇄도 700</td><td>블룸 45g, 90초 / 총 225g</td><td>2:10~2:30</td></tr><tr><td>에스프레소</td><td>18g</td><td>45g</td><td>23초</td></tr><tr><td>밀크</td><td>20g</td><td>38g (우유 150ml)</td><td>25초</td></tr></tbody></table>
<p>붉은 과일의 산미와 사탕수수 단맛을 가장 선명하게 잡으려면 필터 추출을 권합니다.</p>
<h2>스펙</h2>
<table><thead><tr><th>항목</th><th>내용</th></tr></thead><tbody><tr><td>원산지</td><td>케냐 키리냐가 카구모</td></tr><tr><td>가공소</td><td>무가야 워싱스테이션 (1975년 설립)</td></tr><tr><td>협동조합</td><td>무티라 협동조합</td></tr><tr><td>고도</td><td>1,700~1,800m</td></tr><tr><td>품종</td><td>SL28, SL34, 루이루11, 바티안</td></tr><tr><td>가공</td><td>워시드 (24시간 발효, 6시간 재침지, 아프리칸 베드)</td></tr><tr><td>등급</td><td>AA</td></tr><tr><td>로스팅</td><td>라이트</td></tr></tbody></table>
<p><a href="https://mtspace.coffee/products/kenya-mugaya-aa-washed-125"><strong>장바구니에 담기, 18,000원</strong> →</a></p>
<h2>자주 묻는 질문</h2>
<p><strong>Q. 케냐는 산미가 강하다던데 괜찮을까요?</strong><br />붉은 과일 계열의 산미가 분명히 있지만, 6시간 재침지를 거친 로트라 날카롭기보다 맑은 쪽입니다. 식으면서 사탕수수의 단맛이 올라와 균형이 잡힙니다.</p>
<p><strong>Q. AA면 AB보다 좋은 커피인가요?</strong><br />AA, AB는 생두 크기 분류이지 품질 등급이 아닙니다. 다만 크기가 고르면 로스팅 중 열이 균일하게 들어가 라이트 프로파일을 안정적으로 다루기 좋습니다.</p>
<p><strong>Q. 라이트 로스팅은 내리기 어렵지 않나요?</strong><br />위 필터 레시피(15g / 분쇄도 700 / 총 225g)로 시작하시면 됩니다. 산미가 날카로우면 분쇄도를 조금 굵게, 밍밍하면 조금 가늘게 조정하세요.</p>
<p><strong>Q. 한 봉은 어느 정도 분량인가요?</strong><br />필터 15g 기준 약 8잔, 에스프레소 18g 기준 약 7샷 분량입니다. 라이트 로스트의 향이 가장 좋을 때 다 마실 수 있는 크기로 잡았습니다.</p>
<p><strong>Q. 언제 로스팅한 원두인가요?</strong><br />미리 볶아 쌓아 두지 않고, 가장 가까운 로스팅 회차에 볶아 보냅니다.</p>
<h2>English</h2>
<p><strong>Kenya Mugaya AA Washed.</strong> Mugaya washing station opened in 1975 near Kagumo town in the Kirinyaga highlands, on the southern slopes of Mt. Kenya: one of ten factories run by the Mutira Farmers&#39; Cooperative Society. Around 1,700 smallholders deliver cherry, each farming roughly 0.1 hectares intercropped with maize, beans and vegetables. Grown at 1,700~1,800m on red volcanic soil; over 90% SL28 and SL34, with small plantings of Ruiru 11 and Batian.</p>
<p>Processing is textbook Kenyan washed: 24-hour dry fermentation, washed with water from the Rwamuthambi River, then a further six-hour soak before slow drying on raised beds. That soak is what gives Mugaya its clarity, acidity that reads transparent rather than sharp.</p>
<p>Cranberry, apple, cane sugar and grapefruit. Light-bodied for a Kenya, clean on the finish, and the cane sugar sweetness comes forward as it cools. Roasted on the same light profile MTSPACE uses in competition: first crack at 6:30, +5℃ after crack, 45s development. Recipes: filter (V60) 15g, 45g bloom 90s, 225g total, 2:10~2:30; espresso 18g/45g/23s; milk 20g/38g/25s.</p>
<p><a href="https://mtspace.coffee/products/kenya-mugaya-aa-washed-125">Shop Kenya Mugaya AA Washed →</a></p>
<h3>출처</h3>
<ul><li>무가야 설립연도, 소농 규모, 경작 면적, 고도, 품종 구성, 가공(24시간 발효, 6시간 재침지, 르와무탐비 강): <a href="https://www.trabocca.com/our-coffees/kenya/kirinyaga/mugaya/">Trabocca: Mugaya, Kirinyaga</a></li><li>무티라 협동조합 구조, 키리냐가 지역 정보: <a href="https://climatesmart.coffee/farmers/mutira-farmers-cooperative-society">Climate Smart Coffee: Mutira Farmers Cooperative Society</a></li><li>케냐 등급(AA, AB, PB) 스크린 사이즈 기준과 등급≠품질: <a href="https://www.trabocca.com/coffee-knowledge/origin/kenya-grades-explained/">Trabocca: Kenya Grades Explained</a></li><li>커핑 노트, 로스팅 프로파일, 추천 레시피: MTSPACE COFFEE 자체 로스팅 기록</li></ul>$mcw4649d0ba$,
  seo_title = $mcw4649d0ba$케냐 무가야 AA 워시드 | 크랜베리, 사과, 사탕수수, 자몽 싱글 오리진 - MTSPACE COFFEE$mcw4649d0ba$,
  seo_description = $mcw4649d0ba$키리냐가 카구모의 무가야 워싱스테이션(1975년 설립), 무티라 협동조합 소농 약 1,700명. 해발 1,700~1,800m, SL28, SL34 중심, 24시간 발효 후 6시간 재침지 워시드. 크랜베리, 사과, 사탕수수, 자몽의 라이트 로스트 싱글 오리진과 추천 레시피를 정리했습니다.$mcw4649d0ba$
 where id = 'a7ddbc0b-9e08-404c-ae1e-8d3c01b6a1ed';
-- content_post blog-ethiopia-kochere-danicho
update public.content_post set title = $mcw4649d0ba$코체레 다니초 워시드: 자스민에서 시작해 유자로 떨어지는 에티오피아$mcw4649d0ba$,
  body_html = $mcw4649d0ba$<p>커피 이름 '다니초'는 지역명이 아니라 사람 이름입니다. 예가체프 코체레의 하마(Hama) 지역에서 커피를 모으는 생산자, <strong>다니초 무케레(Danicho Mukere)</strong>. 그의 워싱스테이션에는 코체레 일대 약 2,150개 소농가가 체리를 들고 옵니다. 농가 평균 경작 면적은 1.5헥타르: 밭이라기보다 정원에 가까운 규모입니다.</p>
<p><a href="https://mtspace.coffee/products/ethiopia-kochere-danicho"><strong>에티오피아 코체레 다니초 워시드</strong> 보러 가기 →</a></p>
<h2>해발 2,000m에서 천천히 익은 체리</h2>
<p>재배 고도는 1,980~2,250m. 고도가 높으면 밤낮 기온차가 커지고 체리가 그만큼 천천히 익습니다. 밀도가 높아진 생두는 로스팅 과정에서 향미를 더 오래 붙들죠. 코체레가 오랫동안 "깨끗한 인상과 플로럴한 향, 시트러스 계열의 산미"로 평가받아온 배경입니다.</p>
<p>품종은 에티오피아 토착종에 JARC 선발종 74110, 74112, 74158이 섞여 있습니다. 74110과 74112는 서부 일루바보르 메투 비샤리 숲의 나무에서 선발된 계통으로 커피베리병 저항성과 과실 계열 향미로 알려져 있고, 74158은 1970년대 야생 나무에서 선발돼 고지대 적응력을 갖췄습니다. 단일 품종의 또렷함 대신, 여러 계통이 겹치며 만드는 층위가 이 커피의 성격입니다.</p>
<h2>자스민에서 시작해 유자로 떨어진다</h2>
<p>컵 노트는 <strong>자스민, 유자, 오렌지필, 살구</strong>.</p>
<p>코를 대면 흰 꽃 계열의 향이 먼저 옵니다. 한 모금 넘기면 유자와 오렌지필의 껍질 쪽 산미가 또렷하게 남고, 온도가 내려가면서 살구의 단맛이 올라옵니다. 워시드 가공이 과육의 개입을 덜어낸 덕분에 향이 겹치지 않고 순서대로 드러납니다. 무겁지 않고 끝이 깨끗한, 차에 가까운 한 잔입니다.</p>
<p>식으면서 맛이 바뀌는 커피를 좋아한다면, 한 잔을 30분 두고 마셔보시길 권합니다. 뜨거울 때의 자스민과 식었을 때의 살구가 같은 커피에서 나옵니다.</p>
<p><a href="https://mtspace.coffee/products/ethiopia-kochere-danicho"><strong>한 잔의 온도 변화를 직접 확인해 보세요, 17,000원</strong> →</a></p>
<h2>라이트 로스팅은 덜 볶는 것이 아닙니다</h2>
<p>산미만 남고 단맛이 비는 라이트 로스팅은 흔합니다. 그래서 MTSPACE는 이 커피에 대회에서 쓰는 것과 같은 라이트 프로파일을 그대로 적용했습니다.</p>
<blockquote><p>1차 크랙 6분 30초, 크랙 이후 5℃ 상승, 디벨롭먼트 타임 45초</p></blockquote>
<p>크랙 이후 온도를 5℃만 밀어 올리고 45초에서 끊는 설정입니다. 향이 날아가기 전에 단맛이 붙는 구간을 확보하기 위한 것이고, 그래서 이 커피는 라이트 로스트치고 추출이 예민하지 않습니다.</p>
<p>원두는 미리 볶아 쌓아 두지 않습니다. 주문 시점 기준으로 가장 가까운 로스팅 날짜의 원두가 나갑니다.</p>
<h2>이런 분께 권합니다</h2>
<ul><li>플로럴, 시트러스 계열의 워시드 에티오피아를 찾는 분</li><li>필터, 핸드드립으로 향을 즐기는 홈브루어</li><li>블렌드에서 싱글 오리진으로 넘어가 보려는 분</li><li>산지와 생산자까지 확인하고 마시고 싶은 분</li></ul>
<p>블렌드부터 시작하고 싶다면 <a href="https://mtspace.coffee/blogs/coffeelog/blog-spotlight-story">스팟라이트 spotlight</a>를, 다른 싱글 오리진도 함께 보고 싶다면 <a href="https://mtspace.coffee/collections/single-origins">싱글 오리진 전체</a>를 확인해 보세요.</p>
<h2>추천 레시피</h2>
<table><thead><tr><th>추출</th><th>도징</th><th>추출량</th><th>시간</th></tr></thead><tbody><tr><td>필터(V60)</td><td>15g, 분쇄도 700</td><td>블룸 45g, 90초 / 총 225g</td><td>2:10~2:30</td></tr><tr><td>에스프레소</td><td>18g</td><td>43g</td><td>24초</td></tr><tr><td>밀크</td><td>20g</td><td>40g (우유 150ml)</td><td>26초</td></tr></tbody></table>
<p>향과 산미를 가장 선명하게 즐기려면 필터 추출을 권합니다.</p>
<h2>스펙</h2>
<table><thead><tr><th>항목</th><th>내용</th></tr></thead><tbody><tr><td>원산지</td><td>에티오피아 예가체프 코체레 하마</td></tr><tr><td>생산자</td><td>다니초 무케레(Danicho Mukere)</td></tr><tr><td>고도</td><td>1,980~2,250m</td></tr><tr><td>품종</td><td>에티오피아 토착종, 74110, 74112, 74158</td></tr><tr><td>가공</td><td>워시드</td></tr><tr><td>로스팅</td><td>라이트</td></tr></tbody></table>
<p><a href="https://mtspace.coffee/products/ethiopia-kochere-danicho"><strong>장바구니에 담기, 17,000원</strong> →</a></p>
<h2>자주 묻는 질문</h2>
<p><strong>Q. 워시드인데 산미가 강한가요?</strong><br>껍질 쪽의 또렷한 시트러스 산미가 있지만 날카롭기보다 맑은 쪽입니다. 식으면서 살구의 단맛이 올라와 균형이 잡힙니다.</p>
<p><strong>Q. 라이트 로스팅은 내리기 어렵지 않나요?</strong><br>위 필터 레시피(15g / 분쇄도 700 / 총 225g)를 기준으로 시작하시면 됩니다. 산미가 날카로우면 분쇄도를 조금 굵게, 밍밍하면 조금 가늘게 조정하세요.</p>
<p><strong>Q. 한 봉은 어느 정도 분량인가요?</strong><br>필터 15g 기준 약 8잔, 에스프레소 18g 기준 약 7샷 분량입니다. 라이트 로스트의 향이 가장 좋을 때 다 마실 수 있는 크기로 잡았습니다.</p>
<p><strong>Q. 언제 로스팅한 원두인가요?</strong><br>미리 볶아 쌓아 두지 않고, 가장 가까운 로스팅 회차에 볶아 보냅니다.</p>
<p>---</p>
<h2>English</h2>
<p><strong>Ethiopia Kochere Danicho Washed.</strong> Danicho is a person, not a place, Danicho Mukere collects cherries from around 2,150 smallholders in Hama, Kochere, Yirgacheffe, farming an average of 1.5 hectares each. Grown at 1,980~2,250m, the lot mixes Ethiopian landraces with JARC selections 74110, 74112 and 74158. Jasmine, yuzu, orange peel and apricot; light-bodied, clean and tea-like, and it shifts as it cools, jasmine hot, apricot cool. Roasted on the same light profile MTSPACE uses in competition: first crack at 6:30, +5℃ after crack, 45s development. Recipes: filter (V60) 15g, 45g bloom 90s, 225g total, 2:10~2:30; espresso 18g/43g/24s; milk 20g/40g/26s.</p>
<p><a href="https://mtspace.coffee/products/ethiopia-kochere-danicho">Shop Ethiopia Kochere Danicho Washed →</a></p>
<p>---</p>
<h3>출처</h3>
<ul><li>생산자, 지역, 고도, 소농 규모, 수확기: <a href="https://m.coffeelibre.kr/product/detail.html?product_no=7757">커피 리브레: 에티오피아 예가체프 코체레 다니초 2026</a></li><li>코체레 워레다, 예가체프(게데오) 지역 구조: <a href="https://www.trabocca.com/our-coffees/ethiopia/yirgacheffe/">Trabocca: Yirgacheffe region (Gedeo)</a></li><li>JARC 74110, 74112, 74158 선발 배경: <a href="https://glossary.greencoffeecollective.com/coffee-varieties-and-genetics/jarc-varietals">Green Coffee Collective, JARC Varietals</a></li><li>커핑 노트, 로스팅 프로파일: MTSPACE COFFEE 자체 로스팅 기록</li></ul>$mcw4649d0ba$,
  seo_title = $mcw4649d0ba$에티오피아 코체레 다니초 워시드 | 자스민, 유자, 오렌지필 싱글 오리진 - MTSPACE COFFEE$mcw4649d0ba$,
  seo_description = $mcw4649d0ba$예가체프 코체레 하마의 생산자 다니초 무케레. 해발 1,980~2,250m, 토착종과 JARC 74110, 74112, 74158, 워시드 가공. 자스민, 유자, 오렌지필, 살구의 라이트 로스트 싱글 오리진과 추천 레시피를 정리했습니다.$mcw4649d0ba$
 where id = 'ccc3b3f0-45ac-486f-8316-eb8640fe2ede';
-- content_post blog-spotlight-story
update public.content_post set title = $mcw4649d0ba$스팟라이트 spotlight: 다루기 쉬운 라이트 스페셜티 블렌드$mcw4649d0ba$,
  excerpt = $mcw4649d0ba$화려한 과일향에 추출 안정성까지 갖춘 라이트 블렌드. 귤, 자몽, 적포도, 살구의 맑고 산뜻한 한 잔을 소개합니다.$mcw4649d0ba$,
  body_html = $mcw4649d0ba$<p>스팟라이트(spotlight)는 라이트 로스팅 특유의 밝고 화사한 과일향을 살리면서도, 누구나 실패 없이 내릴 수 있도록 만든 스페셜티 블렌드입니다. 귤, 자몽, 적포도, 살구를 닮은 경쾌한 산미와 섬세한 단맛이 어우러져, 첫 모금부터 끝까지 맑고 산뜻합니다.</p><figure><img src="https://apiskyivlvebpvvxfejq.supabase.co/storage/v1/object/public/product-assets/blog/blends/spotlight-hero.jpg" alt="스팟라이트 푸어오버 — 골고루 부풀어 오르는 커피 베드" style="width:100%;border-radius:14px;margin:0" loading="lazy" /><figcaption style="text-align:center;color:#8A8173;font-size:0.85rem;margin-top:8px">스팟라이트 푸어오버: 골고루 부풀어 오르는 커피 베드</figcaption></figure><h2>라이트 블렌드의 오랜 고민을 풀다</h2><p>스페셜티 블렌드라고 하면 가장 먼저 밝은 산미와 화려한 과일향이 떠오릅니다. 그래서 많은 로스터가 라이트 블렌드를 만들 때, 어떤 프루티함을 담을지 그리고 실제로 내려 마셨을 때 어떤 인상을 줄지를 오래 고민합니다.</p><p>MTSPACE COFFEE가 생각하는 이상적인 스페셜티 블렌드는 화려한 향에서 끝나지 않습니다. 라이트 로스팅의 밝은 향미는 그대로 살리되, 미디움, 다크 블렌드처럼 추출 안정성과 플레이버의 조화까지 갖춰야 한다고 믿었습니다. 그래야 전문가가 아니어도 집에서 편하게, 퀄리티 있는 한 잔을 뽑을 수 있으니까요. 스팟라이트는 이 기준을 채우기 위해 수많은 원료, 배합비, 로스팅 프로파일을 세심하게 테스트하며 완성한 블렌드입니다.</p><figure><img src="https://apiskyivlvebpvvxfejq.supabase.co/storage/v1/object/public/product-assets/blog/blends/spotlight-black.jpg" alt="맑고 깨끗하게 떨어지는 스팟라이트" style="width:100%;border-radius:14px;margin:0" loading="lazy" /><figcaption style="text-align:center;color:#8A8173;font-size:0.85rem;margin-top:8px">맑고 깨끗하게 떨어지는 스팟라이트</figcaption></figure><h2>맑고 산뜻한 한 잔</h2><p>스팟라이트는 귤과 자몽의 상큼함, 은은한 적포도와 살구의 뉘앙스를 섬세하게 품고 있습니다. 경쾌한 산미와 섬세한 단맛이 입안 가득 생기를 전하고, 깨끗하고 가벼운 바디감 덕분에 여운까지 산뜻합니다. 하루를 기분 좋게 시작하거나, 나른한 오후를 환기하고 싶을 때 특히 잘 어울립니다.</p><h2>이런 분께 권합니다</h2><ul><li>밝은 산미와 과일향을 좋아하는 스페셜티 입문자~애호가</li><li>핸드드립, 필터로 향을 즐기는 홈브루어</li><li>아침을 상쾌하게 여는 커피를 찾는 분</li><li>라이트 블렌드지만 추출이 까다롭지 않길 바라는 분</li></ul><h2>추천 레시피</h2><ul><li><strong>에스프레소</strong>: 도징 20g / 추출 45g / 24초</li><li><strong>라떼(밀크)</strong>: 도징 22g / 추출 42g / 28초, 6oz 싱글샷</li><li><strong>필터(V60)</strong>: 도징 12g / 블룸 36g, 60초 / 총 192g / 1:40~2:00</li></ul><h2>자주 묻는 질문</h2><p><strong>Q. 스팟라이트는 어떤 맛인가요?</strong><br>귤, 자몽, 적포도, 살구를 닮은 밝은 과일향과 경쾌한 산미, 섬세한 단맛이 특징인 라이트 로스트 블렌드입니다.</p><p><strong>Q. 라이트 로스트는 내리기 어렵지 않나요?</strong><br>스팟라이트는 라이트 블렌드이면서도 추출 안정성을 함께 갖추도록 설계되어, 홈브루 초심자도 비교적 쉽게 맑은 한 잔을 낼 수 있습니다.</p><p><strong>Q. 어떤 추출을 추천하나요?</strong><br>과일향과 산미를 가장 선명하게 즐기려면 V60 같은 필터 추출을 권합니다. 에스프레소, 밀크 베이스로도 산뜻하게 즐길 수 있습니다.</p><hr><h2>English</h2><p><em>Spotlight</em> is a light specialty blend that keeps bright, fruity character while staying easy to brew. Delicate notes of mandarin, grapefruit, red grape and apricot bring lively acidity and fine sweetness for a clean, refreshing cup. Built with the brewing stability of a medium or dark roast, so anyone can pull a quality cup. Recipes: espresso 20g/45g/24s, latte 22g/42g/28s, filter (V60) 12g, 36g bloom 60s, 192g total, 1:40~2:00.</p>
<hr />
<h3>출처</h3>
<ul><li>제품 정보, 플레이버 노트, 추천 레시피: MTSPACE COFFEE 상품 데이터와 자체 로스팅 기록</li><li>블렌드 개발 배경: MTSPACE COFFEE 브랜드 기록</li></ul>$mcw4649d0ba$,
  seo_title = $mcw4649d0ba$스팟라이트 spotlight 원두 이야기 | 귤, 자몽, 적포도 라이트 블렌드 - MTSPACE COFFEE$mcw4649d0ba$,
  seo_description = $mcw4649d0ba$밝은 과일향에 추출 안정성까지 갖춘 라이트 블렌드 스팟라이트. 귤, 자몽, 적포도, 살구의 경쾌한 산미와 누구나 쉽게 내리는 추천 레시피를 정리했습니다.$mcw4649d0ba$
 where id = 'aa44ceaa-5cc5-429f-877e-d6fa54925527';
-- content_post blog-why-ethiopia-base
update public.content_post set title = $mcw4649d0ba$라이트든 다크든, 캐릭터는 에티오피아: 왜 우리 블렌드는 에티오피아가 베이스인가$mcw4649d0ba$,
  excerpt = $mcw4649d0ba$댐굳 7:3, 올라운더 6:4: 블렌드 네 종의 베이스를 전부 에티오피아로 쓰는 세 가지 이유와 내추럴:워시드 비율을 공개합니다.$mcw4649d0ba$,
  body_html = $mcw4649d0ba$<p>블렌드 소개글에서 에티오피아는 대개 조연으로 등장합니다. 향을 살짝 얹는 액센트로 몇 스푼 섞고, 베이스는 다른 산지가 맡는 구성이 흔합니다. MTSPACE COFFEE는 반대로 갑니다. 우리 블렌드 네 종의 베이스는 전부 에티오피아입니다.</p>
<h2>비율부터 공개합니다</h2>
<table><thead><tr><th>블렌드</th><th>로스팅</th><th>구성 (내추럴 : 워시드)</th></tr></thead><tbody><tr><td>댐굳 damn good</td><td>다크</td><td>7 : 3</td></tr><tr><td>올라운더 allrounder</td><td>미디움</td><td>6 : 4</td></tr><tr><td>스팟라이트 spotlight</td><td>라이트</td><td>6.5 : 3.5</td></tr><tr><td>이지피지 ez pz</td><td>미디움</td><td>내추럴 6 : 디카페인 4</td></tr></tbody></table>
<p>네 블렌드 모두 에티오피아 내추럴이 중심이고, 워시드가 구조를 잡습니다. 이지피지의 디카페인 파트 역시 에티오피아 예가체프입니다. 숨길 이유가 없어서 공개합니다. 비율은 따라 할 수 있어도, 어떤 로트를 어떻게 볶아 어떻게 겹치는지는 우리의 일이니까요.</p>
<h2>이유 1: 로스팅을 관통하는 캐릭터</h2>
<p>에티오피아를 베이스로 쓰는 첫 번째 이유는 풍미입니다. 비슷한 가격대의 생두 중에서 에티오피아만큼 과일 계열 캐릭터가 또렷하게 드러나는 산지를 찾기 어렵고, 무엇보다 그 캐릭터가 로스팅 단계를 가리지 않습니다. 다크로 볶은 댐굳에서는 자두와 바닐라로, 라이트로 볶은 스팟라이트에서는 귤, 자몽, 살구로, 표현은 달라져도 뿌리는 같습니다. 라이트든 다크든, 캐릭터는 에티오피아입니다.</p>
<h2>이유 2: 품질 대비 가격의 계산</h2>
<p>두 번째 이유는 경제적인 판단입니다. 같은 단가에서 컵 퀄리티가 안정적으로 나와야 도매가를 지키면서도 맛을 타협하지 않을 수 있습니다. 우리 소싱은 핵심 지역, 스테이션과의 반복 거래를 축으로 하되, 시즌마다 샘플을 커핑해 그해 좋은 로트를 선별하는 혼합 구조입니다. 에티오피아는 이 기준에서 매 시즌 결과를 내주는 산지였습니다.</p>
<h2>이유 3: 봉투 안에서도 유지되는 레시피</h2>
<p>세 번째 이유는 눈에 잘 띄지 않는 문제에 대한 답입니다. 서로 다른 산지를 섞은 블렌드는 원두 알의 크기와 밀도가 제각각이라, 배송 중 흔들리는 동안 봉투 안에서 층이 나뉠 수 있습니다. 위쪽을 덜어 쓸 때와 바닥을 긁어 쓸 때 배합비가 달라진다는 뜻입니다. 우리는 블렌드를 설계할 때 스크린 사이즈가 비슷한 에티오피아 생두끼리 조합해 이 분리를 최소화하는 것을 원칙으로 합니다. 카페에서 첫 도징과 마지막 도징이 같은 맛이어야 한다는 것, 납품하는 로스터리가 지켜야 할 약속이라고 생각합니다. 사용 중인 생두의 실측 데이터는 다음 글에서 공개할 예정입니다.</p>
<h2>미리 볶아 두지 않습니다</h2>
<p>에티오피아의 캐릭터는 신선할 때 가장 분명합니다. 그래서 우리는 미리 볶아 쌓아 두지 않습니다. 자체 로스터리에서 볶은 그 주의 원두가 그 주에 도착합니다.</p>
<p>카페 납품, 도매 상담은 <a href="https://mtspace.coffee/consulting">Consulting</a> 페이지에서, 이번 주 로스팅 라인업은 <a href="https://mtspace.coffee/collections/all">쇼핑</a>에서 확인하실 수 있습니다.</p>
<h2>자주 묻는 질문</h2>
<p><strong>Q. MTSPACE 블렌드의 구성 비율은 어떻게 되나요?</strong><br />에티오피아 내추럴과 워시드의 비율은 댐굳 7:3, 올라운더 6:4, 스팟라이트 6.5:3.5입니다. 이지피지는 내추럴 6에 에티오피아 예가체프 디카페인 4입니다.</p>
<p><strong>Q. 왜 에티오피아를 베이스로 쓰나요?</strong><br />이유는 세 가지입니다. 로스팅 단계를 가리지 않는 과일 계열 캐릭터, 품질 대비 가격, 그리고 스크린 사이즈가 비슷한 생두끼리 조합해 봉투 안에서의 분리를 줄이는 설계 원칙입니다.</p>
<p><strong>Q. 로스팅과 출고는 언제 하나요?</strong><br />미리 볶아 쌓아 두지 않고, 그 주에 볶은 원두를 보냅니다. 로스팅은 MTSPACE COFFEE 자체 로스터리에서 합니다.</p>
<hr />
<h2>English</h2>
<p><strong>Why every MTSPACE blend is built on Ethiopian coffee.</strong> All four blends use Ethiopian green coffee as the base, not as an accent. Natural to washed ratios: Damn Good 7:3, Allrounder 6:4, Spotlight 6.5:3.5, and EZPZ six parts natural to four parts Ethiopia Yirgacheffe decaf. Three reasons: a fruit character that carries through light to dark roasts, cup quality for the price, and blending beans of similar screen size to reduce separation inside the bag during shipping. Roasted in our own roastery and never pre-roasted for stock.</p>
<hr />
<h3>출처</h3>
<ul><li>블렌드 구성 비율과 소싱 구조: MTSPACE COFFEE 내부 원료 운영 기준</li><li>제품 정보: MTSPACE COFFEE 상품 데이터와 자체 로스팅 기록</li><li>사용 중인 생두의 실측 데이터는 후속 글에서 공개할 예정입니다</li></ul>$mcw4649d0ba$,
  seo_title = $mcw4649d0ba$에티오피아 베이스 블렌드: 비율까지 공개하는 이유 | MTSPACE COFFEE$mcw4649d0ba$,
  seo_description = $mcw4649d0ba$댐굳 7:3, 올라운더 6:4: MTSPACE COFFEE가 블렌드 네 종의 베이스를 전부 에티오피아로 쓰는 세 가지 이유와 내추럴:워시드 비율을 공개합니다.$mcw4649d0ba$
 where id = 'f555a8e4-2611-478b-b827-289eb842e901';
-- content_post blog-peru-buenos-aires
update public.content_post set body_html = $mcw4649d0ba$<p>커피 이름에 붙은 &#39;부에노스 아이레스&#39;는 아르헨티나의 수도가 아닙니다. 페루 북부 카하마르카(Cajamarca)주 하엔(Jaén) 지방, 살리케(Sallique) 지구에 자리한 고산 마을의 이름입니다. 이 마을은 오랫동안 완두와 옥수수를 기르던 곳이었습니다. 기후 변화와 새 재배 기술이 만나면서 마을은 커피 산지로 바뀌었고, 바이오 가든에서 묘목을 지역 환경에 적응시킨 뒤 본 재배지로 옮겨 심는 방식으로 아직 젊은 커피밭을 빠르게 다듬어 가고 있습니다.</p>
<p><a href="https://mtspace.coffee/products/peru-buenos-aires"><strong>페루 부에노스 아이레스 워시드</strong> 보러 가기 →</a></p>
<h2>카하마르카, 페루 커피의 북쪽 심장</h2>
<p>카하마르카는 페루 커피 수출을 금액 기준으로 이끄는 지역이고, 그 안에서도 하엔과 산 이그나시오(San Ignacio)가 재배 면적이 가장 넓은 두 지방입니다. 이 일대의 일반적인 재배 고도는 900~1,950m로 알려져 있고, 티피카, 카투라, 부르봉이 주된 품종입니다. 붉은 과일과 노란 과일 계열의 단맛과 밝은 산미가 이 지역 커피의 공통된 인상으로 꼽힙니다.</p>
<p>부에노스 아이레스 로트는 그 평균보다 훨씬 높은 2,250~2,400m에서 자랍니다. 고도가 높으면 밤낮의 기온차가 커지고 체리는 그만큼 천천히 익습니다. 밀도가 높아진 생두가 로스팅 과정에서 향미를 더 오래 붙드는 이유입니다. 품종은 카투라, 카투아이, 티피카. 카하마르카의 전통 품종 구성 위에 수확량과 균형을 위한 카투아이가 더해진 조합입니다.</p>
<h2>2~3일의 탱크 발효, 파라볼릭 드라이어의 느린 건조</h2>
<p>수확은 잘 익은 체리만 손으로 골라 진행합니다. 당일 펄핑한 체리를 탱크에서 2~3일 발효하고, 세척을 거쳐 파라볼릭 솔라 드라이어에서 얇게 펼쳐 천천히 말립니다. 수분이 고르게 빠지도록 계속 뒤집어 주는 이 건조 과정이 로트의 안정적인 품질을 만듭니다.</p>
<p>건조 방식 이야기는 카하마르카에서 특히 의미가 있습니다. 예전에는 수확기가 건조했기 때문에 파치먼트를 햇볕 아래 몇 주씩 펼쳐 두는 것으로 충분했지만, 근래에는 수확기의 불규칙한 비가 건조를 자주 방해합니다. 비닐 덮개를 씌운 태양열 건조대는 그 문제에 대한 이 지역의 대응이고, 이 로트의 파라볼릭 드라이어도 같은 맥락에 있습니다.</p>
<h2>사과의 산미, 카라멜의 단맛, 자두의 여운</h2>
<p>컵 노트는 <strong>사과, 카라멜, 자두</strong>.</p>
<p>첫 모금에서 사과 계열의 밀도 있는 산미가 먼저 옵니다. 워시드 가공이 과육의 개입을 덜어낸 덕분에 산미가 탁하지 않고 또렷합니다. 중간에 카라멜을 연상시키는 단맛이 산미를 받치고, 온도가 내려가면서 자두의 과일감과 와이니한 여운이 컵을 마무리합니다. 화려한 향으로 밀어붙이는 커피가 아니라, 산미와 단맛의 균형으로 기억되는 한 잔입니다.</p>
<p>에티오피아 워시드의 플로럴한 인상에 익숙하다면, 같은 라이트 로스트에서 남미 고산지 커피가 어떻게 다른 결을 내는지 비교해 보시길 권합니다.</p>
<p><a href="https://mtspace.coffee/products/peru-buenos-aires"><strong>사과와 카라멜의 균형을 직접 확인해 보세요, 18,000원</strong> →</a></p>
<h2>라이트 로스팅은 덜 볶는 것이 아닙니다</h2>
<p>산미만 남고 단맛이 비는 라이트 로스팅은 흔합니다. 그래서 MTSPACE는 이 커피에도 대회에서 쓰는 것과 같은 라이트 프로파일을 그대로 적용했습니다.</p>
<blockquote><p>1차 크랙 6분 30초 / 크랙 이후 5℃ 상승 / 디벨롭먼트 타임 45초</p></blockquote>
<p>크랙 이후 온도를 5℃만 밀어 올리고 45초에서 끊는 설정입니다. 향이 날아가기 전에 단맛이 붙는 구간을 확보하기 위한 것이고, 밀도 높은 고산지 생두에서 카라멜의 단맛을 끌어내는 데 이 구간이 특히 중요합니다.</p>
<p>원두는 미리 볶아 쌓아 두지 않습니다. 주문 시점 기준으로 가장 가까운 로스팅 날짜의 원두가 나갑니다.</p>
<h2>이런 분께 권합니다</h2>
<ul><li>산미와 단맛이 균형 잡힌 워시드 싱글 오리진을 찾는 분</li><li>에티오피아, 케냐 외의 산지를 라이트 로스트로 경험해 보고 싶은 분</li><li>필터와 에스프레소 양쪽에서 쓸 수 있는 싱글 오리진이 필요한 카페</li><li>산지의 변화까지 이야기로 담아 손님에게 소개하고 싶은 분</li></ul>
<p>블렌드부터 시작하고 싶다면 <a href="https://mtspace.coffee/blogs/coffeelog/blog-spotlight-story">스팟라이트 spotlight</a>를, 다른 싱글 오리진도 함께 보고 싶다면 <a href="https://mtspace.coffee/collections/single-origins">싱글 오리진 전체</a>를 확인해 보세요.</p>
<h2>추천 레시피</h2>
<table><thead><tr><th>추출</th><th>도징</th><th>추출량</th><th>시간</th></tr></thead><tbody><tr><td>필터(V60)</td><td>13g, 분쇄도 850</td><td>블룸 30g 90초 / 총 192g</td><td>2:10~2:30</td></tr><tr><td>에스프레소</td><td>20g</td><td>43g</td><td>25초</td></tr><tr><td>밀크</td><td>22g</td><td>40g (우유 150ml)</td><td>27초</td></tr></tbody></table>
<p>산미와 단맛의 균형을 확인하려면 필터를, 카라멜 쪽 단맛을 앞세우고 싶다면 밀크 레시피를 권합니다.</p>
<h2>스펙</h2>
<table><thead><tr><th>항목</th><th>내용</th></tr></thead><tbody><tr><td>원산지</td><td>페루 카하마르카 하엔 살리케 부에노스 아이레스</td></tr><tr><td>생산자</td><td>부에노스 아이레스 지역 소농</td></tr><tr><td>고도</td><td>2,250~2,400m</td></tr><tr><td>품종</td><td>카투라, 카투아이, 티피카</td></tr><tr><td>가공</td><td>워시드</td></tr><tr><td>로스팅</td><td>라이트</td></tr></tbody></table>
<p><a href="https://mtspace.coffee/products/peru-buenos-aires"><strong>장바구니에 담기, 18,000원</strong> →</a></p>
<h2>자주 묻는 질문</h2>
<p><strong>Q. 페루 커피는 산미가 약하지 않나요?</strong><br />2,250m 이상의 고도에서 자란 로트라 사과 계열의 산미가 또렷합니다. 다만 날카롭기보다 카라멜의 단맛이 받쳐 주는 균형 잡힌 쪽입니다.</p>
<p><strong>Q. 라이트 로스팅은 내리기 어렵지 않나요?</strong><br />위 필터 레시피(13g / 분쇄도 850 / 총 192g)를 기준으로 시작하시면 됩니다. 산미가 날카로우면 분쇄도를 조금 굵게, 밍밍하면 조금 가늘게 조정하세요.</p>
<p><strong>Q. 한 봉은 어느 정도 분량인가요?</strong><br />필터 13g 기준 약 9잔, 에스프레소 20g 기준 약 6샷 분량입니다. 라이트 로스트의 향이 가장 좋을 때 다 마실 수 있는 크기로 잡았습니다.</p>
<p><strong>Q. 언제 로스팅한 원두인가요?</strong><br />미리 볶아 쌓아 두지 않고, 가장 가까운 로스팅 회차에 볶아 보냅니다.</p>
<p>---</p>
<h2>English</h2>
<p><strong>Peru Buenos Aires Washed.</strong> Buenos Aires is not the Argentine capital but a high-altitude village in Sallique, Jaén, in Peru&#39;s northern Cajamarca region. Long a farming community growing peas and maize, the village turned to coffee as the climate shifted and new cultivation techniques arrived, raising seedlings in a bio-garden before transplanting them to the fields. Grown at 2,250~2,400m, the lot mixes Caturra, Catuai and Typica. Hand-picked ripe cherries are pulped the same day, fermented in tanks for two to three days, washed, and dried slowly in parabolic solar dryers with constant turning. Apple, caramel and plum; a dense, clean acidity balanced by caramel sweetness and a winey finish. Roasted on the same light profile MTSPACE uses in competition: first crack at 6:30, +5℃ after crack, 45s development. Recipes: filter (V60) 13g, 30g bloom 90s, 192g total, 2:10~2:30; espresso 20g/43g/25s; milk 22g/40g/27s.</p>
<p><a href="https://mtspace.coffee/products/peru-buenos-aires">Shop Peru Buenos Aires Washed →</a></p>
<p>---</p>
<h3>출처</h3>
<ul><li>마을 배경, 재배 고도, 품종, 가공과 건조 방식: 생두 수입사 로트 자료</li><li>살리케 지구의 위치(카하마르카 하엔): <a href="https://en.wikipedia.org/wiki/Sallique_District">Wikipedia, Sallique District</a></li><li>하엔과 산 이그나시오의 일반 재배 고도, 주요 품종, 지역 향미 특성: <a href="https://perfectdailygrind.com/2019/11/a-guide-to-perus-coffee-producing-regional-profiles/">Perfect Daily Grind, A Guide to Peru&#39;s Coffee-Producing Regional Profiles</a></li><li>카하마르카의 수출 위상, 수확기 강우와 태양열 건조대: <a href="https://www.whetstonemagazine.com/journal/the-future-of-coffee-in-cajamarca">Whetstone Magazine, The Future of Coffee in Cajamarca</a></li><li>커핑 노트, 로스팅 프로파일, 레시피: MTSPACE COFFEE 자체 로스팅 기록</li></ul>$mcw4649d0ba$
 where id = 'd4e62b85-8afd-48de-96ff-a19b03eb60dd';
-- content_post blog-ethiopia-tadesse-yonka-natural
update public.content_post set body_html = $mcw4649d0ba$<p>타데세 욘카(Tadesse Yonka)는 시다모 벤사에서 나고 자란 2세대 커피 생산자입니다. 아버지의 농장에서 시작해 지역에서 커피를 생산하고 공급하며 경험을 쌓았고, 지금은 아르베고나(Arbegona)의 게메초 마을에서 워싱스테이션을 운영합니다. 그의 스테이션에는 등록된 250여 농가가 체리를 들고 오고, 잘 익은 체리에 더 높은 값을 쳐 주는 방식으로 품질을 관리합니다. 벤사 다예(Daye)에는 자체 드라이밀도 두고 있어 수확부터 가공, 정제까지 한 손에서 이어집니다.</p>
<p><a href="https://mtspace.coffee/products/ethiopia-tadesse-yonka-natural"><strong>에티오피아 시다모 벤사 아르베고나 타데세 욘카 내추럴</strong> 보러 가기 →</a></p>
<h2>시다모 벤사, 리프트 밸리 남쪽의 고원</h2>
<p>시다모(Sidamo)는 아와사 호수 남쪽 리프트 밸리의 고원 지대입니다. 현지 공식 명칭은 시다마(Sidama)이고 에티오피아 상품거래소(ECX)도 2007년부터 그 표기를 쓰지만, 커피 시장에서는 오랫동안 불러 온 시다모라는 이름이 여전히 널리 통용됩니다. 그 안에서 벤사(Bensa)는 1,800~2,300m의 높은 재배 고도와 열대 과일 계열의 향미로 알려진 지역입니다.</p>
<p>게메초는 그중에서도 해발 약 2,350m의 고지대 마을입니다. 기온이 낮고 경사가 가파른 계곡을 따라 커피나무가 자랍니다. 고도가 높을수록 체리는 천천히 익고, 시다모의 수확기가 에티오피아 다른 지역보다 늦는 것도 같은 이유입니다.</p>
<h2>74158과 74119, 짐마 연구소가 고른 나무</h2>
<p>로트의 뼈대를 이루는 품종은 74158과 74119입니다. 두 품종 모두 짐마 농업연구센터(JARC)가 1970년대에 선발한 계통으로, 74158은 서부 일루바보르 메투 비샤리 숲의 병 저항성 모수에서 골라낸 품종입니다. 중간 정도 키에 작고 밝은 붉은 체리를 맺으며, 에티오피아의 서늘한 고지대에서 생산성이 좋고 흰 꽃 계열의 향과 단맛으로 평가받습니다. 시다모 전역에서 74158, 74110, 74112가 가장 흔한 품종으로 꼽히는데, 게메초의 고도와 기후가 이 계통에 잘 맞는 셈입니다.</p>
<h2>약 24일, 아프리칸 베드 위의 시간</h2>
<p>잘 익은 체리만 손으로 골라 아프리칸 베드에 펼치고, 약 24일 동안 자주 뒤집어 가며 천천히 말립니다. 내추럴 가공은 과육을 그대로 두고 말리기 때문에 과일감과 바디를 얻는 대신, 건조가 고르지 않으면 발효취가 섞이기 쉽습니다. 공기와 햇빛이 고르게 닿도록 관리한 긴 건조가 이 로트의 과일감을 탁하지 않게 담아내는 핵심입니다.</p>
<h2>라즈베리에서 사탕수수로</h2>
<p>컵 노트는 <strong>라즈베리, 블루베리, 핵과류, 사탕수수</strong>.</p>
<p>코를 대면 라즈베리와 블루베리의 베리 향이 먼저 옵니다. 한 모금 넘기면 복숭아 쪽 핵과류의 산뜻함이 이어지고, 온도가 내려가면서 사탕수수의 단맛이 길게 남습니다. 내추럴 특유의 과일감이 있지만 무겁거나 발효취로 기울지 않고, 끝이 깨끗합니다. 워시드 에티오피아의 플로럴한 결과는 다른, 과일 쪽으로 한 걸음 더 나간 한 잔입니다.</p>
<p>식으면서 맛이 바뀌는 커피를 좋아한다면, 한 잔을 30분 두고 마셔보시길 권합니다. 뜨거울 때의 베리와 식었을 때의 사탕수수가 같은 커피에서 나옵니다.</p>
<p><a href="https://mtspace.coffee/products/ethiopia-tadesse-yonka-natural"><strong>베리에서 사탕수수로 이어지는 한 잔, 19,500원</strong> →</a></p>
<h2>라이트 로스팅은 덜 볶는 것이 아닙니다</h2>
<p>산미만 남고 단맛이 비는 라이트 로스팅은 흔합니다. 그래서 MTSPACE는 이 커피에도 대회에서 쓰는 것과 같은 라이트 프로파일을 그대로 적용했습니다.</p>
<blockquote><p>1차 크랙 6분 30초 / 크랙 이후 5℃ 상승 / 디벨롭먼트 타임 45초</p></blockquote>
<p>크랙 이후 온도를 5℃만 밀어 올리고 45초에서 끊는 설정입니다. 내추럴 가공의 과일 향이 날아가기 전에 단맛이 붙는 구간을 확보하기 위한 것이고, 그래서 이 커피는 라이트 로스트치고 추출이 예민하지 않습니다.</p>
<p>원두는 미리 볶아 쌓아 두지 않습니다. 주문 시점 기준으로 가장 가까운 로스팅 날짜의 원두가 나갑니다.</p>
<h2>이런 분께 권합니다</h2>
<ul><li>베리 계열의 내추럴 에티오피아를 찾는 분</li><li>필터와 핸드드립으로 과일감을 즐기는 홈브루어</li><li>워시드 싱글 오리진 다음 단계로 내추럴을 경험해 보려는 분</li><li>생산자와 워싱스테이션까지 확인하고 마시고 싶은 분</li></ul>
<p>워시드 에티오피아와 비교해 보고 싶다면 <a href="https://mtspace.coffee/blogs/coffeelog/blog-ethiopia-kochere-danicho">코체레 다니초 워시드</a>를, 다른 싱글 오리진도 함께 보고 싶다면 <a href="https://mtspace.coffee/collections/single-origins">싱글 오리진 전체</a>를 확인해 보세요.</p>
<h2>추천 레시피</h2>
<table><thead><tr><th>추출</th><th>도징</th><th>추출량</th><th>시간</th></tr></thead><tbody><tr><td>필터(V60)</td><td>13g, 분쇄도 700</td><td>블룸 30g 90초 / 총 192g</td><td>1:40~2:00</td></tr><tr><td>에스프레소</td><td>18g</td><td>45g</td><td>23초</td></tr><tr><td>밀크</td><td>22g</td><td>36g (우유 150ml)</td><td>25초</td></tr></tbody></table>
<p>베리의 향과 과일감을 가장 선명하게 즐기려면 필터 추출을 권합니다.</p>
<h2>스펙</h2>
<table><thead><tr><th>항목</th><th>내용</th></tr></thead><tbody><tr><td>원산지</td><td>에티오피아 시다모 벤사 아르베고나 게메초</td></tr><tr><td>생산자</td><td>타데세 욘카(Tadesse Yonka)</td></tr><tr><td>고도</td><td>2,350m</td></tr><tr><td>품종</td><td>74158, 74119</td></tr><tr><td>가공</td><td>내추럴</td></tr><tr><td>로스팅</td><td>라이트</td></tr></tbody></table>
<p><a href="https://mtspace.coffee/products/ethiopia-tadesse-yonka-natural"><strong>장바구니에 담기, 19,500원</strong> →</a></p>
<h2>자주 묻는 질문</h2>
<p><strong>Q. 내추럴인데 발효취가 있나요?</strong><br />약 24일의 긴 건조를 고르게 관리한 로트라 과일감은 또렷하지만 발효취 쪽으로 기울지 않습니다. 베리와 사탕수수의 단맛이 깨끗하게 이어집니다.</p>
<p><strong>Q. 라이트 로스팅은 내리기 어렵지 않나요?</strong><br />위 필터 레시피(13g / 분쇄도 700 / 총 192g)를 기준으로 시작하시면 됩니다. 산미가 날카로우면 분쇄도를 조금 굵게, 밍밍하면 조금 가늘게 조정하세요.</p>
<p><strong>Q. 한 봉은 어느 정도 분량인가요?</strong><br />필터 13g 기준 약 9잔, 에스프레소 18g 기준 약 7샷 분량입니다. 라이트 로스트의 향이 가장 좋을 때 다 마실 수 있는 크기로 잡았습니다.</p>
<p><strong>Q. 언제 로스팅한 원두인가요?</strong><br />미리 볶아 쌓아 두지 않고, 가장 가까운 로스팅 회차에 볶아 보냅니다.</p>
<p>---</p>
<h2>English</h2>
<p><strong>Ethiopia Sidamo Bensa Arbegona Tadesse Yonka Natural.</strong> Tadesse Yonka is a second-generation producer born and raised in Bensa, Sidamo. He runs a washing station in Gemecho village, Arbegona, where around 250 registered farmers deliver cherries, and a dry mill in Daye, Bensa. Grown at about 2,350m on steep, cool valley slopes, the lot is built on JARC selections 74158 and 74119. Hand-picked ripe cherries are spread on African beds and dried for roughly 24 days with frequent turning. Raspberry, blueberry, stone fruit and sugarcane; fruit-forward but clean, with a long sugarcane finish as it cools. Roasted on the same light profile MTSPACE uses in competition: first crack at 6:30, +5℃ after crack, 45s development. Recipes: filter (V60) 13g, 30g bloom 90s, 192g total, 1:40~2:00; espresso 18g/45g/23s; milk 22g/36g/25s.</p>
<p><a href="https://mtspace.coffee/products/ethiopia-tadesse-yonka-natural">Shop Ethiopia Tadesse Yonka Natural →</a></p>
<p>---</p>
<h3>출처</h3>
<ul><li>생산자 배경, 게메초 마을과 고도, 품종, 건조 일수: 생두 수입사 로트 자료</li><li>타데세 욘카 워싱스테이션의 등록 농가 수, 다예 드라이밀: <a href="https://crema.co/coffees/theory-collaborative/tadesse-yonka-gamacho-natural">Crema.co, Tadesse Yonka Gamacho Natural by Theory Coffee Roasters</a></li><li>시다마 공식 명칭(ECX 2007년 변경), 벤사 재배 고도, 늦은 수확기, 주요 품종: <a href="https://perfectdailygrind.com/2020/06/everything-you-need-to-know-about-coffee-from-sidama-ethiopia/">Perfect Daily Grind, Everything You Need to Know About Coffee From Sidama, Ethiopia</a></li><li>74158 품종의 선발 배경과 특성: <a href="https://xliiicoffee.com/en/journal/what-is-coffee-variety-74158-why-do-coffee-enthusiasts-love-it/">XLIII Coffee, What is Coffee Variety 74158?</a></li><li>커핑 노트, 로스팅 프로파일, 레시피: MTSPACE COFFEE 자체 로스팅 기록</li></ul>$mcw4649d0ba$
 where id = 'f9e8d258-ead9-4472-999e-e1b5ac285f9c';
-- content_post blog-cafe-bean-switch-guide
update public.content_post set body_html = $mcw4649d0ba$<p>카페 원두를 교체하려는 매장과 상담을 시작하면 대부분 샘플 요청으로 대화가 시작됩니다. 그런데 비교 기준이 없는 상태에서 샘플을 여러 종 받으면 테이스팅이 길어지고, 결정은 오히려 늦어집니다.</p>
<p>MTSPACE COFFEE가 상담에서 먼저 확인하는 것은 세 가지입니다. 바에 놓인 그라인더의 수, 블랙과 밀크 메뉴의 판매 비중, 그리고 디카페인 수요입니다. 이 세 가지가 정해지면 후보 원두는 자연스럽게 두세 종으로 좁혀집니다.</p>
<p><a href="https://mtspace.coffee/account/signup"><strong>사업자 회원가입 후 도매 단가 확인하기</strong> →</a></p>
<h2>기준 1. 그라인더 수는 동시에 운영할 원두 수입니다</h2>
<p>그라인더 한 대에는 한 종류의 원두가 들어갑니다. 따라서 그라인더 수는 매장이 동시에 운영할 수 있는 원두 수의 상한입니다.</p>
<table><thead><tr><th>그라인더</th><th>권장 구성</th><th>이유</th></tr></thead><tbody><tr><td>1대</td><td>올라운더(미디움)</td><td>에스프레소, 밀크, 필터 어디에서도 균형이 크게 무너지지 않도록 설계한 블렌드</td></tr><tr><td>2대</td><td>댐굳(다크) + 스팟라이트(라이트)</td><td>밀크 메뉴와 블랙, 필터 메뉴의 역할 분담. 캐릭터 차이가 분명해 손님 안내가 쉬움</td></tr></tbody></table>
<p>올라운더는 베리류, 사과, 카카오, 아몬드 노트의 미디움 로스트입니다. 댐굳은 다크 초콜릿, 자두, 바닐라 노트로 우유와 만났을 때 단맛이 살아나고, 스팟라이트는 귤, 자몽, 적포도, 살구 노트의 라이트 로스트입니다.</p>
<h2>기준 2. 블랙과 밀크, 어느 쪽이 더 많이 나가는가</h2>
<p>같은 원두라도 매장의 메뉴 구성에 따라 평가가 달라집니다. 밀크 메뉴 비중이 높다면 우유에 묻히지 않는 단맛과 바디가 우선이고, 블랙 비중이 높다면 식은 뒤에도 맛의 균형이 유지되는지가 중요합니다. POS에서 최근 한두 달의 메뉴별 판매량을 확인하면 방향이 분명해집니다.</p>
<h2>기준 3. 디카페인 수요가 있는가</h2>
<p>디카페인을 찾는 손님이 있다면 원두 구성 단계에서 함께 정해 두는 것이 좋습니다. MTSPACE는 두 가지 선택지를 운영합니다.</p>
<ul><li><strong>에티오피아 예가체프 디카페인</strong>: 미디움 로스트, 허브, 감귤, 카카오</li><li><strong>이지피지</strong>: 디카페인 원두를 섞은 로우 카페인 미디움 블렌드, 카라멜, 견과류, 시트러스</li></ul>
<p>디카페인 운영 방식은 <a href="https://mtspace.coffee/blogs/coffeelog/blog-cafe-decaf-menu">카페 디카페인 메뉴 운영법</a>에서 따로 다룹니다.</p>
<h2>MTSPACE 사업자 라인업</h2>
<table><thead><tr><th>원두</th><th>로스팅</th><th>플레이버 노트</th></tr></thead><tbody><tr><td>스팟라이트</td><td>라이트</td><td>귤, 자몽, 적포도, 살구</td></tr><tr><td>올라운더</td><td>미디움</td><td>베리류, 사과, 카카오, 아몬드</td></tr><tr><td>클래식 블렌드</td><td>미디움</td><td>초콜릿, 견과류, 은은한 과일</td></tr><tr><td>이지피지</td><td>미디움</td><td>카라멜, 견과류, 시트러스</td></tr><tr><td>예가체프 디카페인</td><td>미디움</td><td>허브, 감귤, 카카오</td></tr><tr><td>댐굳</td><td>다크</td><td>다크 초콜릿, 자두, 바닐라</td></tr><tr><td>하우스 블렌드</td><td>다크</td><td>다크 초콜릿, 견과류, 마일드 단맛</td></tr></tbody></table>
<p>MTSPACE의 블렌드는 모두 에티오피아 생두를 베이스로 합니다. 로스팅 단계가 달라도 과일 같은 인상이 이어지는 이유입니다.</p>
<h2>샘플 테스트는 같은 조건에서 한 번에</h2>
<p>샘플은 같은 날, 같은 추출 조건에서 비교해야 차이가 드러납니다. 제품마다 공개된 기준 레시피로 먼저 추출한 뒤 매장 장비에 맞춰 조정하고, 블랙과 밀크 메뉴를 모두 만들어 보십시오. 직원 여러 명이 함께 맛보고 의견을 기록하면 손님 반응에 가까운 판단을 할 수 있습니다.</p>
<h2>거래 시작 절차</h2>
<ol><li>자사몰에서 사업자 회원가입</li><li>사업자 정보 확인 후 승인</li><li>승인 후 등급에 맞는 사업자 단가 적용</li></ol>
<p>로스팅과 출고가 정해진 주기로 돌아가기 때문에 발주 주기를 계획하기 쉽습니다.</p>
<h2>자주 묻는 질문</h2>
<p><strong>Q. 샘플은 몇 종을 받는 것이 적당한가요?</strong><br />그라인더 수와 메뉴 비중이 정해졌다면 두세 종으로 충분합니다. 기준이 없는 상태에서 샘플만 늘리면 결정이 늦어집니다.</p>
<p><strong>Q. 그라인더가 한 대인데 디카페인도 운영할 수 있나요?</strong><br />주문마다 한 잔 분량을 계량해 가는 싱글 도징 방식으로 운영할 수 있습니다.</p>
<p><strong>Q. 사업자 단가는 어떻게 확인하나요?</strong><br />사업자 회원가입 후 승인이 완료되면 등급에 맞는 단가로 주문하실 수 있습니다.</p>
<p>---</p>
<h2>English</h2>
<p><strong>Switching your cafe&#39;s coffee.</strong> Before requesting samples, define three things: how many grinders you run, whether black or milk drinks dominate sales, and whether you need a decaf option. One grinder suits Allrounder (medium); two grinders can split roles between Damn Good (dark, milk drinks) and Spotlight (light, black and filter). For decaf, MTSPACE offers Ethiopia Yirgacheffe Decaf and EZPZ, a low-caffeine blend. All blends are built on Ethiopian green coffee. Sign up as a business member for wholesale pricing.</p>
<p>---</p>
<h3>출처</h3>
<ul><li>제품 정보, 레시피: MTSPACE COFFEE 상품 데이터와 자체 로스팅 기록</li><li>사업자 회원 승인 및 등급 단가 절차: MTSPACE COFFEE 자사몰 운영 정책</li></ul>$mcw4649d0ba$,
  seo_description = $mcw4649d0ba$카페 원두를 교체할 때 샘플보다 먼저 정해야 할 세 가지 기준(그라인더 수, 블랙과 밀크 비중, 디카페인 수요)과 MTSPACE 사업자 라인업, 샘플 테스트 방법을 정리했습니다.$mcw4649d0ba$
 where id = 'a4ce34d6-03dc-44a4-9ac4-9a4ec6bbd65a';
-- content_post blog-home-latte-milk-recipe
update public.content_post set body_html = $mcw4649d0ba$<p>카페에서 마시던 라떼의 고소한 단맛이 집에서는 잘 나오지 않는다는 이야기를 자주 듣습니다. 원인은 대부분 세 가지 중 하나입니다. 우유를 너무 뜨겁게 데웠거나, 라떼에 맞지 않는 원두를 썼거나, 컵 크기에 비해 커피 양이 적은 경우입니다.</p>
<p>이 글에서는 세 가지를 순서대로 점검하고, MTSPACE 블렌드의 밀크용 레시피를 정리합니다.</p>
<p><a href="https://mtspace.coffee/products/damn-good-125"><strong>라떼에 잘 맞는 댐굳 보기</strong> →</a></p>
<h2>우유 온도: 55~65℃에서 마칩니다</h2>
<p>우유를 끓기 직전까지 데우면 라떼가 더 맛있어질 것 같지만 그렇지 않습니다. 스티밍 종료 온도의 기준은 <strong>55~65℃</strong>입니다. 이 범위를 넘어 65℃ 이상으로 가열하면 우유의 단백질 구조가 바뀌기 시작합니다.</p>
<p>온도계를 쓰지 않는다면 피처 표면의 열감으로 가늠할 수 있습니다. 손을 오래 대고 있기 어려워지는 시점이 대략 이 구간입니다. 처음 몇 번은 온도계로 확인해 감각을 맞춰 두면 이후에는 손으로도 충분히 판단할 수 있습니다.</p>
<p>거품의 결도 중요합니다. 공기 주입은 스티밍 시작 직후 짧게 끝내고, 나머지 시간은 우유가 소용돌이치게 만들어 거품 입자를 곱게 정리하는 것이 매끄러운 질감의 핵심입니다.</p>
<h2>원두: 우유 속에서도 존재감이 남는 쪽으로</h2>
<p>밝은 산미가 강점인 라이트 로스트는 우유의 지방과 단백질에 가려 개성이 흐려지는 경우가 많습니다. 라떼 위주로 마신다면 단맛과 바디가 두터운 원두가 유리합니다.</p>
<table><thead><tr><th>원두</th><th>로스팅</th><th>라떼에서의 인상</th></tr></thead><tbody><tr><td>댐굳</td><td>다크</td><td>다크 초콜릿, 자두, 바닐라. 진하고 달콤한 라떼</td></tr><tr><td>올라운더</td><td>미디움</td><td>베리류, 사과, 카카오, 아몬드. 과일 향이 은은하게 남는 라떼</td></tr><tr><td>이지피지</td><td>미디움</td><td>카라멜, 견과류, 시트러스. 로우 카페인 라떼</td></tr></tbody></table>
<h2>밀크용 레시피는 에스프레소와 다릅니다</h2>
<p>같은 원두라도 우유와 섞을 때는 원두를 더 넣고 진하게 추출합니다.</p>
<table><thead><tr><th>원두</th><th>도징</th><th>추출량</th><th>시간</th></tr></thead><tbody><tr><td>댐굳</td><td>22g</td><td>28g</td><td>28초</td></tr><tr><td>올라운더</td><td>22g</td><td>38g</td><td>29초</td></tr><tr><td>이지피지</td><td>22g</td><td>36g</td><td>25초</td></tr></tbody></table>
<p>댐굳의 에스프레소 레시피는 20g에 추출량 32g입니다. 밀크용에서는 도징을 2g 늘리고 추출량은 줄여 농도를 높입니다. 우유와 섞였을 때도 커피의 윤곽이 흐려지지 않도록 설정한 값입니다.</p>
<h2>컵 크기와 샷 수를 맞춥니다</h2>
<p>큰 머그에 샷 하나를 넣으면 우유 비율이 높아져 라떼가 옅어지는 것은 자연스러운 결과입니다. 컵이 크다면 샷을 늘리거나 조금 작은 컵을 쓰십시오. 추출 전에 잔을 뜨거운 물로 데워 두면 마지막 모금까지 온도가 유지됩니다.</p>
<h2>점검 체크리스트</h2>
<ul><li>우유는 65℃를 넘기지 않았는가</li><li>라떼에 맞는 단맛과 바디가 있는 원두인가</li><li>밀크용 레시피로 원두를 더 넣고 진하게 추출했는가</li><li>컵 크기에 맞게 샷 수를 조절했는가</li></ul>
<h2>자주 묻는 질문</h2>
<p><strong>Q. 라떼에는 무조건 다크 로스트가 맞나요?</strong><br />진하고 달콤한 라떼를 원한다면 다크 로스트가 유리하지만, 과일 향이 남는 라떼를 원한다면 미디움 로스트도 좋은 선택입니다.</p>
<p><strong>Q. 우유 온도를 더 올리면 오래 따뜻하지 않나요?</strong><br />65℃를 넘기면 우유의 변성이 시작됩니다. 온도를 높이기보다 잔을 미리 데우는 방법을 권합니다.</p>
<p><strong>Q. 에스프레소 머신이 없으면 라떼를 못 만드나요?</strong><br />이 글의 레시피는 에스프레소 기준입니다. 다른 추출 도구를 쓰신다면 평소보다 진하게 추출한 커피에 데운 우유를 더하는 방식으로 시작해 보십시오.</p>
<p>---</p>
<h2>English</h2>
<p><strong>Home cafe latte guide.</strong> A flat-tasting latte usually comes down to milk temperature, bean choice or coffee-to-milk ratio. Finish steaming between 55 and 65℃; above 65℃ milk proteins begin to denature. Choose beans with sweetness and body: Damn Good (dark) or Allrounder (medium). Milk recipes: Damn Good 22g in, 28g out, 28s; Allrounder 22g, 38g, 29s; EZPZ 22g, 36g, 25s. Match shots to cup size and preheat the cup.</p>
<p>---</p>
<h3>출처</h3>
<ul><li>제품 정보, 레시피: MTSPACE COFFEE 상품 데이터와 자체 로스팅 기록</li><li>우유 스티밍 온도 기준(55~65℃, 65℃ 초과 시 변성): MTSPACE COFFEE 커피 교육자료 The Basic of Coffee</li></ul>$mcw4649d0ba$
 where id = '466561c5-f35c-4408-bd57-35f34f8ef0d6';
-- content_post blog-cafe-decaf-menu
update public.content_post set body_html = $mcw4649d0ba$<p>오후 시간대에 디카페인 메뉴를 찾는 손님은 꾸준히 있습니다. 네이버 데이터랩 자체 조회(2024년 8월~2026년 8월) 결과, &#39;디카페인&#39; 계열 키워드의 검색 규모는 &#39;에티오피아&#39; 계열 키워드보다 약 8~10배 컸습니다.</p>
<p>수요가 분명한 만큼 디카페인은 메뉴에 한 줄을 더하는 것만으로 오후 매출을 지키는 수단이 될 수 있습니다. 이 글에서는 운영 방식 두 가지를 비교하고, 매장 조건별 선택 기준을 정리합니다.</p>
<p><a href="https://mtspace.coffee/account/signup"><strong>사업자 회원가입 후 디카페인 도매 단가 확인하기</strong> →</a></p>
<h2>두 가지 운영 방식</h2>
<table><thead><tr><th>구분</th><th>풀 디카페인</th><th>로우 카페인 블렌드</th></tr></thead><tbody><tr><td>구성</td><td>디카페인 처리 원두 100%</td><td>디카페인 처리 원두와 일반 원두의 블렌드</td></tr><tr><td>MTSPACE 제품</td><td>에티오피아 예가체프 디카페인</td><td>이지피지</td></tr><tr><td>로스팅</td><td>미디움</td><td>미디움</td></tr><tr><td>플레이버 노트</td><td>허브, 감귤, 카카오</td><td>카라멜, 견과류, 시트러스</td></tr><tr><td>적합한 손님</td><td>카페인을 최대한 피하려는 손님</td><td>카페인을 줄이면서 커피 맛을 더 원하는 손님</td></tr></tbody></table>
<p>이지피지는 일반 원두 6에 C2 공법 디카페인 원두 4를 섞은 블렌드이며, 두 원두 모두 에티오피아산입니다. 바디가 두터운 편이라 라떼로 만들어도 커피의 존재감이 유지됩니다.</p>
<h2>매장 조건별 선택 기준</h2>
<ul><li><strong>카페인을 아예 피하려는 문의가 많다면</strong> 풀 디카페인이 맞습니다.</li><li><strong>섭취량을 줄이려는 정도의 수요가 주류라면</strong> 로우 카페인 블렌드가 풍미를 더 많이 남기는 선택입니다.</li><li><strong>손님층이 섞여 있다면</strong> 두 가지를 모두 운영하는 것도 방법입니다.</li></ul>
<h2>그라인더 한 대로 운영하기</h2>
<p>전용 그라인더를 추가할 공간이나 예산이 없다면 <strong>싱글 도징</strong> 방식이 대안입니다. 주문이 들어올 때 한 잔 분량만 계량해 그라인더에 넣고 분쇄하는 방식입니다.</p>
<p>다만 버 사이에 잔류한 일반 원두 가루가 디카페인 한 잔에 유입될 수 있습니다. 디카페인 주문 전에는 소량을 먼저 분쇄해 내부를 비운 뒤 사용하십시오.</p>
<p>디카페인은 주문 빈도가 낮아 개봉 후 사용 기간이 길어지기 쉽습니다. 사업자용 봉투를 개봉했다면 며칠 분량만 작은 밀폐 용기에 덜어 쓰고, 나머지는 밀봉해 서늘한 곳에 보관하십시오.</p>
<h2>메뉴 표기와 직원 안내</h2>
<p>디카페인과 로우 카페인은 다른 개념이므로 메뉴판에 정확히 구분해 표기해야 합니다. 메뉴명 옆에 해당 표기를 분명히 달고, 로우 카페인 메뉴에는 카페인이 소량 들어 있다는 점을 함께 적어 두십시오. 디카페인 역시 카페인이 완전히 0은 아닙니다.</p>
<p>직원마다 설명이 달라지지 않도록 안내 문장을 하나로 정해 바에 붙여 두는 것을 권합니다.</p>
<blockquote><p>디카페인은 카페인 제거 공정을 거친 원두 100%이고, 로우 카페인은 그 원두를 일부 섞어 함량을 낮춘 블렌드입니다.</p></blockquote>
<h2>자주 묻는 질문</h2>
<p><strong>Q. 로우 카페인 블렌드를 디카페인으로 표기해도 되나요?</strong><br />아닙니다. 두 개념은 다르므로 &quot;로우 카페인&quot;으로 정확히 표기하십시오.</p>
<p><strong>Q. 디카페인은 맛이 가볍지 않나요?</strong><br />원두와 로스팅에 따라 다릅니다. 이지피지는 카라멜과 견과류 중심의 두터운 바디로 설계했습니다.</p>
<p><strong>Q. 두 제품 모두 사업자 라인으로 주문하나요?</strong><br />예가체프 디카페인과 이지피지 모두 사업자 라인에서 운영합니다. 이지피지는 소비자용 소포장도 있습니다.</p>
<p>---</p>
<h2>English</h2>
<p><strong>Running a decaf menu.</strong> MTSPACE offers two options: full decaf (Ethiopia Yirgacheffe Decaf, medium roast, herbal, citrus, cacao) and low caffeine (EZPZ, six parts regular to four parts C2-process decaf, both Ethiopian; caramel, nuts, citrus). Choose full decaf for guests avoiding caffeine, low caffeine for those who want less with more flavor. With one grinder, single-dose and purge before each decaf order. Label clearly: low caffeine is not caffeine-free.</p>
<p>---</p>
<h3>출처</h3>
<ul><li>제품 정보, 레시피: MTSPACE COFFEE 상품 데이터와 자체 로스팅 기록</li><li>검색량 비교: 네이버 데이터랩, 2024년 8월~2026년 8월 MTSPACE COFFEE 자체 조회</li></ul>$mcw4649d0ba$
 where id = '2635f298-d3d5-45ad-8b8f-d174ccfbec14';
-- content_post blog-cafe-custom-blend-oem
update public.content_post set body_html = $mcw4649d0ba$<p>매장이 자리를 잡으면 시그니처 메뉴처럼 시그니처 원두를 갖고 싶어지는 시점이 옵니다. 매장 이름이 붙은 원두는 손님에게 매장의 방향을 설명하는 도구가 되고, 원두 판매로 매출을 넓히는 출발점이 되기도 합니다.</p>
<p>이 글에서는 MTSPACE COFFEE의 계약 로스팅(OEM/ODM)이 무엇을 포함하는지, 어떤 순서로 진행되는지 정리합니다.</p>
<p><a href="https://mtspace.coffee/consulting"><strong>컨설팅 및 파트너십 안내 보기</strong> →</a></p>
<h2>계약 로스팅에 포함되는 것</h2>
<p>MTSPACE의 계약 로스팅은 블렌드를 함께 개발하고 꾸준히 공급하는 것까지를 하나의 범위로 봅니다.</p>
<table><thead><tr><th>항목</th><th>내용</th></tr></thead><tbody><tr><td>프로필 설계</td><td>원료, 배합, 로스팅 방향을 매장 메뉴에 맞춰 설계</td></tr><tr><td>컵 검증</td><td>매장 레시피로 실제 추출했을 때의 맛을 확인</td></tr><tr><td>라벨 작업</td><td>매장 이름을 담은 라벨 적용</td></tr><tr><td>정기 공급</td><td>정해진 로스팅 주기에 맞춘 정기 출고</td></tr></tbody></table>
<p>로스팅은 MTSPACE COFFEE 자체 로스터리에서 진행합니다.</p>
<h2>진행 순서</h2>
<ol><li><strong>방향 정리</strong>: 매장이 내고 싶은 커피, 주력 메뉴(블랙 또는 밀크), 손님이 선호하는 맛을 확인합니다.</li><li><strong>프로필 설계</strong>: 확인한 방향을 기준으로 생두 선택, 블렌딩 비율, 로스팅 곡선을 정합니다.</li><li><strong>컵 검증</strong>: 매장 레시피로 추출해 실제 맛을 확인하고 조정합니다.</li><li><strong>라벨과 공급</strong>: 방향이 확정되면 매장 이름의 라벨을 적용해 정기 공급으로 이어집니다.</li></ol>
<p>수량과 일정은 매장 상황에 맞춰 상담에서 정합니다.</p>
<h2>브랜드까지 새로 만들고 싶다면</h2>
<p>단일 원두가 아니라 독립된 커피 브랜드를 출시하려는 경우라면 공동 브랜드 개발 프로그램이 해당됩니다. 파트너가 가진 브랜드 자산과 MTSPACE의 로스팅 인프라를 결합하고, 전략과 라인업, 패키지, 출시 일정까지 한 번에 설계합니다.</p>
<h2>일반 납품과 전용 블렌드의 차이</h2>
<table><thead><tr><th>구분</th><th>일반 납품</th><th>전용 블렌드</th></tr></thead><tbody><tr><td>원두</td><td>운영 중인 라인업에서 선택</td><td>매장 방향에 맞춰 새로 설계</td></tr><tr><td>라벨</td><td>MTSPACE 라벨</td><td>매장 이름 라벨</td></tr><tr><td>시작 시점</td><td>바로 시작 가능</td><td>설계와 검증 기간 필요</td></tr></tbody></table>
<p>오픈 초기라면 기성 라인업으로 몇 달간 판매 데이터를 쌓은 뒤 전용 블렌드를 설계하는 편이 방향을 잡기 쉽습니다. 로스팅과 출고가 정해진 주기로 돌아가기 때문에 매장이 늘어나도 공급 계획을 세우기 쉽습니다.</p>
<h2>이런 매장에 적합합니다</h2>
<ul><li>매장 이름으로 원두를 판매하고 싶은 카페</li><li>두 곳 이상의 매장에서 같은 맛을 유지하고 싶은 곳</li><li>시그니처 메뉴에 맞춘 원두가 필요한 곳</li><li>선물용 원두 상품을 기획하는 곳</li></ul>
<h2>첫 상담 전 준비하면 좋은 것</h2>
<ul><li>주력 메뉴 목록</li><li>한 달 원두 사용량의 대략적인 수치</li><li>원하는 맛의 방향, 참고할 커피가 있다면 그 이름</li></ul>
<h2>자주 묻는 질문</h2>
<p><strong>Q. 최소 주문 수량이 있나요?</strong><br />수량과 일정은 매장 상황에 따라 상담에서 함께 정합니다.</p>
<p><strong>Q. 라벨 디자인도 포함되나요?</strong><br />매장 이름을 담은 라벨 작업이 포함됩니다. 세부 범위는 상담에서 확인해 주십시오.</p>
<p><strong>Q. 공급 주기는 일반 납품과 같나요?</strong><br />네. 일반 납품과 같은 로스팅 주기로 출고합니다.</p>
<p>---</p>
<h2>English</h2>
<p><strong>Custom cafe blends (contract roasting).</strong> MTSPACE co-develops brand-exclusive blends and supplies them reliably: profile design, cup verification with your cafe&#39;s recipe, labeling under your name, and regular weekly supply from our own roastery. Co-brand development covers strategy, lineup, packaging and launch roadmap. Volumes and timelines are agreed in consultation.</p>
<p>---</p>
<h3>출처</h3>
<ul><li>제품 정보, 레시피: MTSPACE COFFEE 상품 데이터와 자체 로스팅 기록</li><li>계약 로스팅 및 공동 브랜드 개발 범위: MTSPACE COFFEE 컨설팅 및 파트너십 페이지</li></ul>$mcw4649d0ba$
 where id = 'f4d0c8d9-30d9-4b59-ad19-b660012b6d04';
-- content_post blog-hand-drip-beginner
update public.content_post set body_html = $mcw4649d0ba$<p>핸드드립은 장비를 많이 갖춰야 시작할 수 있을 것 같지만, 실제로 필요한 도구는 네 가지입니다. 이 글에서는 입문에 필요한 도구와 첫 레시피, 그리고 맛이 기대와 다를 때 가장 먼저 조정할 변수를 정리합니다.</p>
<p><a href="https://mtspace.coffee/products/spotlight-125"><strong>핸드드립에 잘 맞는 스팟라이트 보기</strong> →</a></p>
<h2>입문에 필요한 도구 네 가지</h2>
<table><thead><tr><th>도구</th><th>역할</th><th>선택 기준</th></tr></thead><tbody><tr><td>드리퍼</td><td>원두 가루를 담고 물을 통과시킴</td><td>원뿔형(V60 계열)으로 시작하면 레시피를 따르기 쉬움. 종이 필터 함께 준비</td></tr><tr><td>저울</td><td>원두와 물의 양을 계량</td><td>맛을 크게 좌우하는 것이 원두와 물의 비율. 전자 주방 저울로 시작 가능</td></tr><tr><td>드립 포트</td><td>물을 붓는 주전자</td><td>주둥이가 가늘어 물줄기를 일정하게 조절하기 쉬운 것</td></tr><tr><td>그라인더</td><td>추출 직전 분쇄</td><td>핸드밀로도 충분</td></tr></tbody></table>
<h2>스팟라이트 기준 첫 레시피</h2>
<p>스팟라이트는 귤, 자몽, 적포도, 살구 노트의 라이트 로스트 블렌드로, 라이트 로스트의 향을 살리면서도 추출이 흔들리지 않도록 설계했습니다. 핸드드립 입문용 원두로 적합한 이유입니다.</p>
<table><thead><tr><th>단계</th><th>시간</th><th>물의 양</th></tr></thead><tbody><tr><td>뜸 들이기</td><td>0:00~1:00</td><td>36g</td></tr><tr><td>나눠 붓기</td><td>1:00부터</td><td>총 192g까지</td></tr><tr><td>추출 완료</td><td>1:40~2:00</td><td></td></tr></tbody></table>
<p>원두는 12g입니다. 원두를 넣기 전 필터 린싱을 해 두십시오. 종이의 잡내를 줄이고 드리퍼를 예열하는 과정입니다. 이 물은 버리고 시작합니다.</p>
<p>물은 가운데에서 바깥쪽으로 작은 원을 그리며 붓습니다. 필터 가장자리에 직접 부으면 물이 원두를 거치지 않고 흘러내려 커피가 옅어지기 쉽습니다.</p>
<h2>뜸 들이기를 하는 이유</h2>
<p>갓 볶은 원두에는 가스가 남아 있어 처음 물을 부으면 원두 가루가 부풀어 오르며 가스가 빠져나옵니다. 이 단계를 거쳐야 이후에 붓는 물이 원두 가루 전체에 고르게 스며듭니다.</p>
<h2>맛을 조절하는 첫 번째 변수, 분쇄도</h2>
<table><thead><tr><th>맛</th><th>상태</th><th>조정</th></tr></thead><tbody><tr><td>쓰고 텁텁함</td><td>추출이 많이 됨</td><td>조금 더 굵게 분쇄</td></tr><tr><td>시큼하고 묽음</td><td>추출이 덜 됨</td><td>조금 더 곱게 분쇄</td></tr></tbody></table>
<p>곱게 분쇄할수록 추출이 많이 되고, 굵게 분쇄할수록 적게 됩니다. 원두와 물의 양은 그대로 두고 분쇄도 한 가지만 바꿔야 변화의 원인을 파악할 수 있습니다. 처음 일주일은 같은 레시피로 반복해 기준을 익히는 것을 권합니다.</p>
<h2>한 봉으로 내릴 수 있는 양</h2>
<p>12g 기준으로 한 봉은 약 10잔 분량입니다. 스팟라이트 한 봉은 12,990원입니다.</p>
<p>더 깊이 공부하고 싶다면 <a href="https://mtspace.coffee/education">MTSPACE 커피 교육자료</a>에서 추출 원리와 도구별 특징, 홍찬호 대표의 V60 추출법 &#39;차네이도&#39;를 확인할 수 있습니다.</p>
<h2>자주 묻는 질문</h2>
<p><strong>Q. 드리퍼는 어떤 것을 사야 하나요?</strong><br />처음이라면 원뿔형 드리퍼를 권합니다. MTSPACE의 필터 레시피도 원뿔형 드리퍼 기준입니다.</p>
<p><strong>Q. 저울 없이 계량스푼으로 해도 되나요?</strong><br />원두의 부피는 로스팅 정도와 크기에 따라 달라서 무게로 계량하는 편이 정확합니다.</p>
<p><strong>Q. 다른 블렌드도 같은 레시피를 쓰나요?</strong><br />올라운더와 이지피지도 12g, 뜸 36g 60초, 총 192g, 1분 40초~2분의 같은 필터 레시피를 제안합니다.</p>
<p>---</p>
<h2>English</h2>
<p><strong>Hand drip for beginners.</strong> Four tools are enough: a cone dripper with paper filters, a scale, a gooseneck kettle and a grinder. First recipe with Spotlight (light roast; mandarin, grapefruit, red grape, apricot): 12g coffee, 36g bloom for 60 seconds, pour to 192g total, finish between 1:40 and 2:00. If bitter, grind coarser; if sour and thin, grind finer, changing one variable at a time.</p>
<p>---</p>
<h3>출처</h3>
<ul><li>제품 정보, 레시피: MTSPACE COFFEE 상품 데이터와 자체 로스팅 기록</li><li>분쇄도와 추출의 관계: MTSPACE COFFEE 커피 교육자료 The Basic of Coffee</li></ul>$mcw4649d0ba$
 where id = '2b091e59-9d4f-4ad0-adc7-0d89d5b29aac';
-- content_post blog-wholesale-bean-freshness
update public.content_post set title = $mcw4649d0ba$납품 원두 고르는 기준: 신선도 운영, 블렌드 일관성, 발주 주기$mcw4649d0ba$,
  excerpt = $mcw4649d0ba$납품 원두의 가치는 단가표만으로 비교할 수 없습니다. 원두를 미리 볶아 쌓아 두는지, 매번 같은 품질로 들어오는지, 발주 주기를 계획할 수 있는지를 먼저 확인하십시오.$mcw4649d0ba$,
  body_html = $mcw4649d0ba$<p>카페 사장님이 원두 거래처를 비교할 때 가장 먼저 보는 것은 단가입니다. 중요한 기준이지만, 매일 잔의 품질을 정하는 것은 원두가 언제 볶였는지와 매번 같은 품질로 들어오는지입니다. 이 두 가지를 확인한 거래처끼리 단가를 비교해야 의미 있는 비교가 됩니다.</p>
<p><a href="https://mtspace.coffee/account/signup"><strong>사업자 회원가입 후 도매 단가 확인하기</strong> →</a></p>
<h2>기준 1. 원두를 미리 볶아 쌓아 두는가</h2>
<p>매장에 도착하는 원두가 몇 주 전에 볶아 둔 재고라면, 같은 레시피로 내려도 향이 약하고 추출이 흔들립니다. 거래처가 미리 볶아 쌓아 두는지, 주문에 맞춰 로스팅 주기를 돌리는지를 계약 전에 물어보십시오.</p>
<p>MTSPACE COFFEE는 미리 로스팅해 재고로 쌓아 두지 않습니다. 그래서 매장에 도착하는 원두는 그 주에 로스팅한 원두입니다. 로스팅과 출고가 정해진 주기로 돌아가기 때문에 매장은 입고 시점을 예측할 수 있고, 재고와 발주를 계획하기 쉬워집니다.</p>
<h2>기준 2. 매번 같은 품질로 들어오는가</h2>
<p>입고 로트마다 맛이 흔들리면 바리스타는 매번 다이얼인을 새로 해야 하고, 그 편차는 결국 손님이 느끼는 편차로 이어집니다. 로스터리가 원료와 블렌딩을 어떻게 관리하는지는 단가만큼 중요한 기준입니다.</p>
<p>MTSPACE의 블렌드는 모두 에티오피아 생두를 베이스로 합니다. 일관성 측면의 이유는 콩의 크기입니다. 크기가 비슷한 생두끼리 블렌딩합니다. 그래서 배송 중에 흔들려도 봉투 안에서 콩이 크기별로 잘 갈리지 않고, 봉투 윗부분과 아랫부분을 쓸 때의 맛 차이도 작습니다.</p>
<p>원료는 핵심 산지와 워싱스테이션을 고정하고, 시즌마다 커핑으로 선별해 블렌딩합니다. 맛의 뼈대를 유지하면서 시즌의 좋은 원료를 반영하는 구조입니다.</p>
<h2>기준 3. 발주 주기를 계획할 수 있는가</h2>
<p>로스팅 주기가 일정하면 발주 계산이 단순해집니다. 매장 사용량부터 거꾸로 계산해 보십시오.</p>
<table><thead><tr><th>단계</th><th>계산 예시</th></tr></thead><tbody><tr><td>하루 사용량</td><td>하루 60샷 × 20g = 1.2kg</td></tr><tr><td>주간 사용량</td><td>하루 사용량 × 영업일 수</td></tr><tr><td>발주 주기</td><td>1~2주 단위로 설정</td></tr><tr><td>여유분</td><td>손님이 몰리는 날을 대비해 소량 추가</td></tr></tbody></table>
<p>재고 과다는 신선도 손실로, 재고 부족은 판매 기회 손실로 이어집니다. 위 수치는 계산 방법을 보여 드리기 위한 예시이며, 실제 사용량은 매장 기록으로 확인하십시오.</p>
<h2>원두 입고 시 점검 항목</h2>
<ul><li>로스팅 시점을 확인할 수 있는가</li><li>원두의 색과 크기가 대체로 고른가</li><li>매장 보관 장소가 서늘하고 직사광선이 들지 않는가</li></ul>
<p>세 번째 항목은 매장의 몫이지만 맛을 지키는 데는 똑같이 중요합니다.</p>
<h2>MTSPACE 사업자 라인</h2>
<p>라이트부터 다크까지 일곱 종(스팟라이트, 올라운더, 클래식 블렌드, 이지피지, 예가체프 디카페인, 댐굳, 하우스 블렌드)을 사업자 라인으로 공급합니다. 매장 조건별 구성은 <a href="https://mtspace.coffee/blogs/coffeelog/blog-cafe-bean-switch-guide">카페 원두 교체 가이드</a>를 참고하시고, 샘플과 납품 조건은 <a href="https://mtspace.coffee/contact">납품 문의</a>로 남겨 주십시오.</p>
<h2>자주 묻는 질문</h2>
<p><strong>Q. 주문하면 언제 볶은 원두가 오나요?</strong><br />미리 볶아 쌓아 두지 않고, 가장 가까운 로스팅 회차에 볶아 보냅니다.</p>
<p><strong>Q. 블렌드 맛이 시즌마다 바뀌나요?</strong><br />핵심 산지와 워싱스테이션을 고정하고 시즌마다 커핑으로 선별해 맛의 뼈대를 유지합니다.</p>
<p><strong>Q. 사업자 단가는 어떻게 적용되나요?</strong><br />사업자 계정 승인이 끝나면 회원 등급별 도매가로 주문됩니다.</p>
<p>---</p>
<h2>English</h2>
<p><strong>Choosing wholesale coffee.</strong> Compare suppliers on freshness and consistency before price. MTSPACE never pre-roasts for stock, so beans arrive roasted that week, and a steady roasting cycle makes order planning simple. All blends are built on Ethiopian green coffee of similar bean size, which reduces separation inside the bag during shipping; core regions and washing stations are fixed and seasonal lots are selected by cupping.</p>
<p>---</p>
<h3>출처</h3>
<ul><li>제품 정보, 레시피: MTSPACE COFFEE 상품 데이터와 자체 로스팅 기록</li><li>에티오피아 베이스 블렌딩과 소싱 구조: MTSPACE COFFEE 내부 원료 운영 기준</li></ul>$mcw4649d0ba$,
  seo_title = $mcw4649d0ba$납품 원두 고르는 기준 | 신선도 운영, 블렌드 일관성, 발주 주기 계산 - MTSPACE COFFEE$mcw4649d0ba$,
  seo_description = $mcw4649d0ba$카페 납품 원두를 비교할 때 단가보다 먼저 확인해야 할 신선도 운영 방식, 블렌드 일관성, 발주 주기 계산 방법과 원두 입고 시 점검 항목을 정리했습니다.$mcw4649d0ba$
 where id = '4e563e8c-79c2-4e25-895e-9d9fe291bd09';
-- content_post blog-cafe-recipe-card-sop
update public.content_post set body_html = $mcw4649d0ba$<p>원두를 바꾸지 않았는데 커피 맛이 달라졌다는 이야기를 듣는다면, 원인은 원두보다 사람과 방법에 있을 가능성이 높습니다. 직원이 바뀌거나 근무 시간대가 달라지면 추출 방식도 조금씩 달라지기 때문입니다.</p>
<p>이 글에서는 매장의 커피 맛을 표준화하는 세 가지 도구인 레시피 카드, 바 세팅, 점검 루틴을 정리합니다.</p>
<p><a href="https://mtspace.coffee/consulting"><strong>운영 SOP 컨설팅과 바리스타 교육 안내</strong> →</a></p>
<h2>레시피 카드는 숫자로 작성합니다</h2>
<p>&quot;적당히 진하게&quot; 같은 표현은 사람마다 다르게 해석됩니다. 레시피 카드에는 모든 항목을 숫자로 적어야 합니다. 아래는 올라운더를 쓰는 매장의 예시입니다.</p>
<table><thead><tr><th>메뉴</th><th>도징</th><th>추출량</th><th>시간</th></tr></thead><tbody><tr><td>에스프레소</td><td>20g</td><td>40g</td><td>25초</td></tr><tr><td>밀크 메뉴</td><td>22g</td><td>38g</td><td>29초</td></tr><tr><td>필터</td><td>12g</td><td>뜸 36g 60초, 총 192g</td><td>1:40~2:00</td></tr></tbody></table>
<p>MTSPACE는 제품마다 기준 레시피를 공개합니다. 처음 세팅할 때 출발점으로 쓰고, 매장의 머신과 그라인더에 맞춰 조정한 수치를 카드에 다시 기록하십시오.</p>
<h3>레시피 카드에 넣을 항목</h3>
<ul><li>원두 이름과 그라인더 세팅값</li><li>도징, 추출량, 추출 시간</li><li>밀크 메뉴의 우유 양과 스티밍 온도(55~65℃에서 마치고 65℃를 넘기지 않기)</li><li>조정일과 담당자</li></ul>
<p>조정 이력 칸이 있으면 맛이 달라졌을 때 원인을 추적하기 쉽습니다. 원두를 바꾸거나 그라인더 날을 교체했을 때는 반드시 카드를 다시 확인하십시오.</p>
<h2>바 세팅을 고정합니다</h2>
<p>그라인더, 저울, 머신, 도구의 위치를 고정하면 누가 바에 서도 같은 순서로 움직일 수 있습니다. 순서가 같아야 추출 시간이 같아지고, 추출 시간이 같아야 맛이 같아집니다.</p>
<h2>점검 루틴을 만듭니다</h2>
<p>매일 오픈 때 첫 샷의 추출 시간과 추출량을 측정하고, 맛을 본 뒤 기록하십시오. 새 원두 봉투를 개봉한 날이나 날씨가 크게 바뀐 날에는 한 번 더 점검합니다.</p>
<table><thead><tr><th>점검 시점</th><th>확인 항목</th></tr></thead><tbody><tr><td>매일 오픈</td><td>첫 샷의 추출 시간, 추출량, 맛</td></tr><tr><td>새 봉투 개봉</td><td>기준 레시피 재확인</td></tr><tr><td>날씨 급변</td><td>추출 시간 재확인 후 분쇄도 조정</td></tr></tbody></table>
<h2>단계별 바리스타 교육</h2>
<p>레시피 카드가 있어도 그 숫자의 의미를 이해하는 사람이 추출할 때 맛이 가장 안정됩니다. MTSPACE의 바리스타 교육은 신입 교육에서 대회 준비(바리스타 챔피언십, 브루어스 컵)까지 수준별로 나뉩니다.</p>
<table><thead><tr><th>단계</th><th>내용</th></tr></thead><tbody><tr><td>기본기</td><td>도구와 머신, 기초 추출</td></tr><tr><td>추출과 다이얼인</td><td>원두와 장비에 맞춘 레시피 설정</td></tr><tr><td>센서리</td><td>맛의 구분과 표현</td></tr><tr><td>대회 루틴과 무대</td><td>대회 루틴 설계와 무대 준비</td></tr></tbody></table>
<p>강의는 홍찬호 대표가 직접 맡으며, 양국 대회 경험에서 정리한 다이얼인과 센서리 방법, V60 추출법 &#39;차네이도&#39;를 포함합니다.</p>
<h2>매장 전체를 표준화하려면</h2>
<p>근무자가 많거나 복수 매장을 운영한다면 교육과 함께 운영 SOP 컨설팅도 검토해 볼 만합니다. 레시피와 바 동선, 위생 및 품질 체크 항목을 문서화해 매장과 근무자에 관계없이 동일한 결과가 나오도록 만듭니다.</p>
<h2>자주 묻는 질문</h2>
<p><strong>Q. 레시피 카드는 원두마다 따로 만들어야 하나요?</strong><br />네. 원두마다 기준 레시피가 다르므로 원두별로 작성하십시오.</p>
<p><strong>Q. 교육은 어떤 직원에게 필요한가요?</strong><br />입문 바리스타부터 대회 준비자까지 단계별로 진행합니다. 매장 상황에 맞는 단계는 상담에서 정합니다.</p>
<p><strong>Q. 기준 레시피는 어디서 확인하나요?</strong><br />각 제품 페이지의 레시피 항목에서 확인할 수 있고, <a href="https://mtspace.coffee/coffee-info">커피 정보 페이지</a>에서는 원두별 정보 카드를 내려받을 수 있습니다.</p>
<p>---</p>
<h2>English</h2>
<p><strong>Standardizing your cafe&#39;s coffee.</strong> Consistency comes from three tools: a numeric recipe card (bean, grinder setting, dose, yield, time, milk volume and steaming temperature, adjustment log), a fixed bar layout, and a daily check of the first shot. Example with Allrounder: espresso 20g, 40g, 25s; milk 22g, 38g, 29s; filter 12g, 192g, 1:40 to 2:00. MTSPACE offers tiered barista education and operations SOP consulting.</p>
<p>---</p>
<h3>출처</h3>
<ul><li>제품 정보, 레시피: MTSPACE COFFEE 상품 데이터와 자체 로스팅 기록</li><li>교육 과정과 운영 SOP 컨설팅 범위: MTSPACE COFFEE 컨설팅 및 파트너십 페이지</li><li>우유 스티밍 온도 기준: MTSPACE COFFEE 커피 교육자료 The Basic of Coffee</li></ul>$mcw4649d0ba$
 where id = '348ca98f-1314-440f-882d-a03b9d57f59c';
-- content_post blog-coffee-bean-gift-guide
update public.content_post set body_html = $mcw4649d0ba$<p>원두는 받는 사람의 취향과 추출 도구에 잘 맞으면 반가운 선물이 되지만, 맞지 않으면 오래 보관되다 향을 잃기 쉬운 선물이기도 합니다. 실패를 줄이려면 고르기 전에 두 가지만 확인하면 됩니다.</p>
<p><a href="https://mtspace.coffee/collections/all"><strong>MTSPACE COFFEE 원두 전체 보기</strong> →</a></p>
<h2>질문 1. 어떻게 내려 마시는가</h2>
<table><thead><tr><th>추출 방식</th><th>추천</th></tr></thead><tbody><tr><td>에스프레소 머신, 라떼 위주</td><td>블렌드</td></tr><tr><td>핸드드립</td><td>싱글 오리진 또는 라이트 블렌드</td></tr></tbody></table>
<p>그라인더가 있는지도 함께 확인하십시오. 원두는 통원두 상태로 선물하는 경우가 많아, 그라인더가 없는 분이라면 다른 선물이 더 나을 수 있습니다.</p>
<h2>질문 2. 어떤 맛을 좋아하는가</h2>
<table><thead><tr><th>선호</th><th>추천 원두</th><th>가격</th></tr></thead><tbody><tr><td>진하고 고소한 맛</td><td>댐굳(다크)</td><td>10,990원</td></tr><tr><td>부드럽고 균형 잡힌 맛</td><td>올라운더(미디움)</td><td>11,990원</td></tr><tr><td>상큼한 과일 향</td><td>스팟라이트(라이트)</td><td>12,990원</td></tr><tr><td>저녁에도 마시는 편</td><td>이지피지(로우 카페인)</td><td>11,990원</td></tr></tbody></table>
<p>취향을 특정하기 어렵다면 올라운더가 무난한 선택입니다.</p>
<h2>커피를 잘 아는 분께는 싱글 오리진</h2>
<table><thead><tr><th>원두</th><th>플레이버 노트</th><th>가격</th></tr></thead><tbody><tr><td>에티오피아 코체레 다니초 워시드</td><td>자스민, 유자, 오렌지필, 살구</td><td>17,000원</td></tr><tr><td>케냐 무가야 AA 워시드</td><td>크랜베리, 사과, 사탕수수, 자몽</td><td>18,000원</td></tr><tr><td>페루 부에노스 아이레스</td><td>사과, 카라멜, 자두</td><td>18,000원</td></tr><tr><td>에티오피아 타데세 욘카 내추럴</td><td>라즈베리, 블루베리, 핵과류, 사탕수수</td><td>19,500원</td></tr></tbody></table>
<p>싱글 오리진은 산지와 생산자 이야기가 분명해 선물하는 이유를 설명하기도 좋습니다.</p>
<h2>예산별 조합</h2>
<table><thead><tr><th>예산</th><th>구성</th><th>예시</th></tr></thead><tbody><tr><td>1만 원대</td><td>블렌드 한 봉</td><td>댐굳 10,990원</td></tr><tr><td>2만 원대</td><td>블렌드 + 싱글 오리진</td><td>댐굳 + 코체레 다니초 27,990원</td></tr><tr><td>3만 원대</td><td>싱글 오리진 두 봉</td><td>코체레 다니초 + 무가야 35,000원</td></tr></tbody></table>
<p>가격은 상품 가격 기준입니다. 3만 원대 조합은 에티오피아와 케냐의 산미를 비교하는 재미가 있습니다.</p>
<h2>선물을 더 잘 즐기게 하는 메모</h2>
<p>추천 레시피 한 줄을 함께 적어 두면 받는 분이 바로 즐길 수 있습니다. 스팟라이트를 고른다면 필터 기준 레시피(12g, 뜸 36g 60초, 총 192g, 1:40~2:00)를 카드로 넣어 보십시오. &quot;봉투를 닫아 서늘한 곳에, 2주 안에&quot;라는 보관 안내도 덧붙이면 좋습니다. 원두별 레시피는 각 제품 페이지에서 확인할 수 있습니다.</p>
<h2>신선하게 전하려면</h2>
<p>MTSPACE는 정해진 로스팅 주기에 맞춰 출고합니다. 연말에는 택배 물량이 많으니 전달할 날짜에 맞춰 여유 있게 주문하십시오.</p>
<h2>자주 묻는 질문</h2>
<p><strong>Q. 커피를 잘 모르는 분께는 무엇이 좋나요?</strong><br />블렌드, 그중에서도 균형 잡힌 올라운더를 권합니다.</p>
<p><strong>Q. 한 봉은 선물로 적은 양 아닌가요?</strong><br />필터 12g 기준 약 10잔 분량으로, 향이 좋을 때 다 마실 수 있는 양입니다. 두 봉을 조합하면 비교하는 즐거움도 더해집니다.</p>
<p><strong>Q. 받는 분께 보관법도 알려 드리고 싶어요.</strong><br /><a href="https://mtspace.coffee/blogs/coffeelog/blog-coffee-bean-storage">원두 보관법 정리</a>를 함께 공유해 주십시오. 봉투를 닫아 서늘하고 어두운 곳에 두는 것이 기본입니다.</p>
<p>---</p>
<h2>English</h2>
<p><strong>Coffee gift guide.</strong> Ask two questions first: how they brew (machine and lattes suit blends; hand drip suits single origins) and what they like. Picks: Damn Good for rich and nutty, Allrounder for balance, Spotlight for bright fruit, EZPZ for evenings. Single origins from Ethiopia, Kenya and Peru range from 17,000 to 19,500 won per bag. Add a one-line recipe card with the gift.</p>
<p>---</p>
<h3>출처</h3>
<ul><li>제품 정보, 레시피: MTSPACE COFFEE 상품 데이터와 자체 로스팅 기록</li><li>가격: MTSPACE COFFEE 자사몰 2026년 9월 기준</li></ul>$mcw4649d0ba$
 where id = 'b011eac3-e89e-41ce-a998-cc1b6137dc48';
-- content_post blog-coffee-bean-storage
update public.content_post set body_html = $mcw4649d0ba$<p>볶은 원두는 로스터리를 떠나는 순간부터 향을 조금씩 내보냅니다. 이 과정을 멈출 수는 없지만 늦출 수는 있습니다. 원두의 향을 빼앗는 원인은 공기, 빛, 열, 습기 네 가지이고, 보관법은 결국 이 네 가지를 얼마나 잘 차단하느냐의 문제입니다.</p>
<p>이 글에서는 집에서 원두를 보관할 때 기준이 되는 조건과, 자주 받는 질문인 냉장과 냉동 보관, 그리고 분쇄 시점까지 순서대로 정리합니다.</p>
<p><a href="https://mtspace.coffee/collections/all"><strong>MTSPACE COFFEE 원두 전체 보기</strong> →</a></p>
<h2>원두의 향을 빼앗는 네 가지</h2>
<table><thead><tr><th>원인</th><th>원두에 일어나는 일</th><th>대응</th></tr></thead><tbody><tr><td>공기</td><td>산소와 닿으며 향 성분이 날아가고 산화가 진행됩니다</td><td>밀봉, 봉투 속 공기를 최대한 제거</td></tr><tr><td>빛</td><td>직사광선과 강한 조명이 변질을 앞당깁니다</td><td>불투명 용기나 원래 봉투 사용</td></tr><tr><td>열</td><td>온도가 높을수록 향이 빠르게 빠집니다</td><td>조리대, 커피머신 상단 피하기</td></tr><tr><td>습기</td><td>수분을 흡수하면 맛이 둔해집니다</td><td>싱크대 주변, 물기 많은 곳 피하기</td></tr></tbody></table>
<p>네 가지 중 체감 차이가 가장 큰 것은 공기입니다. 개봉한 봉투를 열어 둔 채로 두면 며칠 사이에 향의 차이가 분명하게 느껴집니다.</p>
<h2>아로마 밸브 봉투는 그대로 쓰셔도 됩니다</h2>
<p>봉투 앞면에 작은 원형 부품이 붙어 있다면 아로마 밸브입니다. 볶은 원두에서 나오는 가스는 밖으로 내보내고 외부 공기는 들이지 않는 일방향 밸브라, 이런 봉투는 별도 용기로 옮기지 않아도 보관 용기 역할을 충분히 합니다. 다만 향을 확인하려고 밸브를 자주 누르면 내부의 향도 함께 빠져나갑니다.</p>
<p>용기에 옮겨 담는다면 불투명한 밀폐 용기를 쓰고, 볶은 시점이 다른 원두를 한 용기에 섞지 않는 것이 좋습니다. 새 원두와 남은 원두가 섞이면 한 잔 안에서 신선도가 다른 원두가 함께 추출되어 맛이 일정하지 않게 됩니다.</p>
<h2>실온, 냉장, 냉동 중 어디에 둘까요</h2>
<p><strong>실온 밀폐 보관</strong>이 가장 관리하기 쉽습니다. 2주 안에 마실 양이라면 서늘하고 어두운 곳에 밀봉해 두는 것으로 충분합니다.</p>
<p><strong>냉장 보관은 권하지 않습니다.</strong> 꺼낼 때마다 안팎의 온도 차로 원두 표면에 물기가 맺히기 쉽고, 다른 식품의 냄새도 쉽게 뱁니다.</p>
<p><strong>냉동 보관</strong>은 장기 보관이 필요할 때의 선택지입니다. 한 번에 마실 양씩 나눠 밀봉해 얼리고, 꺼낸 봉지는 다시 냉동실에 넣지 않는 방식으로 써야 결로와 냄새 문제를 피할 수 있습니다.</p>
<h2>보관보다 중요한 것은 분쇄 시점입니다</h2>
<p>통원두는 표면만 공기에 닿지만, 분쇄하는 순간 공기와 닿는 면적이 크게 늘어납니다. 그래서 보관을 아무리 잘해도 미리 갈아 둔 커피는 향이 빠르게 약해집니다. 그라인더가 있다면 추출 직전에 한 잔 분량만 분쇄하는 것이 가장 효과가 큰 습관입니다.</p>
<h2>소포장을 쓰는 이유</h2>
<p>MTSPACE COFFEE는 가정용 원두를 소포장 한 가지로만 판매합니다. 하루에 한두 잔을 내린다고 보면 소진까지 대략 2주가 걸리는 양으로, 향이 좋은 기간 안에 봉투를 비우도록 맞춘 크기입니다. 필터 12g 기준으로는 약 10잔 분량입니다.</p>
<p>출발점의 신선도도 보관만큼 중요합니다. MTSPACE는 미리 볶아 쌓아 두지 않습니다.</p>
<h2>이런 분께 도움이 됩니다</h2>
<ul><li>개봉 후 며칠 지나면 원두 맛이 달라진다고 느끼는 분</li><li>냉장고와 냉동실 중 어디에 둘지 고민하는 분</li><li>원두를 한 번에 여러 봉 사 두는 분</li></ul>
<h2>자주 묻는 질문</h2>
<p><strong>Q. 원두를 냉동하면 맛이 떨어지나요?</strong><br>소분해서 밀봉하고, 꺼낸 봉지를 다시 얼리지 않는다면 장기 보관에 유용한 방법입니다. 다만 2주 안에 마실 양이라면 실온 밀폐 보관이 더 간편합니다.</p>
<p><strong>Q. 유리병에 담아 두면 보기 좋던데 괜찮을까요?</strong><br>투명한 용기는 빛을 막지 못합니다. 유리병을 쓴다면 햇빛이 들지 않는 수납장 안에 두세요.</p>
<p><strong>Q. 분쇄된 원두를 샀다면 어떻게 보관하나요?</strong><br>공기와 닿는 면적이 넓어 통원두보다 향이 빨리 약해집니다. 더 철저하게 밀봉하고 가능한 한 빨리 드시는 것이 좋습니다.</p>
<p><strong>Q. 봉투의 밸브로 향을 맡아도 되나요?</strong><br>가끔은 괜찮지만 자주 누르면 봉투 안의 향이 빠져나갑니다.</p>
<p>---</p>
<h2>English</h2>
<p><strong>How to store coffee beans.</strong> Roasted coffee loses aroma through four enemies: air, light, heat and moisture. Keep beans sealed, in an opaque container or the original valve bag, away from heat and humidity. Room-temperature airtight storage is the simplest option for beans you will finish within two weeks; avoid the fridge, and freeze only in single-use portions. Grinding right before brewing matters more than anything else. MTSPACE COFFEE never pre-roasts for stock, and its retail bags are sized to be finished while fresh.</p>
<p>---</p>
<h3>출처</h3>
<ul><li>제품 정보, 레시피: MTSPACE COFFEE 상품 데이터와 자체 로스팅 기록</li><li>보관 원칙(공기, 빛, 열, 습기): 로스팅 원두의 일반 보관 기준을 MTSPACE COFFEE 운영 경험으로 정리</li></ul>$mcw4649d0ba$,
  seo_description = $mcw4649d0ba$볶은 원두의 향이 빠지는 네 가지 원인과 실온, 냉장, 냉동 보관의 차이, 아로마 밸브 봉투 활용법, 소포장의 이유를 정리했습니다.$mcw4649d0ba$
 where id = '2fa6c945-fd36-4176-8d6d-6280554a7d3d';
-- content_post blog-cafe-startup-roaster-partner
update public.content_post set excerpt = $mcw4649d0ba$원두 파트너는 오픈 이후 매일 함께 일할 상대입니다. 로스팅 주기, 기준 레시피, 교육, 라인업 확장, 오픈 후 지원 다섯 가지 기준과 오픈 로드맵을 정리했습니다.$mcw4649d0ba$,
  body_html = $mcw4649d0ba$<p>카페 창업을 준비하면서 인테리어와 메뉴에 집중하다 보면 원두 결정은 뒤로 밀리기 쉽습니다. 그러나 원두 파트너는 오픈 이후 매일 함께 일하는 상대이고, 오픈 초기의 바 세팅과 직원 교육에도 직접 영향을 줍니다. 조금 일찍 결정할수록 준비 과정이 수월해집니다.</p>
<p><a href="https://mtspace.coffee/consulting"><strong>컨설팅 및 파트너십 안내 보기</strong> →</a></p>
<h2>원두 파트너 체크리스트</h2>
<table><thead><tr><th>#</th><th>확인 항목</th><th>이유</th></tr></thead><tbody><tr><td>1</td><td>로스팅과 출고 주기가 분명한가</td><td>신선도와 발주 계획의 기준</td></tr><tr><td>2</td><td>원두마다 기준 레시피를 제공하는가</td><td>오픈 초기 바 세팅 시간 단축</td></tr><tr><td>3</td><td>교육을 지원하는가</td><td>오픈 멤버가 같은 기준으로 추출</td></tr><tr><td>4</td><td>라인업이 매장 성장에 맞춰 넓어질 수 있는가</td><td>디카페인, 싱글 오리진, 전용 블렌드로 확장</td></tr><tr><td>5</td><td>오픈 이후에도 메뉴와 운영을 함께 볼 수 있는가</td><td>메뉴, 가격, 발주 흐름은 오픈 후에 드러나는 경우가 많음</td></tr></tbody></table>
<p>다섯 가지를 모두 갖춘 곳을 찾기 어렵다면 1번과 2번은 반드시 확인하십시오. 신선도와 레시피는 오픈 첫날부터 매일 컵에 드러나는 요소입니다.</p>
<p>MTSPACE는 정해진 로스팅 주기로 출고하고, 제품마다 기준 레시피를 공개합니다.</p>
<h2>오픈 로드맵</h2>
<table><thead><tr><th>단계</th><th>내용</th></tr></thead><tbody><tr><td>진단</td><td>입지와 콘셉트 진단</td></tr><tr><td>설계</td><td>바 설계와 장비 세팅</td></tr><tr><td>준비</td><td>오픈 준비, 직원 교육과 SOP 정리</td></tr><tr><td>오픈 후</td><td>데이터 기반으로 메뉴, 가격, 발주 흐름 조정</td></tr></tbody></table>
<p>머신과 그라인더가 설치되는 날부터 원두 테스트를 시작하는 것을 권합니다. 교육은 매장에 들어온 장비로 확정한 수치로 진행해야 오픈 후에도 그대로 유지됩니다. 오픈 초기에는 메뉴 수를 줄여 시작하면 바 동선과 교육이 단순해집니다.</p>
<p>MTSPACE의 매장 운영 컨설팅은 이 로드맵의 처음부터 끝까지를 함께합니다. 원두 공급으로 시작해 필요한 부분만 더하는 방식도 가능합니다.</p>
<h2>MTSPACE 컨설팅의 세 축</h2>
<table><thead><tr><th>영역</th><th>내용</th></tr></thead><tbody><tr><td>브랜드 전략</td><td>포지셔닝, 네이밍, 비주얼 아이덴티티, 메뉴 설계</td></tr><tr><td>데이터와 POS 분석</td><td>판매 데이터로 메뉴 구성, 가격, 재고와 발주 흐름 진단</td></tr><tr><td>운영 SOP</td><td>추출 레시피, 바 세팅, 위생과 품질 기준 표준화</td></tr></tbody></table>
<p>MTSPACE의 운영 방법론은 시드니 놈코어 커피 매장 운영과 대회 경험을 바탕으로 한국 시장에 맞게 정리한 것입니다.</p>
<h2>원두 구성은 어떻게 시작하나요</h2>
<p>그라인더 수와 예상 메뉴 비중을 기준으로 정합니다. 그라인더 한 대로 시작한다면 에스프레소, 밀크, 필터에서 두루 균형을 내는 올라운더를 권합니다. 자세한 기준은 <a href="https://mtspace.coffee/blogs/coffeelog/blog-cafe-bean-switch-guide">카페 원두 교체 가이드</a>에서 다룹니다.</p>
<h2>자주 묻는 질문</h2>
<p><strong>Q. 오픈 몇 달 전에 원두를 정해야 하나요?</strong><br />장비가 설치되기 전에 후보를 좁혀 두고, 설치된 날부터 매장 장비로 테스트하는 것을 권합니다.</p>
<p><strong>Q. 컨설팅 없이 원두 공급만 받을 수 있나요?</strong><br />가능합니다. 사업자 계정 승인 후 등급별 도매가로 바로 주문할 수 있습니다.</p>
<p><strong>Q. 컨설팅은 어떤 범위까지 가능한가요?</strong><br />입지와 콘셉트 진단부터 오픈 후 데이터 관리까지 전체 또는 일부를 선택할 수 있습니다. 범위는 상담에서 정합니다.</p>
<p>---</p>
<h2>English</h2>
<p><strong>Choosing a roaster partner for your new cafe.</strong> Check five things: published roasting and shipping schedule, baseline recipes for every coffee, training support, a lineup that can grow with you, and support after opening. Opening roadmap: location and concept diagnosis, bar design and equipment setup, staff training and SOPs, then data-driven menu, pricing and ordering. MTSPACE consulting covers brand strategy, POS data analysis and operations SOPs.</p>
<p>---</p>
<h3>출처</h3>
<ul><li>제품 정보, 레시피: MTSPACE COFFEE 상품 데이터와 자체 로스팅 기록</li><li>매장 운영 컨설팅과 컨설팅 세 축: MTSPACE COFFEE 컨설팅 및 파트너십 페이지</li></ul>$mcw4649d0ba$
 where id = '22d38d9c-bddc-4ee9-b3e7-a77ebcab251e';
-- content_post blog-allrounder-story
update public.content_post set title = $mcw4649d0ba$올라운더 allrounder: 어디에나 잘 어울리는 미디움 블렌드$mcw4649d0ba$,
  excerpt = $mcw4649d0ba$호주 카페의 ‘올라운드 플레이어’에서 이름을 딴 미디움 블렌드. 에스프레소, 필터, 라떼까지 균형 잡힌 한 잔을 소개합니다.$mcw4649d0ba$,
  body_html = $mcw4649d0ba$<p>올라운더(allrounder)는 하나의 원두로 에스프레소도, 필터도, 라떼도 만족스럽게 내리고 싶은 분을 위한 미디움 블렌드입니다. 미디움 로스팅으로 단맛과 마우스필을 풍부하게 끌어올렸고, 베리와 사과를 닮은 정제된 산미가 어떤 추출에서도 균형을 잡아줍니다.</p><figure><img src="https://apiskyivlvebpvvxfejq.supabase.co/storage/v1/object/public/product-assets/blog/blends/allrounder-hero.jpg" alt="올라운더 에스프레소 추출" style="width:100%;border-radius:14px;margin:0" loading="lazy" /><figcaption style="text-align:center;color:#8A8173;font-size:0.85rem;margin-top:8px">올라운더 에스프레소 추출</figcaption></figure><h2>이름에 담긴 이야기: 호주 카페의 ‘올라운더’</h2><p>호주의 많은 카페에는 조금 특별한 포지션이 있습니다. 바로 ‘올라운더’입니다. 바리스타와 플로어 스태프가 명확히 나뉘는 구조와 달리, 올라운더는 바(bar)와 홀, 때로는 키친까지 자유롭게 오가며 매장의 흐름을 부드럽게 이어줍니다. 화려하게 드러나지는 않지만, 그가 있어 하루가 매끄럽게 굴러가는 그런 존재죠.</p><p>MTSPACE COFFEE의 올라운더도 꼭 그런 마음으로 만들었습니다. 아주 화려하진 않아도, 어떤 자리에서든 잘 어울리며 늘 좋은 경험을 건네는 커피. 다양한 취향을 두루 만족시키는, 믿고 꺼낼 수 있는 한 잔입니다.</p><figure><img src="https://apiskyivlvebpvvxfejq.supabase.co/storage/v1/object/public/product-assets/blog/blends/allrounder-milk.jpg" alt="라떼로도 균형이 살아나는 올라운더" style="width:100%;border-radius:14px;margin:0" loading="lazy" /><figcaption style="text-align:center;color:#8A8173;font-size:0.85rem;margin-top:8px">라떼로도 균형이 살아나는 올라운더</figcaption></figure><h2>균형이 만드는 리듬감</h2><p>올라운더는 에스프레소부터 필터 브루잉, 밀크 베이스까지 폭넓은 추출에서 흔들리지 않도록 설계됐습니다. 베리와 사과를 떠올리게 하는 밝은 과일향이 중심을 잡고, 그 아래를 카카오와 아몬드의 고소함이 은은하게 받쳐 부드럽고 리듬감 있는 한 잔을 완성합니다. 단독으로 마셔도, 우유나 베리에이션 음료에 넣어도 자연스럽게 스며듭니다.</p><figure><img src="https://apiskyivlvebpvvxfejq.supabase.co/storage/v1/object/public/product-assets/blog/blends/allrounder-filter.jpg" alt="필터로 내려도 균형 잡힌 올라운더" style="width:100%;border-radius:14px;margin:0" loading="lazy" /><figcaption style="text-align:center;color:#8A8173;font-size:0.85rem;margin-top:8px">필터로 내려도 균형 잡힌 올라운더</figcaption></figure><h2>이런 분께 권합니다</h2><ul><li>원두 하나로 에스프레소, 핸드드립, 라떼를 두루 즐기는 홈카페 유저</li><li>너무 강하지도 약하지도 않은 밸런스형 커피를 선호하는 분</li><li>매일 마셔도 질리지 않는 데일리 원두를 찾는 분</li><li>메뉴 폭이 넓은 카페의 베이스 원두(도매)</li></ul><h2>추천 레시피</h2><ul><li><strong>에스프레소</strong>: 도징 20g / 추출 40g / 25초</li><li><strong>라떼(밀크)</strong>: 도징 22g / 추출 38g / 29초, 6oz 싱글샷</li><li><strong>필터(V60)</strong>: 도징 12g / 블룸 36g, 60초 / 총 192g / 1:40~2:00</li></ul><h2>자주 묻는 질문</h2><p><strong>Q. 올라운더는 어떤 맛인가요?</strong><br>베리, 사과의 정제된 산미에 카카오, 아몬드의 고소함이 받쳐주는 미디움 블렌드입니다. 산미와 단맛의 균형이 좋아 데일리로 즐기기 좋습니다.</p><p><strong>Q. 어떤 추출에 어울리나요?</strong><br>에스프레소, 필터, 밀크 베이스 모두에 잘 맞도록 설계되어, 원두 하나로 여러 음료를 내리기에 적합합니다.</p><p><strong>Q. 산미가 부담스럽지 않을까요?</strong><br>과하지 않은 정제된 산미라 신맛에 민감한 분도 부담 없이 즐길 수 있는 미디움 로스트입니다.</p><hr><h2>English</h2><p><em>Allrounder</em> is a medium blend built to stay balanced across espresso, filter and milk, named after the Australian café role that moves freely between bar, floor and kitchen to keep everything flowing. Refined berry-and-apple acidity leads, with cacao and almond underneath. Recipes: espresso 20g/40g/25s, latte 22g/38g/29s, filter (V60) 12g, 36g bloom 60s, 192g total, 1:40~2:00.</p>
<hr />
<h3>출처</h3>
<ul><li>제품 정보, 플레이버 노트, 추천 레시피: MTSPACE COFFEE 상품 데이터와 자체 로스팅 기록</li><li>블렌드 개발 배경: MTSPACE COFFEE 브랜드 기록</li></ul>$mcw4649d0ba$,
  seo_title = $mcw4649d0ba$올라운더 allrounder 원두 이야기 | 베리, 사과, 카카오 미디움 블렌드 - MTSPACE COFFEE$mcw4649d0ba$,
  seo_description = $mcw4649d0ba$에스프레소, 필터, 밀크까지 균형 잡힌 미디움 블렌드 올라운더. 베리, 사과의 정제된 산미와 카카오, 아몬드의 고소함, 추천 레시피와 어울리는 사람을 정리했습니다.$mcw4649d0ba$
 where id = 'f5c36cb5-8faa-4fcb-93d0-99b54bc81154';
-- content_post blog-easy-peasy-story
update public.content_post set title = $mcw4649d0ba$이지피지 ez pz: 카페인은 낮게, 맛은 그대로인 미디움 블렌드$mcw4649d0ba$,
  body_html = $mcw4649d0ba$<p>이지피지(ez pz)는 카페인은 낮추고 맛과 향은 그대로 지킨 로우 카페인 미디움 블렌드입니다. 카라멜, 견과, 시트러스가 부드럽게 어우러져, 늦은 오후나 저녁처럼 카페인이 신경 쓰이는 순간에도 편안하게 즐길 수 있습니다.</p><figure><img src="https://apiskyivlvebpvvxfejq.supabase.co/storage/v1/object/public/product-assets/blog/blends/ezpz-hero.jpg" alt="이지피지 푸어오버 — 부담 없이 내리는 한 잔" style="width:100%;border-radius:14px;margin:0" loading="lazy" /><figcaption style="text-align:center;color:#8A8173;font-size:0.85rem;margin-top:8px">이지피지 푸어오버: 부담 없이 내리는 한 잔</figcaption></figure><h2>이름 그대로, ‘이지피지’</h2><p>이지피지(easy peasy)는 ‘아주 쉽다’는 뜻입니다. 카페인 걱정 없이, 시간대 눈치 보지 않고, 추출도 어렵지 않게, 커피를 즐기는 일이 조금 더 쉬워지길 바라는 마음을 이름에 담았습니다.</p><p>그래서 이지피지는 카페인을 완전히 제거하는 디카페인과는 다른 길을 택했습니다. 카페인은 낮추되, 원두 본연의 맛과 향은 최대한 살리는 방향입니다. ‘카페인 때문에 한 잔 더는 참아야 하나’ 망설였던 순간에, 부담을 덜어주는 커피입니다.</p><figure><img src="https://apiskyivlvebpvvxfejq.supabase.co/storage/v1/object/public/product-assets/blog/blends/ezpz-desk.jpg" alt="오후의 여유에 곁들이는 이지피지" style="width:100%;border-radius:14px;margin:0" loading="lazy" /><figcaption style="text-align:center;color:#8A8173;font-size:0.85rem;margin-top:8px">오후의 여유에 곁들이는 이지피지</figcaption></figure><h2>부드럽고 균형 잡힌 한 잔</h2><p>이지피지는 카라멜의 단맛, 견과류의 고소함, 은은한 시트러스가 둥글게 어우러진 미디움 블렌드입니다. 자극적이지 않고 편안한 밸런스라, 블랙으로도 밀크 베이스로도 무리 없이 즐길 수 있습니다. 하루 중 언제 마셔도 부담이 적다는 점이 가장 큰 매력입니다.</p><p style="color:#8A8173;font-size:0.9rem">※ 카페인을 낮춘 블렌드로, 카페인을 완전히 제거한 디카페인과는 다릅니다.</p><figure><img src="https://apiskyivlvebpvvxfejq.supabase.co/storage/v1/object/public/product-assets/blog/blends/ezpz-cat.jpg" alt="집에서 편하게 내려 즐기는 이지피지" style="width:100%;border-radius:14px;margin:0" loading="lazy" /><figcaption style="text-align:center;color:#8A8173;font-size:0.85rem;margin-top:8px">집에서 편하게 내려 즐기는 이지피지</figcaption></figure><h2>이런 분께 권합니다</h2><ul><li>카페인에 민감하지만 커피 맛은 포기하고 싶지 않은 분</li><li>오후, 저녁에도 커피 한 잔의 여유를 즐기고 싶은 분</li><li>하루에 여러 잔 마셔 카페인 총량이 신경 쓰이는 분</li><li>부드럽고 균형 잡힌 데일리 원두를 찾는 분</li></ul><h2>추천 레시피</h2><ul><li><strong>에스프레소</strong>: 도징 20g / 추출 38g / 22초</li><li><strong>라떼(밀크)</strong>: 도징 22g / 추출 36g / 25초, 6oz 싱글샷</li><li><strong>필터(V60)</strong>: 도징 12g / 블룸 36g, 60초 / 총 192g / 1:40~2:00</li></ul><h2>자주 묻는 질문</h2><p><strong>Q. 이지피지는 디카페인인가요?</strong><br>아닙니다. 카페인을 완전히 제거한 디카페인이 아니라, 카페인을 낮추면서 맛과 향은 살린 로우 카페인 블렌드입니다.</p><p><strong>Q. 어떤 맛인가요?</strong><br>카라멜의 단맛, 견과류의 고소함, 은은한 시트러스가 어우러진 부드러운 미디움 로스트입니다.</p><p><strong>Q. 언제 마시면 좋나요?</strong><br>카페인이 신경 쓰이는 늦은 오후나 저녁, 하루 여러 잔을 즐기는 분께 특히 잘 맞습니다.</p><hr><h2>English</h2><p><em>ez pz</em> is a low-caffeine medium blend that keeps flavor and aroma while dialing caffeine down, for late-afternoon and evening cups without the second-guessing. Rounded notes of caramel, nuts and gentle citrus, easy black or with milk. Note: low-caffeine, not fully decaffeinated. Recipes: espresso 20g/38g/22s, latte 22g/36g/25s, filter (V60) 12g, 36g bloom 60s, 192g total, 1:40~2:00.</p>
<hr />
<h3>출처</h3>
<ul><li>제품 정보, 플레이버 노트, 추천 레시피: MTSPACE COFFEE 상품 데이터와 자체 로스팅 기록</li><li>블렌드 개발 배경: MTSPACE COFFEE 브랜드 기록</li></ul>$mcw4649d0ba$,
  seo_description = $mcw4649d0ba$카페인은 낮추고 맛은 지킨 로우 카페인 미디움 블렌드 이지피지. 카라멜, 견과, 시트러스의 부드러운 밸런스와 오후, 저녁에도 부담 없는 즐기는 법을 정리했습니다.$mcw4649d0ba$
 where id = 'ba76e607-5622-4138-a7cf-a983c6ee5c0f';
-- content_post blog-ah-a-blend-story
update public.content_post set title = $mcw4649d0ba$아아 ah-a blend: 얼죽아를 위한 아이스 아메리카노 전용 블렌드$mcw4649d0ba$,
  excerpt = $mcw4649d0ba$얼음에 희석돼도 무너지지 않는 아이스 아메리카노 전용 블렌드. 다크초콜릿, 견과, 카라멜의 진한 단맛과 골든 레시피를 소개합니다.$mcw4649d0ba$,
  body_html = $mcw4649d0ba$<p>아아(ah-a) 블렌드는 이름 그대로 ‘얼죽아’를 위한 아이스 아메리카노 전용 블렌드입니다. 얼음에 희석돼도 향이 옅어지거나 밸런스가 무너지지 않도록, 미디움다크 로스팅으로 단맛과 바디를 단단하게 잡았습니다. 다크초콜릿, 견과, 카라멜의 진한 단맛이 마지막 모금까지 이어집니다.</p><figure><img src="https://apiskyivlvebpvvxfejq.supabase.co/storage/v1/object/public/product-assets/blog/blends/ah-a-hero.jpg" alt="얼음 위에서 완성되는 아이스 아메리카노" style="width:100%;border-radius:14px;margin:0" loading="lazy" /><figcaption style="text-align:center;color:#8A8173;font-size:0.85rem;margin-top:8px">얼음 위에서 완성되는 아이스 아메리카노</figcaption></figure><h2>얼음 위에서 완성되는 맛</h2><p>계절과 상관없이 아이스를 고집하는 사람은 이렇게 많은데, 정작 대부분의 원두는 뜨겁게 마실 때를 기준으로 만들어집니다. 그래서 아이스로 내리면 향이 옅어지고, 얼음이 녹을수록 밍밍해지기 쉽죠. 마지막 한 모금이 밍밍했던 경험, 한 번쯤 있으실 겁니다.</p><p>아아 블렌드는 그 문제를 정면으로 겨냥해 처음부터 아이스를 기준으로 설계했습니다. 얼음이 녹아 물이 더해지고 온도가 내려가는 조건에서도 커피의 골격이 흐트러지지 않도록 로스팅을 잡았기 때문에, 얼음에 희석돼도 진한 풍미가 끝까지 유지됩니다.</p><figure><img src="https://apiskyivlvebpvvxfejq.supabase.co/storage/v1/object/public/product-assets/blog/blends/ah-a-iced2.jpg" alt="진하고 시원하게 즐기는 아아 블렌드" style="width:100%;border-radius:14px;margin:0" loading="lazy" /><figcaption style="text-align:center;color:#8A8173;font-size:0.85rem;margin-top:8px">진하고 시원하게 즐기는 아아 블렌드</figcaption></figure><h2>진하고 시원한 단맛</h2><p>아아 블렌드의 중심은 다크초콜릿, 견과류, 카라멜의 묵직하고 고소한 단맛입니다. 차갑게 마셔도 밸런스가 살아 있어, 아이스 아메리카노 한 잔에 필요한 진함과 시원함을 모두 갖췄습니다. 사무실이나 매장에서 아이스로 대량으로 내려도 흔들림이 적습니다.</p><h2>이런 분께 권합니다</h2><ul><li>사계절 아이스 아메리카노만 마시는 ‘얼죽아’</li><li>아이스로 내렸을 때 밍밍해지는 원두가 아쉬웠던 분</li><li>사무실, 매장에서 아이스 아메리카노를 대량으로 내리는 분</li><li>진하고 개성 있는 아이스 한 잔을 원하는 분</li></ul><h2>추천 레시피: 아이스 아메리카노 골든 레시피</h2><ul><li><strong>에스프레소 추출</strong>: 도징 20g / 추출 38g / 27초</li><li><strong>아이스 아메리카노</strong>: 얼음 100g + 물 80g + 에스프레소 2샷</li><li>진하게 즐기려면 물을 줄이고, 부드럽게 즐기려면 얼음을 더하세요.</li></ul><h2>자주 묻는 질문</h2><p><strong>Q. 아아 블렌드는 뜨겁게 마셔도 되나요?</strong><br>물론입니다. 다만 아이스 아메리카노에 최적화해 설계한 블렌드라, 얼음에 희석했을 때 진함이 유지되는 것이 가장 큰 강점입니다.</p><p><strong>Q. 아이스 아메리카노는 어떻게 만드나요?</strong><br>에스프레소 2샷(도징 20g, 추출 38g, 27초)을 얼음 100g과 물 80g에 더하면 됩니다. 물과 얼음 양으로 농도를 조절하세요.</p><p><strong>Q. 어떤 맛인가요?</strong><br>다크초콜릿, 견과, 카라멜의 진하고 고소한 단맛이 중심인 미디움다크 블렌드로, 차갑게 마셔도 밸런스가 살아 있습니다.</p><hr><h2>English</h2><p><em>ah-a blend</em> is built for iced Americano, a medium-dark roast that keeps sweetness and body as ice melts, so the cup stays bold to the last sip instead of watery. Rich notes of dark chocolate, nuts and caramel. Golden recipe: pull espresso 20g/38g/27s, build over 100g ice + 80g water + 2 shots; less water for stronger, more ice for smoother.</p>
<hr />
<h3>출처</h3>
<ul><li>제품 정보, 플레이버 노트, 추천 레시피: MTSPACE COFFEE 상품 데이터와 자체 로스팅 기록</li><li>블렌드 개발 배경: MTSPACE COFFEE 브랜드 기록</li></ul>$mcw4649d0ba$,
  seo_description = $mcw4649d0ba$얼음에 희석돼도 진함이 유지되는 아이스 아메리카노 전용 블렌드 아아. 다크초콜릿, 견과, 카라멜의 단맛과 얼음+물+2샷 골든 레시피를 정리했습니다.$mcw4649d0ba$
 where id = 'd527163e-e336-401e-8adc-69f90935e761';
-- product damn-good-1000
update public.product set one_liner = $mcw4649d0ba$다크 시그니쳐 블렌드, 도매$mcw4649d0ba$,
  story = $mcw4649d0ba$댐굳은 2016년, MTSPACE COFFEE의 전신인 호주 놈코어 커피 시절에 탄생한 블렌드입니다. 다양한 소비자층을 대상으로 수개월에 걸쳐 원료 선정, 로스팅 프로파일 설계, 추출 레시피 개발을 반복하며 치밀한 연구와 테스트를 거쳤습니다. 또한 여러 지역과 환경에서 필드 테스트를 진행해, 통계적으로 가장 안정적이고 일관된 품질과 맛을 제공할 수 있도록 완성된 스테디셀러입니다. MTSPACE COFFEE로 브랜드가 전환되면서, 댐굳은 더 뛰어난 원료를 바탕으로 더욱 정교하게 다듬어진 로스팅 프로파일을 적용해 리뉴얼되었습니다. 기존의 캐릭터는 그대로 유지하면서도 추출 안정성이 크게 향상되었고, 플레이버 또한 더욱 선명하고 명확하게 표현됩니다. 이 과정을 통해 댐굳은 브랜드를 대표하는 블렌드로 자리 잡았으며, 오랜 시간 꾸준히 사랑받고 있습니다. 댐굳은 묵직한 바디와 고소한 뉘앙스를 기본으로, 다크 초콜릿, 자두, 바닐라의 복합적인 풍미를 섬세하게 전달합니다. 블랙 커피로 마시면 진한 여운과 깊이를, 밀크 베이스로 즐기면 부드럽고 풍성한 단맛을 느낄 수 있어, 다방면으로 훌륭한 퍼포먼스를 보여주는 MTSPACE COFFEE의 대표 블렌드입니다.$mcw4649d0ba$,
  story_en = $mcw4649d0ba$Damn Good was born in 2016 during the Australian Normcore Coffee era, MTSPACE COFFEE's predecessor. Over several months it was refined through repeated green-bean selection, roast-profile design and recipe development, then field-tested across many settings to deliver statistically consistent quality, a true steady-seller. With the shift to MTSPACE COFFEE it was renewed on better greens and a more precise roast profile: the character is unchanged but extraction stability is far higher and flavours read more clearly. Built on a heavy body and nutty nuance, Damn Good delivers a layered profile of dark chocolate, plum and vanilla, deep and lingering as black coffee, soft and richly sweet in milk. It is MTSPACE COFFEE's flagship blend.$mcw4649d0ba$,
  body_html = $mcw4649d0ba$<section style="margin:0 0 18px;padding:28px 24px;border-radius:16px;background:#5D155C;color:#fff"><p style="margin:0;font-size:20px;font-weight:700;line-height:1.5">다크 시그니쳐 블렌드, 도매</p></section>
<section style="margin:0 0 18px"><h2 style="font-size:15px;margin:0 0 10px;color:#888;text-transform:uppercase;letter-spacing:1px">Flavour</h2><span style="display:inline-block;margin:0 6px 6px 0;padding:4px 12px;border-radius:999px;background:#5D155C1a;color:#5D155C;font-size:13px">다크 초콜릿</span><span style="display:inline-block;margin:0 6px 6px 0;padding:4px 12px;border-radius:999px;background:#5D155C1a;color:#5D155C;font-size:13px">자두</span><span style="display:inline-block;margin:0 6px 6px 0;padding:4px 12px;border-radius:999px;background:#5D155C1a;color:#5D155C;font-size:13px">카라멜</span></section>
<section style="margin:0 0 18px;padding:20px 22px;border-radius:16px;background:#5D155C0d"><h2 style="font-size:16px;margin:0 0 8px;border-left:4px solid #5D155C;padding-left:10px">커피 정보</h2><dl style="margin:0"><div style="display:flex;gap:16px;padding:10px 0;border-bottom:1px solid #00000010"><dt style="width:96px;flex:none;color:#888;font-size:14px">로스팅</dt><dd style="margin:0;font-size:15px">다크</dd></div><div style="display:flex;gap:16px;padding:10px 0;border-bottom:1px solid #00000010"><dt style="width:96px;flex:none;color:#888;font-size:14px">중량</dt><dd style="margin:0;font-size:15px">1010g</dd></div></dl></section>
<section style="margin:0 0 4px;padding:18px 22px;border-radius:16px;background:#fafafa"><p style="margin:0;font-size:14px;color:#555">MTSPACE COFFEE는 자체 로스터리에서 직접 로스팅합니다. everyday excellence.</p></section>$mcw4649d0ba$
 where id = '300a875e-3352-473f-9fc4-8a536936e2c6';
-- product yirga-decaf-1000
update public.product set one_liner = $mcw4649d0ba$디카페인, 미디움 로스트, 도매$mcw4649d0ba$,
  one_liner_en = $mcw4649d0ba$decaf, medium roast, wholesale$mcw4649d0ba$,
  story_en = $mcw4649d0ba$High-grade coffee grown in the Ethiopian highlands, coffee's homeland, passes through MTSPACE COFFEE's green partner Cobinz and the C2 decaffeination process to become premium decaf green, then a delicious decaf roast. The C2 process uses mineral-rich Gangwon-do water and activated carbon to selectively remove caffeine from the green beans; after about ten hours of processing the beans are dried and finished. Unlike ordinary decaf, it keeps Yirgacheffe's signature floral character and clean, bright flavour.$mcw4649d0ba$,
  body_html = $mcw4649d0ba$<section style="margin:0 0 18px;padding:28px 24px;border-radius:16px;background:#BC8E36;color:#fff"><p style="margin:0;font-size:20px;font-weight:700;line-height:1.5">디카페인, 미디움 로스트, 도매</p></section><section style="margin:0 0 18px"><h2 style="font-size:15px;margin:0 0 10px;color:#888;text-transform:uppercase;letter-spacing:1px">Flavour</h2><span style="display:inline-block;margin:0 6px 6px 0;padding:4px 12px;border-radius:999px;background:#BC8E361a;color:#BC8E36;font-size:13px">자스민 플로럴</span><span style="display:inline-block;margin:0 6px 6px 0;padding:4px 12px;border-radius:999px;background:#BC8E361a;color:#BC8E36;font-size:13px">레몬</span><span style="display:inline-block;margin:0 6px 6px 0;padding:4px 12px;border-radius:999px;background:#BC8E361a;color:#BC8E36;font-size:13px">계피</span><span style="display:inline-block;margin:0 6px 6px 0;padding:4px 12px;border-radius:999px;background:#BC8E361a;color:#BC8E36;font-size:13px">부드러운 단맛</span></section><section style="margin:0 0 18px;padding:20px 22px;border-radius:16px;background:#BC8E360d"><h2 style="font-size:16px;margin:0 0 8px;border-left:4px solid #BC8E36;padding-left:10px">커피 정보</h2><dl style="margin:0"><div style="display:flex;gap:16px;padding:10px 0;border-bottom:1px solid #00000010"><dt style="width:96px;flex:none;color:#888;font-size:14px">원산지</dt><dd style="margin:0;font-size:15px">예가체프</dd></div><div style="display:flex;gap:16px;padding:10px 0;border-bottom:1px solid #00000010"><dt style="width:96px;flex:none;color:#888;font-size:14px">가공</dt><dd style="margin:0;font-size:15px">국내 디카페인 공정</dd></div><div style="display:flex;gap:16px;padding:10px 0;border-bottom:1px solid #00000010"><dt style="width:96px;flex:none;color:#888;font-size:14px">로스팅</dt><dd style="margin:0;font-size:15px">미디움</dd></div><div style="display:flex;gap:16px;padding:10px 0;border-bottom:1px solid #00000010"><dt style="width:96px;flex:none;color:#888;font-size:14px">중량</dt><dd style="margin:0;font-size:15px">1010g</dd></div></dl></section><section style="margin:0 0 4px;padding:18px 22px;border-radius:16px;background:#fafafa"><p style="margin:0;font-size:14px;color:#555">MTSPACE COFFEE는 자체 로스터리에서 직접 로스팅합니다. everyday excellence.</p></section>$mcw4649d0ba$,
  seo_title = $mcw4649d0ba$에티오피아 예가체프 디카페인 1kg (사업자 전용) 허브, 감귤, 카카오 | MTSPACE COFFEE$mcw4649d0ba$,
  seo_description = $mcw4649d0ba$허브, 감귤, 카카오의 컵 노트를 가진 미디움 로스트 에티오피아 예가체프 국내 디카페인 원두입니다. 디카페인 메뉴 운영이 필수인 카페, 임산부, 카페인 민감 고객을 위한 옵션이 필요한 운영자를 위한 사업자 전용 포장입니다. (카페인 99% 이상 제거)$mcw4649d0ba$,
  seo_description_en = $mcw4649d0ba$A domestically decaffeinated Yirgacheffe, medium roast, with herb, citrus and cacao notes. A wholesale format for cafés that need a dependable decaf option.$mcw4649d0ba$
 where id = '4b8caac6-1666-484a-ad16-2a02879d60ad';
-- product allrounder-1000
update public.product set one_liner = $mcw4649d0ba$미디움 로스트, 올데이 밸런스, 도매$mcw4649d0ba$,
  one_liner_en = $mcw4649d0ba$medium roast, all-day balance, wholesale$mcw4649d0ba$,
  story = $mcw4649d0ba$호주의 많은 카페에는 조금 특별한 포지션이 있습니다. 바로 ‘올라운더’입니다. 바리스타와 플로어 스태프가 명확히 구분되는 구조와 달리, 올라운더는 바리스타, 플로어, 때로는 키친까지 자유롭게 오가며 매장의 흐름을 부드럽게 이어주는 존재입니다. MTSPACE COFFEE의 올라운더 또한 그런 ‘올라운드 플레이어’처럼, 다양한 취향의 고객 니즈를 두루 만족시키는 커피를 목표로 만들어졌습니다. 모든 면에서 화려하지는 않아도 어디에나 잘 어울리며 늘 좋은 경험을 선사하는 커피 말입니다. 올라운더는 에스프레소부터 필터 브루잉, 밀크 베이스 커피까지 다양한 추출에서도 균형 잡힌 맛을 보여주도록 기획되었습니다. 미디엄 로스팅으로 단맛과 마우스필을 풍부하게 끌어올렸고, 베리류와 사과를 떠올리게 하는 정제된 산미가 특징입니다. 이 산미는 단독으로도, 밀크나 베리에이션 음료에서도 훌륭한 밸런스를 만들어 일상 어디에나 자연스럽게 스며듭니다. 사과와 베리류의 밝은 과일향을 중심으로 다크 초콜릿의 깊은 단맛이 은은하게 받쳐주어 부드럽고 리듬감 있는 한 잔을 완성합니다.$mcw4649d0ba$,
  story_en = $mcw4649d0ba$Many Australian cafés have a special role, the ‘allrounder’. Unlike a strict split between baristas and floor staff, the allrounder moves freely between bar, floor and even the kitchen, smoothing the flow of the whole shop. MTSPACE COFFEE's Allrounder is built the same way: a coffee meant to satisfy a wide range of tastes, not necessarily perfect, but always fitting in and always giving a good experience. It is designed to stay balanced across espresso, filter and milk-based drinks. Medium roasting lifts sweetness and mouthfeel, while a refined acidity reminiscent of berries and apple shines on its own and balances beautifully in milk. Bright apple-and-berry fruit is underpinned by the deep sweetness of dark chocolate for a smooth, rhythmic cup.$mcw4649d0ba$,
  body_html = $mcw4649d0ba$<section style="margin:0 0 18px;padding:28px 24px;border-radius:16px;background:#9A5E72;color:#fff"><p style="margin:0;font-size:20px;font-weight:700;line-height:1.5">미디움 로스트, 올데이 밸런스, 도매</p></section><section style="margin:0 0 18px"><h2 style="font-size:15px;margin:0 0 10px;color:#888;text-transform:uppercase;letter-spacing:1px">Flavour</h2><span style="display:inline-block;margin:0 6px 6px 0;padding:4px 12px;border-radius:999px;background:#9A5E721a;color:#9A5E72;font-size:13px">베리</span><span style="display:inline-block;margin:0 6px 6px 0;padding:4px 12px;border-radius:999px;background:#9A5E721a;color:#9A5E72;font-size:13px">사과</span><span style="display:inline-block;margin:0 6px 6px 0;padding:4px 12px;border-radius:999px;background:#9A5E721a;color:#9A5E72;font-size:13px">다크 초콜릿</span></section><section style="margin:0 0 18px;padding:20px 22px;border-radius:16px;background:#9A5E720d"><h2 style="font-size:16px;margin:0 0 8px;border-left:4px solid #9A5E72;padding-left:10px">커피 정보</h2><dl style="margin:0"><div style="display:flex;gap:16px;padding:10px 0;border-bottom:1px solid #00000010"><dt style="width:96px;flex:none;color:#888;font-size:14px">로스팅</dt><dd style="margin:0;font-size:15px">미디움</dd></div><div style="display:flex;gap:16px;padding:10px 0;border-bottom:1px solid #00000010"><dt style="width:96px;flex:none;color:#888;font-size:14px">중량</dt><dd style="margin:0;font-size:15px">1010g</dd></div></dl></section><section style="margin:0 0 4px;padding:18px 22px;border-radius:16px;background:#fafafa"><p style="margin:0;font-size:14px;color:#555">MTSPACE COFFEE는 자체 로스터리에서 직접 로스팅합니다. everyday excellence.</p></section>$mcw4649d0ba$,
  seo_title = $mcw4649d0ba$올라운더 1kg (사업자 전용) 베리류, 사과, 카카오, 아몬드 | MTSPACE COFFEE$mcw4649d0ba$,
  seo_description = $mcw4649d0ba$베리류, 사과, 카카오, 아몬드가 조화를 이루는 균형 잡힌 미디움 로스트 블렌드입니다. 하나의 블렌드로 블랙, 밀크 메뉴를 모두 커버하고 메뉴 구성을 단순화하면서도 품질에 타협하지 않으려는 카페에 추천하는 사업자 전용 블렌드입니다.$mcw4649d0ba$,
  seo_description_en = $mcw4649d0ba$A balanced medium roast of berries, apple, cacao and almond. A wholesale blend for cafés that want one bean to cover both black and milk menus.$mcw4649d0ba$
 where id = '78ea54bd-1b05-4b90-8299-87907c10022e';
-- product kenya-mugaya-aa-washed-125
update public.product set one_liner = $mcw4649d0ba$라이트 로스트, 과일향미 케냐 싱글 오리진$mcw4649d0ba$,
  one_liner_en = $mcw4649d0ba$light roast, fruity Kenyan single origin$mcw4649d0ba$,
  story_en = $mcw4649d0ba$Founded in 1975, the Mugaya washing station sits in the highlands near Kagumo town in Kirinyaga, one of ten stations run by the Mutira cooperative, doing the same work in the same place for nearly half a century. Around 1,700 smallholders deliver cherry from holdings averaging 0.1 hectares, closer to a garden than a farm, where maize, beans and vegetables grow among the coffee.

The processing is Kenyan washed by the book. Fermentation runs about a day before the mucilage is rinsed with clean river water, then the parchment soaks a further six hours and dries slowly on African beds. That soak is where Mugaya's clarity comes from.$mcw4649d0ba$,
  body_html = $mcw4649d0ba$<section style="margin:0 0 18px;padding:28px 24px;border-radius:16px;background:#D2A84E;color:#fff"><p style="margin:0;font-size:20px;font-weight:700;line-height:1.5">라이트 로스트, 고지대 구지 싱글 오리진</p></section><section style="margin:0 0 18px"><h2 style="font-size:15px;margin:0 0 10px;color:#888;text-transform:uppercase;letter-spacing:1px">Flavour</h2><span style="display:inline-block;margin:0 6px 6px 0;padding:4px 12px;border-radius:999px;background:#D2A84E1a;color:#D2A84E;font-size:13px">재스민</span><span style="display:inline-block;margin:0 6px 6px 0;padding:4px 12px;border-radius:999px;background:#D2A84E1a;color:#D2A84E;font-size:13px">백도</span><span style="display:inline-block;margin:0 6px 6px 0;padding:4px 12px;border-radius:999px;background:#D2A84E1a;color:#D2A84E;font-size:13px">꿀</span><span style="display:inline-block;margin:0 6px 6px 0;padding:4px 12px;border-radius:999px;background:#D2A84E1a;color:#D2A84E;font-size:13px">플로럴</span></section><section style="margin:0 0 18px;padding:20px 22px;border-radius:16px;background:#D2A84E0d"><h2 style="font-size:16px;margin:0 0 8px;border-left:4px solid #D2A84E;padding-left:10px">커피 정보</h2><dl style="margin:0"><div style="display:flex;gap:16px;padding:10px 0;border-bottom:1px solid #00000010"><dt style="width:96px;flex:none;color:#888;font-size:14px">원산지</dt><dd style="margin:0;font-size:15px">구지 샤키소 함벨라 와메나 게넷</dd></div><div style="display:flex;gap:16px;padding:10px 0;border-bottom:1px solid #00000010"><dt style="width:96px;flex:none;color:#888;font-size:14px">품종</dt><dd style="margin:0;font-size:15px">에티오피아 토착종</dd></div><div style="display:flex;gap:16px;padding:10px 0;border-bottom:1px solid #00000010"><dt style="width:96px;flex:none;color:#888;font-size:14px">가공</dt><dd style="margin:0;font-size:15px">워시드</dd></div><div style="display:flex;gap:16px;padding:10px 0;border-bottom:1px solid #00000010"><dt style="width:96px;flex:none;color:#888;font-size:14px">고도</dt><dd style="margin:0;font-size:15px">~2,300m</dd></div><div style="display:flex;gap:16px;padding:10px 0;border-bottom:1px solid #00000010"><dt style="width:96px;flex:none;color:#888;font-size:14px">로스팅</dt><dd style="margin:0;font-size:15px">라이트</dd></div><div style="display:flex;gap:16px;padding:10px 0;border-bottom:1px solid #00000010"><dt style="width:96px;flex:none;color:#888;font-size:14px">중량</dt><dd style="margin:0;font-size:15px">125g</dd></div></dl></section><section style="margin:0 0 4px;padding:18px 22px;border-radius:16px;background:#fafafa"><p style="margin:0;font-size:14px;color:#555">MTSPACE COFFEE는 자체 로스터리에서 직접 로스팅합니다. everyday excellence.</p></section>$mcw4649d0ba$,
  seo_title = $mcw4649d0ba$케냐 무가야 AA 워시드 | 크랜베리, 사과, 사탕수수, 자몽 싱글 오리진 | MTSPACE COFFEE$mcw4649d0ba$,
  seo_description = $mcw4649d0ba$키리냐가 무티라 협동조합의 무가야 워싱스테이션 커피입니다. SL28, SL34, 루이루11, 바티안을 하루 발효 뒤 6시간 재침지하는 케냐식 워시드로 가공했습니다. 크랜베리, 사과, 사탕수수, 자몽의 라이트 로스트 싱글 오리진입니다.$mcw4649d0ba$,
  seo_title_en = $mcw4649d0ba$Kenya Mugaya AA Washed | Cranberry, Apple, Sugarcane, Grapefruit | MTSPACE COFFEE$mcw4649d0ba$,
  seo_description_en = $mcw4649d0ba$A washed single origin from the Mugaya washing station of the Mutira cooperative in Kirinyaga. SL28, SL34, Ruiru 11 and Batian, fermented for a day and soaked again for six hours in the Kenyan style. Cranberry, apple, sugarcane and grapefruit in a light roast.$mcw4649d0ba$
 where id = 'eff96e97-c766-45ad-9997-6eaa6aeee472';
-- product ethiopia-kochere-danicho
update public.product set one_liner = $mcw4649d0ba$라이트 로스트, 은은한 티라이크 에티오피아$mcw4649d0ba$,
  one_liner_en = $mcw4649d0ba$Light roast, a quiet, tea-like Ethiopian$mcw4649d0ba$,
  story_en = $mcw4649d0ba$Three hundred and ninety kilometres south of Addis Ababa, the Kochere highlands sit between 1,980 and 2,250 metres. Around 2,150 smallholders deliver cherry to the washing station Danicho Mukere runs in Hama, in the Yirgacheffe growing area. Their plots average 1.5 hectares, closer to gardens than fields, and on them the JARC selections 74110, 74112 and 74158 grow mixed in with Ethiopian landraces.

The trees here do not stand in monoculture. Native species: zigba, bahir zaf, wanza, grow alongside them, casting shade and holding the soil in place. In that steady microclimate the cherry ripens without hurry. The long harvest, running from October into the middle of January, is the evidence.$mcw4649d0ba$,
  body_html = $mcw4649d0ba$<section style="margin:0 0 18px;padding:28px 24px;border-radius:16px;background:#D2A84E;color:#fff"><p style="margin:0;font-size:20px;font-weight:700;line-height:1.5">라이트 로스트, 고지대 구지 싱글 오리진</p></section><section style="margin:0 0 18px"><h2 style="font-size:15px;margin:0 0 10px;color:#888;text-transform:uppercase;letter-spacing:1px">Flavour</h2><span style="display:inline-block;margin:0 6px 6px 0;padding:4px 12px;border-radius:999px;background:#D2A84E1a;color:#D2A84E;font-size:13px">재스민</span><span style="display:inline-block;margin:0 6px 6px 0;padding:4px 12px;border-radius:999px;background:#D2A84E1a;color:#D2A84E;font-size:13px">백도</span><span style="display:inline-block;margin:0 6px 6px 0;padding:4px 12px;border-radius:999px;background:#D2A84E1a;color:#D2A84E;font-size:13px">꿀</span><span style="display:inline-block;margin:0 6px 6px 0;padding:4px 12px;border-radius:999px;background:#D2A84E1a;color:#D2A84E;font-size:13px">플로럴</span></section><section style="margin:0 0 18px;padding:20px 22px;border-radius:16px;background:#D2A84E0d"><h2 style="font-size:16px;margin:0 0 8px;border-left:4px solid #D2A84E;padding-left:10px">커피 정보</h2><dl style="margin:0"><div style="display:flex;gap:16px;padding:10px 0;border-bottom:1px solid #00000010"><dt style="width:96px;flex:none;color:#888;font-size:14px">원산지</dt><dd style="margin:0;font-size:15px">구지 샤키소 함벨라 와메나 게넷</dd></div><div style="display:flex;gap:16px;padding:10px 0;border-bottom:1px solid #00000010"><dt style="width:96px;flex:none;color:#888;font-size:14px">품종</dt><dd style="margin:0;font-size:15px">에티오피아 토착종</dd></div><div style="display:flex;gap:16px;padding:10px 0;border-bottom:1px solid #00000010"><dt style="width:96px;flex:none;color:#888;font-size:14px">가공</dt><dd style="margin:0;font-size:15px">워시드</dd></div><div style="display:flex;gap:16px;padding:10px 0;border-bottom:1px solid #00000010"><dt style="width:96px;flex:none;color:#888;font-size:14px">고도</dt><dd style="margin:0;font-size:15px">~2,300m</dd></div><div style="display:flex;gap:16px;padding:10px 0;border-bottom:1px solid #00000010"><dt style="width:96px;flex:none;color:#888;font-size:14px">로스팅</dt><dd style="margin:0;font-size:15px">라이트</dd></div><div style="display:flex;gap:16px;padding:10px 0;border-bottom:1px solid #00000010"><dt style="width:96px;flex:none;color:#888;font-size:14px">중량</dt><dd style="margin:0;font-size:15px">125g</dd></div></dl></section><section style="margin:0 0 4px;padding:18px 22px;border-radius:16px;background:#fafafa"><p style="margin:0;font-size:14px;color:#555">MTSPACE COFFEE는 자체 로스터리에서 직접 로스팅합니다. everyday excellence.</p></section>$mcw4649d0ba$,
  seo_title = $mcw4649d0ba$에티오피아 코체레 다니초 워시드 | 자스민, 유자, 오렌지필 싱글 오리진 | MTSPACE COFFEE$mcw4649d0ba$,
  seo_description = $mcw4649d0ba$예가체프 코체레 하마, 생산자 다니초 무케레의 워싱스테이션 커피입니다. 해발 1,980~2,250m에서 자란 에티오피아 토착종과 74110, 74112, 74158을 워시드로 가공했습니다. 자스민, 유자, 오렌지필, 살구의 라이트 로스트 싱글 오리진입니다.$mcw4649d0ba$,
  seo_description_en = $mcw4649d0ba$A washed single origin from Danicho Mukere's washing station in Hama, Kochere, Yirgacheffe. Ethiopian landraces with JARC 74110, 74112 and 74158, grown at 1,980~2,250 masl. Jasmine, yuzu, orange peel and apricot in a clean, tea-like light roast.$mcw4649d0ba$
 where id = '2ce2642e-58e7-4ab5-9cef-24366d59ea4b';
-- product house-200
update public.product set one_liner = $mcw4649d0ba$다크 로스트, 샘플, 소량용, 도매$mcw4649d0ba$,
  one_liner_en = $mcw4649d0ba$dark roast, sample/small-lot, wholesale$mcw4649d0ba$,
  story = $mcw4649d0ba$다크 초콜릿과 견과류의 구수한 단맛이 특징인 다크 로스트 하우스 블렌드입니다. 샘플 테스트, 소규모 메뉴 구성, 보조 재고가 필요한 사업자를 위한 사업자 전용 소량 포장입니다.$mcw4649d0ba$,
  story_en = $mcw4649d0ba$A dark-roast house blend of dark chocolate and roasty nutty sweetness, in a small-lot wholesale pack for sampling, small menus, or backup stock.$mcw4649d0ba$,
  body_html = $mcw4649d0ba$<section style="margin:0 0 18px;padding:28px 24px;border-radius:16px;background:#5E3F2A;color:#fff"><p style="margin:0;font-size:20px;font-weight:700;line-height:1.5">다크 로스트, 샘플, 소량용, 도매</p></section><section style="margin:0 0 18px"><h2 style="font-size:15px;margin:0 0 10px;color:#888;text-transform:uppercase;letter-spacing:1px">Flavour</h2><span style="display:inline-block;margin:0 6px 6px 0;padding:4px 12px;border-radius:999px;background:#5E3F2A1a;color:#5E3F2A;font-size:13px">다크 초콜릿</span><span style="display:inline-block;margin:0 6px 6px 0;padding:4px 12px;border-radius:999px;background:#5E3F2A1a;color:#5E3F2A;font-size:13px">견과류</span><span style="display:inline-block;margin:0 6px 6px 0;padding:4px 12px;border-radius:999px;background:#5E3F2A1a;color:#5E3F2A;font-size:13px">마일드 단맛</span></section><section style="margin:0 0 18px;padding:20px 22px;border-radius:16px;background:#5E3F2A0d"><h2 style="font-size:16px;margin:0 0 8px;border-left:4px solid #5E3F2A;padding-left:10px">커피 정보</h2><dl style="margin:0"><div style="display:flex;gap:16px;padding:10px 0;border-bottom:1px solid #00000010"><dt style="width:96px;flex:none;color:#888;font-size:14px">로스팅</dt><dd style="margin:0;font-size:15px">다크</dd></div><div style="display:flex;gap:16px;padding:10px 0;border-bottom:1px solid #00000010"><dt style="width:96px;flex:none;color:#888;font-size:14px">중량</dt><dd style="margin:0;font-size:15px">210g</dd></div></dl></section><section style="margin:0 0 4px;padding:18px 22px;border-radius:16px;background:#fafafa"><p style="margin:0;font-size:14px;color:#555">MTSPACE COFFEE는 자체 로스터리에서 직접 로스팅합니다. everyday excellence.</p></section>$mcw4649d0ba$,
  seo_title = $mcw4649d0ba$하우스 블렌드 200g (사업자 전용) 다크 초콜릿, 견과류, 마일드 단맛 | MTSPACE COFFEE$mcw4649d0ba$,
  seo_description = $mcw4649d0ba$다크 초콜릿과 견과류의 구수한 단맛이 특징인 다크 로스트 하우스 블렌드입니다. 샘플 테스트, 소규모 메뉴 구성, 보조 재고가 필요한 사업자를 위한 사업자 전용 소량 포장입니다.$mcw4649d0ba$,
  seo_description_en = $mcw4649d0ba$A dark-roast house blend of dark chocolate and roasty nutty sweetness, in a small-lot wholesale pack for sampling, small menus, or backup stock.$mcw4649d0ba$
 where id = 'edd5d60e-45a8-4ba3-9576-076cad8cb2eb';
-- product allrounder-125
update public.product set one_liner = $mcw4649d0ba$미디움 로스트, 올데이 밸런스 블렌드$mcw4649d0ba$,
  one_liner_en = $mcw4649d0ba$medium roast, all-day balanced blend$mcw4649d0ba$,
  story = $mcw4649d0ba$호주의 많은 카페에는 조금 특별한 포지션이 있습니다. 바로 ‘올라운더’입니다. 바리스타와 플로어 스태프가 명확히 구분되는 구조와 달리, 올라운더는 바리스타, 플로어, 때로는 키친까지 자유롭게 오가며 매장의 흐름을 부드럽게 이어주는 존재입니다. MTSPACE COFFEE의 올라운더 또한 그런 ‘올라운드 플레이어’처럼, 다양한 취향의 고객 니즈를 두루 만족시키는 커피를 목표로 만들어졌습니다. 모든 면에서 화려하지는 않아도 어디에나 잘 어울리며 늘 좋은 경험을 선사하는 커피 말입니다. 올라운더는 에스프레소부터 필터 브루잉, 밀크 베이스 커피까지 다양한 추출에서도 균형 잡힌 맛을 보여주도록 기획되었습니다. 미디엄 로스팅으로 단맛과 마우스필을 풍부하게 끌어올렸고, 베리류와 사과를 떠올리게 하는 정제된 산미가 특징입니다. 이 산미는 단독으로도, 밀크나 베리에이션 음료에서도 훌륭한 밸런스를 만들어 일상 어디에나 자연스럽게 스며듭니다. 사과와 베리류의 밝은 과일향을 중심으로 다크 초콜릿의 깊은 단맛이 은은하게 받쳐주어 부드럽고 리듬감 있는 한 잔을 완성합니다.$mcw4649d0ba$,
  story_en = $mcw4649d0ba$Many Australian cafés have a special role, the ‘allrounder’. Unlike a strict split between baristas and floor staff, the allrounder moves freely between bar, floor and even the kitchen, smoothing the flow of the whole shop. MTSPACE COFFEE's Allrounder is built the same way: a coffee meant to satisfy a wide range of tastes, not necessarily perfect, but always fitting in and always giving a good experience. It is designed to stay balanced across espresso, filter and milk-based drinks. Medium roasting lifts sweetness and mouthfeel, while a refined acidity reminiscent of berries and apple shines on its own and balances beautifully in milk. Bright apple-and-berry fruit is underpinned by the deep sweetness of dark chocolate for a smooth, rhythmic cup.$mcw4649d0ba$,
  body_html = $mcw4649d0ba$<section style="margin:0 0 18px;padding:28px 24px;border-radius:16px;background:#9A5E72;color:#fff"><p style="margin:0;font-size:20px;font-weight:700;line-height:1.5">미디움 로스트, 올데이 밸런스 블렌드</p></section><section style="margin:0 0 18px"><h2 style="font-size:15px;margin:0 0 10px;color:#888;text-transform:uppercase;letter-spacing:1px">Flavour</h2><span style="display:inline-block;margin:0 6px 6px 0;padding:4px 12px;border-radius:999px;background:#9A5E721a;color:#9A5E72;font-size:13px">베리</span><span style="display:inline-block;margin:0 6px 6px 0;padding:4px 12px;border-radius:999px;background:#9A5E721a;color:#9A5E72;font-size:13px">사과</span><span style="display:inline-block;margin:0 6px 6px 0;padding:4px 12px;border-radius:999px;background:#9A5E721a;color:#9A5E72;font-size:13px">다크 초콜릿</span></section><section style="margin:0 0 18px;padding:20px 22px;border-radius:16px;background:#9A5E720d"><h2 style="font-size:16px;margin:0 0 8px;border-left:4px solid #9A5E72;padding-left:10px">커피 정보</h2><dl style="margin:0"><div style="display:flex;gap:16px;padding:10px 0;border-bottom:1px solid #00000010"><dt style="width:96px;flex:none;color:#888;font-size:14px">로스팅</dt><dd style="margin:0;font-size:15px">미디움</dd></div><div style="display:flex;gap:16px;padding:10px 0;border-bottom:1px solid #00000010"><dt style="width:96px;flex:none;color:#888;font-size:14px">중량</dt><dd style="margin:0;font-size:15px">125g</dd></div></dl></section><section style="margin:0 0 4px;padding:18px 22px;border-radius:16px;background:#fafafa"><p style="margin:0;font-size:14px;color:#555">MTSPACE COFFEE는 자체 로스터리에서 직접 로스팅합니다. everyday excellence.</p></section>$mcw4649d0ba$,
  seo_title = $mcw4649d0ba$올라운더 베리류, 사과, 카카오, 아몬드 | MTSPACE COFFEE$mcw4649d0ba$,
  seo_description = $mcw4649d0ba$올라운더는 베리류, 사과, 카카오, 아몬드의 풍미가 조화를 이루는 균형 잡힌 미디움 로스트 시그니처 블렌드입니다. 시럽처럼 부드럽고 달콤하면서 과하지 않은 밸런스로, 블랙과 밀크 커피 모두에서 좋은 컵 퀄리티를 보여주는 활용도 높은 블렌드입니다.$mcw4649d0ba$,
  seo_description_en = $mcw4649d0ba$Allrounder is a balanced medium-roast signature blend of berries, apple, cacao and almond. Syrupy and sweet without excess, it works across black and milk coffee.$mcw4649d0ba$
 where id = 'd57259e6-95cd-4d77-9f1b-d60c1b300747';
-- product ezpz-125
update public.product set one_liner = $mcw4649d0ba$로우 카페인, 미디움 로스트 블렌드$mcw4649d0ba$,
  one_liner_en = $mcw4649d0ba$low-caffeine, medium roast blend$mcw4649d0ba$,
  story = $mcw4649d0ba$커피에서 카페인은 기능적으로 보면 필수적인 존재입니다. 우리는 커피로 활력을 얻고 기분을 환기하며 일과 공부에 더 몰입합니다. 하지만 바로 그 카페인 때문에 커피를 즐길 수 있는 시간에 한계가 생기기도 합니다. 오후 늦게 마시면 각성 상태가 이어져 숙면을 방해받는 사람도 많죠. 그래서 최근 디카페인, 로우카페인 커피에 대한 관심이 높아졌습니다. ‘이지피지(Easy Peasy)’는 호주에서 ‘정말 쉽다’, ‘아무것도 아니다’라는 의미로 쓰이는 표현입니다. MTSPACE COFFEE는 이 단어에 착안해, 언제든 부담 없이 쉽게 즐길 수 있는 커피를 만들고자 했습니다. 저녁 식사 후 가족, 친구와 둘러앉아 이지피지를 나누며 하루를 마무리하는 시간이 꽤 근사하지 않을까요. 우리는 카페인 함량은 낮추되 플레이버 경험은 더 깊고 풍성하게 설계했습니다. 그렇게 탄생한 이지피지는 부드러운 단맛과 풍성한 바디, 깔끔한 피니시를 자랑합니다. 카라멜과 견과류의 고소하고 달콤한 향미를 중심으로 은은한 시트러스가 부드럽게 이어져, 카페인 부담 없이도 진짜 커피의 즐거움을 온전히 누릴 수 있습니다.$mcw4649d0ba$,
  story_en = $mcw4649d0ba$Functionally, caffeine is almost essential to coffee, it gives us energy, resets our mood and helps us focus. But that same caffeine limits when we can enjoy a cup; drink it late and many of us stay wired and sleep poorly. Hence the growing interest in decaf and low-caffeine coffee. ‘Easy Peasy’ is an everyday Australian phrase meaning ‘really easy, nothing to it’. MTSPACE COFFEE took the idea and set out to make a coffee you can enjoy anytime without a second thought, the kind you share with family and friends after dinner to close the day. We lowered the caffeine while making the flavour experience deeper and richer. The result keeps a soft sweetness, full body and clean finish: nutty-sweet caramel and nuts lead, with a gentle citrus lift, so you get the full pleasure of real coffee without the caffeine load.$mcw4649d0ba$,
  body_html = $mcw4649d0ba$<section style="margin:0 0 18px;padding:28px 24px;border-radius:16px;background:#BC8E36;color:#fff"><p style="margin:0;font-size:20px;font-weight:700;line-height:1.5">로우 카페인, 미디움 로스트 블렌드</p></section><section style="margin:0 0 18px"><h2 style="font-size:15px;margin:0 0 10px;color:#888;text-transform:uppercase;letter-spacing:1px">Flavour</h2><span style="display:inline-block;margin:0 6px 6px 0;padding:4px 12px;border-radius:999px;background:#BC8E361a;color:#BC8E36;font-size:13px">카라멜</span><span style="display:inline-block;margin:0 6px 6px 0;padding:4px 12px;border-radius:999px;background:#BC8E361a;color:#BC8E36;font-size:13px">견과류</span><span style="display:inline-block;margin:0 6px 6px 0;padding:4px 12px;border-radius:999px;background:#BC8E361a;color:#BC8E36;font-size:13px">시트러스</span></section><section style="margin:0 0 18px;padding:20px 22px;border-radius:16px;background:#BC8E360d"><h2 style="font-size:16px;margin:0 0 8px;border-left:4px solid #BC8E36;padding-left:10px">커피 정보</h2><dl style="margin:0"><div style="display:flex;gap:16px;padding:10px 0;border-bottom:1px solid #00000010"><dt style="width:96px;flex:none;color:#888;font-size:14px">로스팅</dt><dd style="margin:0;font-size:15px">미디움</dd></div><div style="display:flex;gap:16px;padding:10px 0;border-bottom:1px solid #00000010"><dt style="width:96px;flex:none;color:#888;font-size:14px">중량</dt><dd style="margin:0;font-size:15px">125g</dd></div></dl></section><section style="margin:0 0 4px;padding:18px 22px;border-radius:16px;background:#fafafa"><p style="margin:0;font-size:14px;color:#555">MTSPACE COFFEE는 자체 로스터리에서 직접 로스팅합니다. everyday excellence.</p></section>$mcw4649d0ba$,
  seo_title = $mcw4649d0ba$이지피지 카라멜, 견과류, 시트러스 | MTSPACE COFFEE$mcw4649d0ba$,
  seo_description_en = $mcw4649d0ba$EZPZ is a light, easygoing low-caffeine blend. Smooth caramel sweetness and nutty balance are finished with a gentle citrus lift, an easy cup for lat$mcw4649d0ba$
 where id = '5aa1c9bb-e7d1-4ed4-b911-bf6c88dc0339';
-- product ezpz-1000
update public.product set one_liner = $mcw4649d0ba$로우 카페인, 미디움 로스트, 도매$mcw4649d0ba$,
  one_liner_en = $mcw4649d0ba$low-caffeine, medium roast, wholesale$mcw4649d0ba$,
  story = $mcw4649d0ba$커피에서 카페인은 기능적으로 보면 필수적인 존재입니다. 우리는 커피로 활력을 얻고 기분을 환기하며 일과 공부에 더 몰입합니다. 하지만 바로 그 카페인 때문에 커피를 즐길 수 있는 시간에 한계가 생기기도 합니다. 오후 늦게 마시면 각성 상태가 이어져 숙면을 방해받는 사람도 많죠. 그래서 최근 디카페인, 로우카페인 커피에 대한 관심이 높아졌습니다. ‘이지피지(Easy Peasy)’는 호주에서 ‘정말 쉽다’, ‘아무것도 아니다’라는 의미로 쓰이는 표현입니다. MTSPACE COFFEE는 이 단어에 착안해, 언제든 부담 없이 쉽게 즐길 수 있는 커피를 만들고자 했습니다. 저녁 식사 후 가족, 친구와 둘러앉아 이지피지를 나누며 하루를 마무리하는 시간이 꽤 근사하지 않을까요. 우리는 카페인 함량은 낮추되 플레이버 경험은 더 깊고 풍성하게 설계했습니다. 그렇게 탄생한 이지피지는 부드러운 단맛과 풍성한 바디, 깔끔한 피니시를 자랑합니다. 카라멜과 견과류의 고소하고 달콤한 향미를 중심으로 은은한 시트러스가 부드럽게 이어져, 카페인 부담 없이도 진짜 커피의 즐거움을 온전히 누릴 수 있습니다.$mcw4649d0ba$,
  story_en = $mcw4649d0ba$Functionally, caffeine is almost essential to coffee, it gives us energy, resets our mood and helps us focus. But that same caffeine limits when we can enjoy a cup; drink it late and many of us stay wired and sleep poorly. Hence the growing interest in decaf and low-caffeine coffee. ‘Easy Peasy’ is an everyday Australian phrase meaning ‘really easy, nothing to it’. MTSPACE COFFEE took the idea and set out to make a coffee you can enjoy anytime without a second thought, the kind you share with family and friends after dinner to close the day. We lowered the caffeine while making the flavour experience deeper and richer. The result keeps a soft sweetness, full body and clean finish: nutty-sweet caramel and nuts lead, with a gentle citrus lift, so you get the full pleasure of real coffee without the caffeine load.$mcw4649d0ba$,
  body_html = $mcw4649d0ba$<section style="margin:0 0 18px;padding:28px 24px;border-radius:16px;background:#BC8E36;color:#fff"><p style="margin:0;font-size:20px;font-weight:700;line-height:1.5">로우 카페인, 미디움 로스트, 도매</p></section><section style="margin:0 0 18px"><h2 style="font-size:15px;margin:0 0 10px;color:#888;text-transform:uppercase;letter-spacing:1px">Flavour</h2><span style="display:inline-block;margin:0 6px 6px 0;padding:4px 12px;border-radius:999px;background:#BC8E361a;color:#BC8E36;font-size:13px">카라멜</span><span style="display:inline-block;margin:0 6px 6px 0;padding:4px 12px;border-radius:999px;background:#BC8E361a;color:#BC8E36;font-size:13px">견과류</span><span style="display:inline-block;margin:0 6px 6px 0;padding:4px 12px;border-radius:999px;background:#BC8E361a;color:#BC8E36;font-size:13px">시트러스</span></section><section style="margin:0 0 18px;padding:20px 22px;border-radius:16px;background:#BC8E360d"><h2 style="font-size:16px;margin:0 0 8px;border-left:4px solid #BC8E36;padding-left:10px">커피 정보</h2><dl style="margin:0"><div style="display:flex;gap:16px;padding:10px 0;border-bottom:1px solid #00000010"><dt style="width:96px;flex:none;color:#888;font-size:14px">로스팅</dt><dd style="margin:0;font-size:15px">미디움</dd></div><div style="display:flex;gap:16px;padding:10px 0;border-bottom:1px solid #00000010"><dt style="width:96px;flex:none;color:#888;font-size:14px">중량</dt><dd style="margin:0;font-size:15px">1010g</dd></div></dl></section><section style="margin:0 0 4px;padding:18px 22px;border-radius:16px;background:#fafafa"><p style="margin:0;font-size:14px;color:#555">MTSPACE COFFEE는 자체 로스터리에서 직접 로스팅합니다. everyday excellence.</p></section>$mcw4649d0ba$,
  seo_title = $mcw4649d0ba$이지피지 1kg (사업자 전용) 카라멜, 견과류, 시트러스 | MTSPACE COFFEE$mcw4649d0ba$,
  seo_description = $mcw4649d0ba$카라멜, 견과류, 시트러스가 균형을 이루는 로우 카페인 미디움 로스트 블렌드입니다. 디카페인 원두를 섞어 카페인을 낮춘 블렌드로, 카페인을 줄인 메뉴를 운영하거나 카페인 민감 고객을 위한 옵션을 마련하려는 카페에 추천하는 사업자 전용 블렌드입니다.$mcw4649d0ba$,
  seo_description_en = $mcw4649d0ba$A low-caffeine medium roast balancing caramel, nuts and citrus, blended with decaf beans. A wholesale option for cafés offering a lighter-caffeine menu without going fully decaf.$mcw4649d0ba$
 where id = '0d401c7b-d5c1-4589-adbd-97be613a4db1';
-- product damn-good-125
update public.product set story = $mcw4649d0ba$댐굳은 2016년, MTSPACE COFFEE의 전신인 호주 놈코어 커피 시절에 탄생한 블렌드입니다. 다양한 소비자층을 대상으로 수개월에 걸쳐 원료 선정, 로스팅 프로파일 설계, 추출 레시피 개발을 반복하며 치밀한 연구와 테스트를 거쳤습니다. 또한 여러 지역과 환경에서 필드 테스트를 진행해, 통계적으로 가장 안정적이고 일관된 품질과 맛을 제공할 수 있도록 완성된 스테디셀러입니다. MTSPACE COFFEE로 브랜드가 전환되면서, 댐굳은 더 뛰어난 원료를 바탕으로 더욱 정교하게 다듬어진 로스팅 프로파일을 적용해 리뉴얼되었습니다. 기존의 캐릭터는 그대로 유지하면서도 추출 안정성이 크게 향상되었고, 플레이버 또한 더욱 선명하고 명확하게 표현됩니다. 이 과정을 통해 댐굳은 브랜드를 대표하는 블렌드로 자리 잡았으며, 오랜 시간 꾸준히 사랑받고 있습니다. 댐굳은 묵직한 바디와 고소한 뉘앙스를 기본으로, 다크 초콜릿, 자두, 바닐라의 복합적인 풍미를 섬세하게 전달합니다. 블랙 커피로 마시면 진한 여운과 깊이를, 밀크 베이스로 즐기면 부드럽고 풍성한 단맛을 느낄 수 있어, 다방면으로 훌륭한 퍼포먼스를 보여주는 MTSPACE COFFEE의 대표 블렌드입니다.$mcw4649d0ba$,
  story_en = $mcw4649d0ba$Damn Good was born in 2016 during the Australian Normcore Coffee era, MTSPACE COFFEE's predecessor. Over several months it was refined through repeated green-bean selection, roast-profile design and recipe development, then field-tested across many settings to deliver statistically consistent quality, a true steady-seller. With the shift to MTSPACE COFFEE it was renewed on better greens and a more precise roast profile: the character is unchanged but extraction stability is far higher and flavours read more clearly. Built on a heavy body and nutty nuance, Damn Good delivers a layered profile of dark chocolate, plum and vanilla, deep and lingering as black coffee, soft and richly sweet in milk. It is MTSPACE COFFEE's flagship blend.$mcw4649d0ba$,
  body_html = $mcw4649d0ba$<section style="margin:0 0 18px;padding:28px 24px;border-radius:16px;background:#5D155C;color:#fff"><p style="margin:0;font-size:20px;font-weight:700;line-height:1.5">다크 시그니쳐 블렌드, 홈브루</p></section>
<section style="margin:0 0 18px"><h2 style="font-size:15px;margin:0 0 10px;color:#888;text-transform:uppercase;letter-spacing:1px">Flavour</h2><span style="display:inline-block;margin:0 6px 6px 0;padding:4px 12px;border-radius:999px;background:#5D155C1a;color:#5D155C;font-size:13px">다크 초콜릿</span><span style="display:inline-block;margin:0 6px 6px 0;padding:4px 12px;border-radius:999px;background:#5D155C1a;color:#5D155C;font-size:13px">자두</span><span style="display:inline-block;margin:0 6px 6px 0;padding:4px 12px;border-radius:999px;background:#5D155C1a;color:#5D155C;font-size:13px">카라멜</span></section>
<section style="margin:0 0 18px;padding:20px 22px;border-radius:16px;background:#5D155C0d"><h2 style="font-size:16px;margin:0 0 8px;border-left:4px solid #5D155C;padding-left:10px">커피 정보</h2><dl style="margin:0"><div style="display:flex;gap:16px;padding:10px 0;border-bottom:1px solid #00000010"><dt style="width:96px;flex:none;color:#888;font-size:14px">로스팅</dt><dd style="margin:0;font-size:15px">다크</dd></div><div style="display:flex;gap:16px;padding:10px 0;border-bottom:1px solid #00000010"><dt style="width:96px;flex:none;color:#888;font-size:14px">중량</dt><dd style="margin:0;font-size:15px">125g</dd></div></dl></section>
<section style="margin:0 0 4px;padding:18px 22px;border-radius:16px;background:#fafafa"><p style="margin:0;font-size:14px;color:#555">MTSPACE COFFEE는 자체 로스터리에서 직접 로스팅합니다. everyday excellence.</p></section>$mcw4649d0ba$
 where id = 'ae4acbf1-58f9-4823-a255-0b98ae8d1d14';
-- product spotlight-125
update public.product set one_liner = $mcw4649d0ba$라이트 로스트, 프루티 시그니처 블렌드$mcw4649d0ba$,
  one_liner_en = $mcw4649d0ba$light roast, fruity signature blend$mcw4649d0ba$,
  story = $mcw4649d0ba$스페셜티 커피 블렌드를 떠올리면 가장 먼저 밝고 화사한 과일향과 경쾌한 산미가 그려집니다. 그래서 많은 로스터가 라이트 블렌드를 만들 때 어떤 프루티함을 표현할지, 추출과 음용 시 어떤 인상을 줄지 깊이 고민합니다. MTSPACE COFFEE가 생각하는 이상적인 스페셜티 블렌드는 화려한 과일향에 그치지 않습니다. 라이트 로스팅 특유의 밝은 향미는 살리되, 미디움, 다크 블렌드처럼 추출 안정성과 플레이버의 조화를 함께 갖춰 누구나 어렵지 않게 퀄리티 있는 한 잔을 뽑을 수 있어야 한다고 믿었습니다. 스팟라이트는 이 기준을 충족하기 위해 다양한 원료, 배합비, 로스팅 프로파일을 세심하게 테스트하며 탄생한 블렌드입니다. 귤과 자몽, 은은한 적포도와 살구를 연상시키는 향미를 섬세하게 품어, 경쾌한 산미와 섬세한 단맛이 어우러져 입안 가득 생기를 전합니다. 깨끗하고 가벼운 바디감 덕분에 첫 모금부터 끝까지 맑고 산뜻해, 하루를 기분 좋게 시작하거나 환기시키기에 잘 어울리는 커피입니다.$mcw4649d0ba$,
  story_en = $mcw4649d0ba$Say ‘specialty blend’ and most people picture bright, vivid fruit and lively acidity. That's why roasters agonise over which fruitiness to express in a light blend and how it will feel in the cup. MTSPACE COFFEE believes an ideal specialty blend is more than showy fruit: it should keep the brightness of a light roast while matching the extraction stability and balance of medium or dark blends, so anyone can pull a quality cup with ease. Spotlight was created through careful testing of greens, ratios and roast profiles to meet that standard. It carries delicate notes of tangerine and grapefruit with subtle red grape and apricot; lively acidity and fine sweetness fill the palate with energy. A clean, light body keeps it crisp from first sip to last, perfect for a bright start or a refreshing reset.$mcw4649d0ba$,
  body_html = $mcw4649d0ba$<section style="margin:0 0 18px;padding:28px 24px;border-radius:16px;background:#B27488;color:#fff"><p style="margin:0;font-size:20px;font-weight:700;line-height:1.5">라이트 로스트, 프루티 시그니처 블렌드</p></section><section style="margin:0 0 18px"><h2 style="font-size:15px;margin:0 0 10px;color:#888;text-transform:uppercase;letter-spacing:1px">Flavour</h2><span style="display:inline-block;margin:0 6px 6px 0;padding:4px 12px;border-radius:999px;background:#B274881a;color:#B27488;font-size:13px">산딸기</span><span style="display:inline-block;margin:0 6px 6px 0;padding:4px 12px;border-radius:999px;background:#B274881a;color:#B27488;font-size:13px">적포도</span><span style="display:inline-block;margin:0 6px 6px 0;padding:4px 12px;border-radius:999px;background:#B274881a;color:#B27488;font-size:13px">자연 단맛</span></section><section style="margin:0 0 18px;padding:20px 22px;border-radius:16px;background:#B274880d"><h2 style="font-size:16px;margin:0 0 8px;border-left:4px solid #B27488;padding-left:10px">커피 정보</h2><dl style="margin:0"><div style="display:flex;gap:16px;padding:10px 0;border-bottom:1px solid #00000010"><dt style="width:96px;flex:none;color:#888;font-size:14px">로스팅</dt><dd style="margin:0;font-size:15px">라이트</dd></div><div style="display:flex;gap:16px;padding:10px 0;border-bottom:1px solid #00000010"><dt style="width:96px;flex:none;color:#888;font-size:14px">중량</dt><dd style="margin:0;font-size:15px">125g</dd></div></dl></section><section style="margin:0 0 4px;padding:18px 22px;border-radius:16px;background:#fafafa"><p style="margin:0;font-size:14px;color:#555">MTSPACE COFFEE는 자체 로스터리에서 직접 로스팅합니다. everyday excellence.</p></section>$mcw4649d0ba$,
  seo_title = $mcw4649d0ba$스팟라이트 귤, 자몽, 적포도, 살구 | MTSPACE COFFEE$mcw4649d0ba$,
  seo_description = $mcw4649d0ba$스팟라이트는 귤, 자몽, 적포도, 살구의 깔끔한 과일 노트를 중심으로 디자인된 시그니처 라이트 로스트 블렌드입니다. 정밀한 라이트 로스팅으로 산지의 자연스러운 단맛과 가벼운 산미를 그대로 담아, 상쾌하게 시작하는 하루의 한 잔에 잘 어울립니다.$mcw4649d0ba$,
  seo_description_en = $mcw4649d0ba$Spotlight is a signature light-roast blend built around clean fruit notes of tangerine, grapefruit, red grape and apricot, with natural sweetness and light acidity.$mcw4649d0ba$
 where id = '4aefd5eb-9d52-4a2e-8f2b-0cd65d8b8e55';
-- product classic-1000
update public.product set one_liner = $mcw4649d0ba$미디움 로스트, 클래식 블렌드, 도매$mcw4649d0ba$,
  one_liner_en = $mcw4649d0ba$medium roast, classic blend, wholesale$mcw4649d0ba$,
  story = $mcw4649d0ba$클래식 블렌드는 커피의 가장 기본에 충실한 프로파일을 구현하는 미디움 로스트 블렌드입니다. 초콜릿의 단맛, 견과류의 고소함, 은은한 과일의 명료함이 균형을 이루며, 모든 메뉴에 잘 어울리는 안정적인 프로파일의 사업자 전용 블렌드입니다.$mcw4649d0ba$,
  story_en = $mcw4649d0ba$Classic Blend is a medium roast true to coffee's fundamentals, chocolate sweetness, nutty warmth, and subtle fruit clarity in balance. A dependable wholesale profile that suits every menu.$mcw4649d0ba$,
  body_html = $mcw4649d0ba$<section style="margin:0 0 18px;padding:28px 24px;border-radius:16px;background:#8B5E3C;color:#fff"><p style="margin:0;font-size:20px;font-weight:700;line-height:1.5">미디움 로스트, 클래식 블렌드, 도매</p></section><section style="margin:0 0 18px"><h2 style="font-size:15px;margin:0 0 10px;color:#888;text-transform:uppercase;letter-spacing:1px">Flavour</h2><span style="display:inline-block;margin:0 6px 6px 0;padding:4px 12px;border-radius:999px;background:#8B5E3C1a;color:#8B5E3C;font-size:13px">초콜릿</span><span style="display:inline-block;margin:0 6px 6px 0;padding:4px 12px;border-radius:999px;background:#8B5E3C1a;color:#8B5E3C;font-size:13px">견과류</span><span style="display:inline-block;margin:0 6px 6px 0;padding:4px 12px;border-radius:999px;background:#8B5E3C1a;color:#8B5E3C;font-size:13px">은은한 과일</span></section><section style="margin:0 0 18px;padding:20px 22px;border-radius:16px;background:#8B5E3C0d"><h2 style="font-size:16px;margin:0 0 8px;border-left:4px solid #8B5E3C;padding-left:10px">커피 정보</h2><dl style="margin:0"><div style="display:flex;gap:16px;padding:10px 0;border-bottom:1px solid #00000010"><dt style="width:96px;flex:none;color:#888;font-size:14px">로스팅</dt><dd style="margin:0;font-size:15px">미디움</dd></div><div style="display:flex;gap:16px;padding:10px 0;border-bottom:1px solid #00000010"><dt style="width:96px;flex:none;color:#888;font-size:14px">중량</dt><dd style="margin:0;font-size:15px">1010g</dd></div></dl></section><section style="margin:0 0 4px;padding:18px 22px;border-radius:16px;background:#fafafa"><p style="margin:0;font-size:14px;color:#555">MTSPACE COFFEE는 자체 로스터리에서 직접 로스팅합니다. everyday excellence.</p></section>$mcw4649d0ba$,
  seo_title = $mcw4649d0ba$클래식 블렌드 1kg (사업자 전용) 초콜릿, 견과류, 은은한 과일 | MTSPACE COFFEE$mcw4649d0ba$,
  seo_description = $mcw4649d0ba$클래식 블렌드는 커피의 가장 기본에 충실한 프로파일을 구현하는 미디움 로스트 블렌드입니다. 초콜릿의 단맛, 견과류의 고소함, 은은한 과일의 명료함이 균형을 이루며, 모든 메뉴에 잘 어울리는 안정적인 프로파일의 사업자 전용 블렌드입니다.$mcw4649d0ba$,
  seo_description_en = $mcw4649d0ba$Classic Blend is a medium roast true to coffee's fundamentals, chocolate sweetness, nutty warmth, and subtle fruit clarity in balance. A dependable 1$mcw4649d0ba$
 where id = 'c0c58994-9031-4809-91de-be1791c8c0b8';
-- product house-1000
update public.product set one_liner = $mcw4649d0ba$다크 로스트, 하우스 블렌드, 도매$mcw4649d0ba$,
  one_liner_en = $mcw4649d0ba$dark roast, house blend, wholesale$mcw4649d0ba$,
  story = $mcw4649d0ba$하우스 블렌드는 MTSPACE COFFEE가 매장 운영을 위해 설계한 기준 블렌드입니다. 다크 초콜릿과 고소한 견과류의 풍미가 바디 있게 떨어지며, 한국인이 선호하는 구수한 단맛과 안정적인 컵 퀄리티가 특징인, 매일의 아메리카노, 밀크 메뉴 운영을 위한 사업자 전용 블렌드입니다.$mcw4649d0ba$,
  story_en = $mcw4649d0ba$House Blend is the baseline MTSPACE COFFEE designed for daily service, dark chocolate and nutty depth with the roasty sweetness Korean palates favor. A dependable wholesale blend for everyday americano and milk menus.$mcw4649d0ba$,
  body_html = $mcw4649d0ba$<section style="margin:0 0 18px;padding:28px 24px;border-radius:16px;background:#5E3F2A;color:#fff"><p style="margin:0;font-size:20px;font-weight:700;line-height:1.5">다크 로스트, 하우스 블렌드, 도매</p></section><section style="margin:0 0 18px"><h2 style="font-size:15px;margin:0 0 10px;color:#888;text-transform:uppercase;letter-spacing:1px">Flavour</h2><span style="display:inline-block;margin:0 6px 6px 0;padding:4px 12px;border-radius:999px;background:#5E3F2A1a;color:#5E3F2A;font-size:13px">다크 초콜릿</span><span style="display:inline-block;margin:0 6px 6px 0;padding:4px 12px;border-radius:999px;background:#5E3F2A1a;color:#5E3F2A;font-size:13px">견과류</span><span style="display:inline-block;margin:0 6px 6px 0;padding:4px 12px;border-radius:999px;background:#5E3F2A1a;color:#5E3F2A;font-size:13px">마일드 단맛</span></section><section style="margin:0 0 18px;padding:20px 22px;border-radius:16px;background:#5E3F2A0d"><h2 style="font-size:16px;margin:0 0 8px;border-left:4px solid #5E3F2A;padding-left:10px">커피 정보</h2><dl style="margin:0"><div style="display:flex;gap:16px;padding:10px 0;border-bottom:1px solid #00000010"><dt style="width:96px;flex:none;color:#888;font-size:14px">로스팅</dt><dd style="margin:0;font-size:15px">다크</dd></div><div style="display:flex;gap:16px;padding:10px 0;border-bottom:1px solid #00000010"><dt style="width:96px;flex:none;color:#888;font-size:14px">중량</dt><dd style="margin:0;font-size:15px">1010g</dd></div></dl></section><section style="margin:0 0 4px;padding:18px 22px;border-radius:16px;background:#fafafa"><p style="margin:0;font-size:14px;color:#555">MTSPACE COFFEE는 자체 로스터리에서 직접 로스팅합니다. everyday excellence.</p></section>$mcw4649d0ba$,
  seo_title = $mcw4649d0ba$하우스 블렌드 1kg (사업자 전용) 다크 초콜릿, 견과류, 마일드 단맛 | MTSPACE COFFEE$mcw4649d0ba$,
  seo_description = $mcw4649d0ba$하우스 블렌드는 MTSPACE COFFEE가 매장 운영을 위해 설계한 기준 블렌드입니다. 다크 초콜릿과 고소한 견과류의 풍미가 바디 있게 떨어지며, 한국인이 선호하는 구수한 단맛과 안정적인 컵 퀄리티가 특징인, 매일의 아메리카노, 밀크 메뉴 운영을 위한 사업자 전용 1k$mcw4649d0ba$,
  seo_description_en = $mcw4649d0ba$House Blend is the baseline MTSPACE COFFEE designed for daily service, dark chocolate and nutty depth with the roasty sweetness Korean palates favor.$mcw4649d0ba$
 where id = '7c98d916-13c8-452c-8d30-e8fc11c9c004';
-- product classic-200
update public.product set one_liner = $mcw4649d0ba$미디움 로스트, 샘플, 소량용, 도매$mcw4649d0ba$,
  one_liner_en = $mcw4649d0ba$medium roast, sample/small-lot, wholesale$mcw4649d0ba$,
  story = $mcw4649d0ba$초콜릿, 견과류, 은은한 과일이 균형을 이루는 미디움 로스트 클래식 블렌드입니다. 사업 관계자 샘플 테스트, 소규모 메뉴 구성, 보조 재고가 필요한 운영자를 위한 사업자 전용 소량 포장입니다.$mcw4649d0ba$,
  story_en = $mcw4649d0ba$A medium-roast classic balancing chocolate, nuts, and subtle fruit, in a small-lot wholesale pack for sampling, small menus, or backup stock.$mcw4649d0ba$,
  body_html = $mcw4649d0ba$<section style="margin:0 0 18px;padding:28px 24px;border-radius:16px;background:#8B5E3C;color:#fff"><p style="margin:0;font-size:20px;font-weight:700;line-height:1.5">미디움 로스트, 샘플, 소량용, 도매</p></section><section style="margin:0 0 18px"><h2 style="font-size:15px;margin:0 0 10px;color:#888;text-transform:uppercase;letter-spacing:1px">Flavour</h2><span style="display:inline-block;margin:0 6px 6px 0;padding:4px 12px;border-radius:999px;background:#8B5E3C1a;color:#8B5E3C;font-size:13px">초콜릿</span><span style="display:inline-block;margin:0 6px 6px 0;padding:4px 12px;border-radius:999px;background:#8B5E3C1a;color:#8B5E3C;font-size:13px">견과류</span><span style="display:inline-block;margin:0 6px 6px 0;padding:4px 12px;border-radius:999px;background:#8B5E3C1a;color:#8B5E3C;font-size:13px">은은한 과일</span></section><section style="margin:0 0 18px;padding:20px 22px;border-radius:16px;background:#8B5E3C0d"><h2 style="font-size:16px;margin:0 0 8px;border-left:4px solid #8B5E3C;padding-left:10px">커피 정보</h2><dl style="margin:0"><div style="display:flex;gap:16px;padding:10px 0;border-bottom:1px solid #00000010"><dt style="width:96px;flex:none;color:#888;font-size:14px">로스팅</dt><dd style="margin:0;font-size:15px">미디움</dd></div><div style="display:flex;gap:16px;padding:10px 0;border-bottom:1px solid #00000010"><dt style="width:96px;flex:none;color:#888;font-size:14px">중량</dt><dd style="margin:0;font-size:15px">210g</dd></div></dl></section><section style="margin:0 0 4px;padding:18px 22px;border-radius:16px;background:#fafafa"><p style="margin:0;font-size:14px;color:#555">MTSPACE COFFEE는 자체 로스터리에서 직접 로스팅합니다. everyday excellence.</p></section>$mcw4649d0ba$,
  seo_title = $mcw4649d0ba$클래식 블렌드 200g (사업자 전용) 초콜릿, 견과류, 은은한 과일 | MTSPACE COFFEE$mcw4649d0ba$,
  seo_description = $mcw4649d0ba$초콜릿, 견과류, 은은한 과일이 균형을 이루는 미디움 로스트 클래식 블렌드입니다. 사업 관계자 샘플 테스트, 소규모 메뉴 구성, 보조 재고가 필요한 운영자를 위한 사업자 전용 소량 포장입니다.$mcw4649d0ba$,
  seo_description_en = $mcw4649d0ba$A medium-roast classic balancing chocolate, nuts, and subtle fruit, in a small-lot wholesale pack for sampling, small menus, or backup stock.$mcw4649d0ba$
 where id = 'ff97d592-1a1d-4f35-bcfd-f9dc348d408f';
-- product spotlight-1000
update public.product set one_liner = $mcw4649d0ba$라이트 로스트, 프루티 블렌드, 도매$mcw4649d0ba$,
  one_liner_en = $mcw4649d0ba$light roast, fruity blend, wholesale$mcw4649d0ba$,
  story = $mcw4649d0ba$스페셜티 커피 블렌드를 떠올리면 가장 먼저 밝고 화사한 과일향과 경쾌한 산미가 그려집니다. 그래서 많은 로스터가 라이트 블렌드를 만들 때 어떤 프루티함을 표현할지, 추출과 음용 시 어떤 인상을 줄지 깊이 고민합니다. MTSPACE COFFEE가 생각하는 이상적인 스페셜티 블렌드는 화려한 과일향에 그치지 않습니다. 라이트 로스팅 특유의 밝은 향미는 살리되, 미디움, 다크 블렌드처럼 추출 안정성과 플레이버의 조화를 함께 갖춰 누구나 어렵지 않게 퀄리티 있는 한 잔을 뽑을 수 있어야 한다고 믿었습니다. 스팟라이트는 이 기준을 충족하기 위해 다양한 원료, 배합비, 로스팅 프로파일을 세심하게 테스트하며 탄생한 블렌드입니다. 귤과 자몽, 은은한 적포도와 살구를 연상시키는 향미를 섬세하게 품어, 경쾌한 산미와 섬세한 단맛이 어우러져 입안 가득 생기를 전합니다. 깨끗하고 가벼운 바디감 덕분에 첫 모금부터 끝까지 맑고 산뜻해, 하루를 기분 좋게 시작하거나 환기시키기에 잘 어울리는 커피입니다.$mcw4649d0ba$,
  story_en = $mcw4649d0ba$Say ‘specialty blend’ and most people picture bright, vivid fruit and lively acidity. That's why roasters agonise over which fruitiness to express in a light blend and how it will feel in the cup. MTSPACE COFFEE believes an ideal specialty blend is more than showy fruit: it should keep the brightness of a light roast while matching the extraction stability and balance of medium or dark blends, so anyone can pull a quality cup with ease. Spotlight was created through careful testing of greens, ratios and roast profiles to meet that standard. It carries delicate notes of tangerine and grapefruit with subtle red grape and apricot; lively acidity and fine sweetness fill the palate with energy. A clean, light body keeps it crisp from first sip to last, perfect for a bright start or a refreshing reset.$mcw4649d0ba$,
  body_html = $mcw4649d0ba$<section style="margin:0 0 18px;padding:28px 24px;border-radius:16px;background:#B27488;color:#fff"><p style="margin:0;font-size:20px;font-weight:700;line-height:1.5">라이트 로스트, 프루티 블렌드, 도매</p></section><section style="margin:0 0 18px"><h2 style="font-size:15px;margin:0 0 10px;color:#888;text-transform:uppercase;letter-spacing:1px">Flavour</h2><span style="display:inline-block;margin:0 6px 6px 0;padding:4px 12px;border-radius:999px;background:#B274881a;color:#B27488;font-size:13px">산딸기</span><span style="display:inline-block;margin:0 6px 6px 0;padding:4px 12px;border-radius:999px;background:#B274881a;color:#B27488;font-size:13px">적포도</span><span style="display:inline-block;margin:0 6px 6px 0;padding:4px 12px;border-radius:999px;background:#B274881a;color:#B27488;font-size:13px">자연 단맛</span></section><section style="margin:0 0 18px;padding:20px 22px;border-radius:16px;background:#B274880d"><h2 style="font-size:16px;margin:0 0 8px;border-left:4px solid #B27488;padding-left:10px">커피 정보</h2><dl style="margin:0"><div style="display:flex;gap:16px;padding:10px 0;border-bottom:1px solid #00000010"><dt style="width:96px;flex:none;color:#888;font-size:14px">로스팅</dt><dd style="margin:0;font-size:15px">라이트</dd></div><div style="display:flex;gap:16px;padding:10px 0;border-bottom:1px solid #00000010"><dt style="width:96px;flex:none;color:#888;font-size:14px">중량</dt><dd style="margin:0;font-size:15px">1010g</dd></div></dl></section><section style="margin:0 0 4px;padding:18px 22px;border-radius:16px;background:#fafafa"><p style="margin:0;font-size:14px;color:#555">MTSPACE COFFEE는 자체 로스터리에서 직접 로스팅합니다. everyday excellence.</p></section>$mcw4649d0ba$,
  seo_title = $mcw4649d0ba$스팟라이트 1kg (사업자 전용) 귤, 자몽, 적포도, 살구 | MTSPACE COFFEE$mcw4649d0ba$,
  seo_description = $mcw4649d0ba$스팟라이트는 귤, 자몽, 적포도, 살구의 깔끔한 과일 노트를 중심으로 디자인된 시그니처 라이트 로스트 블렌드입니다. 안정적인 품질 유지가 중요한 카페 운영에 맞춘 사업자 전용 포장입니다.$mcw4649d0ba$,
  seo_description_en = $mcw4649d0ba$Spotlight is a signature light-roast blend centered on clean fruit notes of tangerine, grapefruit, red grape and apricot, in a wholesale format for cafés that need steady quality.$mcw4649d0ba$
 where id = '9043a904-2efa-469e-bd59-612930313679';
-- 케냐 무가야 AA 고도: 블로그 기준 1,700~1,800m (대표 2026-11-13)
update public.product set altitude = '1,700~1,800m', altitude_en = '1,700~1,800 masl' where slug = 'kenya-mugaya-aa-washed-125';
update public.kb_entry set definition = replace(definition, '고도 [확인 필요: 상품 데이터 ~2,300m, 블로그 1,700~1,800m]', '1,700~1,800m') where position = 2026;
-- 확인
select 'post' k, count(*) filter (where body_html ~ '[—·]' or title ~ '[—·]') punct, count(*) filter (where body_html ~ '(월|화)[,·] ?(화|수) ?(로스팅|출고)') fresh from public.content_post where status = 'published' union all select 'product', count(*) filter (where coalesce(story,'') || coalesce(one_liner,'') ~ '[—·]'), count(*) filter (where coalesce(seo_description,'') ~ '(월|화)[,·] ?(화|수)') from public.product where status = 'active';
-- 롤백: update public.content_post c set title=b.title, excerpt=b.excerpt, body_html=b.body_html, seo_title=b.seo_title, seo_description=b.seo_description from public.content_post_bak_20261113 b where b.id=c.id;
--       update public.product p set one_liner=b.one_liner, one_liner_en=b.one_liner_en, story=b.story, story_en=b.story_en, body_html=b.body_html, seo_title=b.seo_title, seo_description=b.seo_description, seo_title_en=b.seo_title_en, seo_description_en=b.seo_description_en, altitude=b.altitude, altitude_en=b.altitude_en from public.product_bak_20261113 b where b.id=p.id;
