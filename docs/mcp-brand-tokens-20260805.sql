-- =====================================================================
-- MTSPACE COMMERCE MCP — 브랜드 규범 시딩 (2026-08-05)
--
-- 배경
--   commerce_get_brand_tokens 가 반환하던 값은 브랜드 규범이 아니라
--   스튜디오 레이아웃 설정(blog_layout·detail_section_order 등)뿐이었고
--   rules 는 빈 배열이었다(2026-08-02 실측). 이 상태에서 Claude 에게 글을 쓰게 하면
--   폐기된 구 표기(화·수·목 로스팅 / 인천 부평 / Brand Blue)를 막을 근거가 없다.
--
-- 정본
--   MTSPACE_BRAND_TOKENS.md (v3, 2026-06-19 · clay/oat/ink)
--   MTSPACE_DESIGN_SYSTEM.md · handoff §0 (신선도·주소, D-022)
--
-- 적용 대상: brand.code = 'mtspace' 만. normcore 는 이번 범위가 아니다.
-- 재실행 안전: on conflict do update (멱등)
-- =====================================================================

begin;

-- ── 1. 브랜드 규범 (brand.*) ─────────────────────────────────────────
--    MCP 는 brand.rule* / brand.forbidden* 키를 rules 배열로 뽑아 규범으로 쓴다.

with b as (select id from public.brand where code = 'mtspace')
insert into public.site_setting (brand_id, key, value)
select b.id, v.key, v.value
from b, (values

  -- 정체성
  ('brand.identity.name',     $tok$MTSPACE COFFEE$tok$),
  ('brand.identity.operator', $tok$(주)엠티에스솔루션스 · 경기도 가평군 청평면 톳골길 3 · 통신판매업 제2026-경기가평-129호$tok$),
  ('brand.identity.tagline',  $tok$everyday excellence$tok$),
  ('brand.identity.voice',    $tok$origin integrity · technical rigor · quiet confidence · everyday access$tok$),

  -- 색 (v3 core)
  ('brand.color.key',       $tok$#C68D62 (clay) — 유일한 브랜드 키 컬러$tok$),
  ('brand.color.key_deep',  $tok$#B0764A (clay-deep) — 링크·작은 강조$tok$),
  ('brand.color.bg',        $tok$#F6F1E7 (oat) — 기본 배경$tok$),
  ('brand.color.surface',   $tok$#ECE2D1 (sand) — 카드·패널$tok$),
  ('brand.color.text',      $tok$#3C352C (ink) — 본문·헤드라인$tok$),
  ('brand.color.text_muted',$tok$#8A8173 (ink-soft) — 캡션·보조$tok$),
  ('brand.color.border',    $tok$#E3DAC8$tok$),

  -- 타이포
  ('brand.font.sans',  $tok$'Helvetica Neue', Pretendard, Arial, sans-serif — 정보·워드마크·UI$tok$),
  ('brand.font.serif', $tok$Spectral, 'Noto Serif KR', Georgia, serif — 감성·헤드라인·테이스팅$tok$),
  ('brand.font.mono',  $tok$'IBM Plex Mono', monospace — 스펙·로트·SKU·날짜$tok$),

  -- 규범 (rules 로 노출된다)
  ('brand.rule.freshness',        $tok$매주 월·화 로스팅 / 화·수 출고. 라벨·상품·배송정책·체크아웃·주문메일 모두 동일 표기(D-022)$tok$),
  ('brand.rule.address',          $tok$사업자·로스터리 주소는 경기도 가평군 청평면. 통신판매업 제2026-경기가평-129호$tok$),
  ('brand.rule.single_key_color', $tok$clay(#C68D62)가 유일한 브랜드 색. 두 번째 브랜드 색을 만들지 않는다. 제품 구분은 포인트 컬러(작은 인디케이터)로만 한다$tok$),
  ('brand.rule.small_text',       $tok$작은 본문에 clay 금지(WCAG AA 미달). clay-deep(#B0764A) 또는 ink(#3C352C)를 쓴다$tok$),
  ('brand.rule.wordmark',         $tok$MTSPACE(800) + COFFEE(200), letter-spacing 0, 한 줄. 태그라인은 mono·대문자·트래킹 5px$tok$),
  ('brand.rule.type_voices',      $tok$sans(정보) / serif(감성) / mono(데이터) 세 목소리. 한 줄 안에서 섞지 않는다$tok$),
  ('brand.rule.tone',             $tok$한국어 우선(고유명사·기술용어는 영문 유지). 간결한 전문가체. 추측 금지 — 확실하지 않으면 쓰지 않는다$tok$),

  -- 금지 (rules 로 노출된다)
  ('brand.forbidden.legacy_notation', $tok$폐기: "화·수·목 로스팅", "인천 부평" 주소. 발견 시 즉시 정정한다(D-022)$tok$),
  ('brand.forbidden.legacy_color',    $tok$폐기: Brand Blue #0076BA / #004D80 / cyan #16E7CF / 구 그라디언트. v2 청색 아이덴티티 전체가 폐기됐다(D-019)$tok$),
  ('brand.forbidden.legacy_sku',      $tok$폐기: 24 SKU 시그널 팔레트를 면(surface)으로 사용하는 것$tok$),
  ('brand.forbidden.cross_brand',     $tok$NORMCORE warm-beige 토큰·워드마크를 MTSPACE 에 가져오지 않는다(역방향도 동일)$tok$),
  ('brand.forbidden.other_products',  $tok$RoasteryFlow · logrid 의 브랜드 톤을 가져오지 않는다. 별개 제품이다$tok$),
  ('brand.forbidden.absolutes',       $tok$절대화 표현 금지: 최고의 / 유일한 / 완벽한 / 1등 / 최상의$tok$),
  ('brand.forbidden.unsourced_stats', $tok$출처 없는 수치·통계 금지. 자사 실측·지식베이스·링크 중 하나로 근거를 붙인다$tok$)

) as v(key, value)
on conflict (brand_id, key) do update set value = excluded.value;


-- ── 2. 비어 있던 레이아웃 키 채우기 ──────────────────────────────────
--    ⚠️ asset_accent 는 /api/asset · /api/og 의 생성 이미지 강조색으로 실제 렌더에 쓰인다.
--       현재 빈 문자열이라 강조가 적용되지 않는 상태다. v3 정본 값(clay)으로 채운다.
--       생성 이미지의 겉모습이 바뀌므로, 지금 바꾸고 싶지 않다면 이 블록만 건너뛴다.

with b as (select id from public.brand where code = 'mtspace')
insert into public.site_setting (brand_id, key, value)
select b.id, v.key, v.value
from b, (values
  ('asset_accent',  $tok$#C68D62$tok$),
  ('detail_accent', $tok$#C68D62$tok$),
  ('detail_font',   $tok$Spectral, 'Noto Serif KR', Georgia, serif$tok$)
) as v(key, value)
on conflict (brand_id, key) do update set value = excluded.value;

commit;


-- ── 3. 검증 ─────────────────────────────────────────────────────────
-- 규범 키가 들어갔는지, 빈 값이 남았는지 확인한다.

select count(*) filter (where key like 'brand.%')                       as brand_keys,
       count(*) filter (where key like 'brand.rule%'
                           or key like 'brand.forbidden%')              as rule_keys,
       count(*) filter (where coalesce(value, '') = '')                 as empty_values
from public.site_setting ss
join public.brand b on b.id = ss.brand_id
where b.code = 'mtspace';
-- 기대: brand_keys 25 · rule_keys 13 · empty_values 0
