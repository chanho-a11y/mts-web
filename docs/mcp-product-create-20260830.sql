-- =====================================================================
-- MTSPACE COMMERCE MCP — 신규 상품 draft 생성 (2026-08-30 · D-121)
--
-- 선행: docs/mcp-install/install.sql · docs/mcp-product-change-20260805.sql
--
-- 왜 draft 직접 생성인가 (블로그 mcp_draft_post 와 동일 패턴)
--   스토어프론트는 status='active' 만 노출한다(lib/queries.ts · products/[slug]).
--   따라서 draft 신규 상품은 고객에게 절대 보이지 않고, 발행 버튼이 곧 승인 게이트다.
--   수정 제안 큐(mcp_product_change)를 둔 이유("쓰는 순간 라이브가 바뀐다")는
--   신규 등록에 성립하지 않는다.
--
-- 구조적으로 막는 것 (금지가 아니라 부재)
--   - 발행        : status='draft' 하드코딩. published_at 을 쓰지 않는다
--   - 발행글 수정  : status<>'draft' 상품이면 예외 → 제안 큐로 안내
--   - 가격·SKU    : product_variant 에 닿지 않는다. 가격 입력은 대표 영역
--   - 표시사항    : ingredients·report_no·shelf_life 등 식품위생법 표시는 화이트리스트 밖
--   - weight_g    : 수정 화이트리스트 단일 원칙 유지(D-121 결정 3)
--   - 삭제·빈 값  : 빈 문자열·빈 배열·빈 객체·null 은 예외로 거부
--
-- draft 동안은 같은 함수로 덮어쓰기(블로그식). active/archived 전환 후에는
-- mcp_propose_product_change 만 쓴다(D-121 결정 2).
-- =====================================================================


-- ── 1. draft 생성/갱신 (MCP 가 호출) ─────────────────────────────────

create or replace function public.mcp_draft_product(
  p_slug  text,
  p_patch jsonb
) returns jsonb
language plpgsql security definer set search_path to 'public'
as $fn$
declare
  v_allowed    text[];
  v_key        text;
  v_val        jsonb;
  v_clean      jsonb := '{}'::jsonb;
  v_brand_code text;
  v_brand_id   uuid;
  v_cat_slug   text;
  v_cat        category%rowtype;
  v_cur        product%rowtype;
  v_shadow     text;
  n            product%rowtype;
  v_created    boolean := false;
  v_id         uuid;
  v_sf         uuid;
begin
  -- 기본 검증 — 조용히 잘라 담지 않고 명확히 실패한다.
  if p_slug is null or btrim(p_slug) = '' then
    raise exception '슬러그가 필요합니다.';
  end if;
  if p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception '슬러그는 영문 소문자·숫자·하이픈만 쓸 수 있습니다(%).', p_slug;
  end if;
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' or p_patch = '{}'::jsonb then
    raise exception '내용이 없습니다.';
  end if;

  -- 리다이렉트 섀도잉 방지 — 다른 상품의 예전 슬러그(prev_slugs)와 충돌 금지.
  select slug into v_shadow from product
   where p_slug = any(prev_slugs) and slug <> p_slug limit 1;
  if v_shadow is not null then
    raise exception '슬러그 %는 상품 %의 예전 주소(리다이렉트)로 쓰이고 있습니다. 다른 슬러그를 쓰세요.',
      p_slug, v_shadow;
  end if;

  -- 화이트리스트 = 수정 가능 필드(categories 제외) + 생성 전용 brand·category(단수).
  -- categories 배열은 제안 큐 전용 어휘다 — 이 함수는 관리자 폼과 같은 단일 category 를 쓴다.
  v_allowed := array_remove(mcp_product_editable_fields(), 'categories') || array['brand','category'];

  for v_key, v_val in select * from jsonb_each(p_patch) loop
    if not (v_key = any(v_allowed)) then
      raise exception '쓸 수 없는 필드입니다: %. 허용 필드: %', v_key, array_to_string(v_allowed, ', ');
    end if;
    -- 빈 값은 사실상의 삭제다. 이 서버는 값을 지우지 않는다.
    if v_val is null
       or jsonb_typeof(v_val) = 'null'
       or (jsonb_typeof(v_val) = 'string' and btrim(v_val #>> '{}') = '')
       or (jsonb_typeof(v_val) = 'array'  and jsonb_array_length(v_val) = 0)
       or (jsonb_typeof(v_val) = 'object' and v_val = '{}'::jsonb) then
      raise exception '빈 값으로 만들 수 없습니다: %.', v_key;
    end if;
    if v_key not in ('brand','category') then
      v_clean := v_clean || jsonb_build_object(v_key, v_val);
    end if;
  end loop;

  -- brand — mtspace / normcore. 생략 시 mtspace.
  v_brand_code := coalesce(nullif(btrim(p_patch ->> 'brand'), ''), 'mtspace');
  select id into v_brand_id from brand where code = v_brand_code;
  if v_brand_id is null then
    raise exception '없는 브랜드 코드입니다: %. mtspace 또는 normcore 를 쓰세요.', v_brand_code;
  end if;

  -- category — 실존 슬러그 검사(오탈자로 분류가 비는 사고 방지). 생략 시 single-origins.
  v_cat_slug := coalesce(nullif(btrim(p_patch ->> 'category'), ''), 'single-origins');
  select * into v_cat from category where slug = v_cat_slug;
  if not found then
    raise exception '없는 카테고리입니다: %. commerce_get_schema 의 categories 를 확인하세요.', v_cat_slug;
  end if;

  select * into v_cur from product where slug = p_slug;

  if found then
    -- ★ 핵심 안전장치 — 발행·보관된 상품은 이 함수가 건드리지 못한다.
    if v_cur.status <> 'draft' then
      raise exception
        '이미 %(status=%) 상태인 상품입니다. 이 함수는 draft 만 씁니다. 수정은 commerce_propose_product_update 로 제안하세요.',
        case v_cur.status when 'active' then '발행' else '보관' end, v_cur.status;
    end if;

    -- draft 덮어쓰기 — 보낸 필드만 갱신(블로그식). status·published_at 은 건드리지 않는다.
    n := jsonb_populate_record(null::product, to_jsonb(v_cur) || v_clean);
    update product set
      title_ko = n.title_ko, one_liner = n.one_liner, story = n.story,
      seo_title = n.seo_title, seo_description = n.seo_description,
      flavor_notes = n.flavor_notes, roast_level = n.roast_level, origin = n.origin,
      producer = n.producer, variety = n.variety, altitude = n.altitude, process = n.process,
      recipe = n.recipe, hashtags = n.hashtags, evidence = n.evidence,
      product_type = n.product_type,
      title_en = n.title_en, one_liner_en = n.one_liner_en, story_en = n.story_en,
      seo_title_en = n.seo_title_en, seo_description_en = n.seo_description_en,
      flavor_notes_en = n.flavor_notes_en, roast_level_en = n.roast_level_en,
      producer_en = n.producer_en, variety_en = n.variety_en, altitude_en = n.altitude_en,
      process_en = n.process_en, recipe_en = n.recipe_en,
      brand_id = v_brand_id,
      is_b2b_only = (v_cat.is_b2b or v_cur.is_b2b_only),
      updated_at = now()
    where id = v_cur.id;
    v_id := v_cur.id;
  else
    n := jsonb_populate_record(null::product, v_clean);
    if n.title_ko is null or btrim(n.title_ko) = '' then
      raise exception '신규 상품에는 title_ko(제품명)가 필요합니다.';
    end if;
    insert into product (
      slug, brand_id, status, is_b2b_only,
      title_ko, title_en, one_liner, one_liner_en,
      product_type, roast_level, roast_level_en,
      flavor_notes, flavor_notes_en, origin,
      producer, producer_en, variety, variety_en,
      altitude, altitude_en, process, process_en,
      recipe, recipe_en, hashtags, evidence,
      story, story_en, seo_title, seo_description, seo_title_en, seo_description_en
    ) values (
      p_slug, v_brand_id,
      'draft',                                   -- ★ 하드코딩. 인자로 받지 않는다.
      v_cat.is_b2b,
      n.title_ko, n.title_en, n.one_liner, n.one_liner_en,
      coalesce(n.product_type,
        case when v_cat.kind = 'single_origin' then '싱글 오리진' else '블렌드' end),
      n.roast_level, n.roast_level_en,
      coalesce(n.flavor_notes, '{}'::text[]), n.flavor_notes_en,
      coalesce(n.origin, '{}'::jsonb),
      n.producer, n.producer_en, n.variety, n.variety_en,
      n.altitude, n.altitude_en, n.process, n.process_en,
      n.recipe, n.recipe_en, coalesce(n.hashtags, '{}'::text[]), n.evidence,
      n.story, n.story_en, n.seo_title, n.seo_description, n.seo_title_en, n.seo_description_en
    ) returning id into v_id;
    v_created := true;
  end if;

  -- 카테고리 — 단일 선택이므로 교체(관리자 폼 setProductCategory 와 동일 규칙).
  delete from product_categories where product_id = v_id and category_id <> v_cat.id;
  insert into product_categories (product_id, category_id)
  values (v_id, v_cat.id) on conflict do nothing;

  -- 스토어프론트 연결 — draft 라 불가시. 발행 시 노출 누락을 막는 관리자 폼 규칙 복제.
  v_sf := mcp_storefront_id();
  insert into product_storefronts (product_id, storefront_id, is_visible)
  values (v_id, v_sf, true) on conflict (product_id, storefront_id) do nothing;

  return jsonb_build_object(
    'slug', p_slug, 'created', v_created, 'status', 'draft',
    'fields', (select coalesce(jsonb_agg(k order by k), '[]'::jsonb) from jsonb_object_keys(v_clean) k)
  );
end;
$fn$;

comment on function public.mcp_draft_product(text,jsonb) is
  'MCP 전용 신규 상품 draft 생성/갱신(D-121). status=draft 하드코딩, 발행·보관 상품은 거부. 가격·SKU·표시사항·weight_g 은 쓰지 못한다.';


-- ── 2. 권한 ──────────────────────────────────────────────────────────
--    SECURITY DEFINER 함수는 기본적으로 PUBLIC 에 EXECUTE 가 열린다.

revoke execute on function public.mcp_draft_product(text,jsonb)
  from public, anon, authenticated;
grant execute on function public.mcp_draft_product(text,jsonb)
  to mcp_reader;


-- ── 3. 검증 ──────────────────────────────────────────────────────────
-- 3-1. 권한: mcp_reader 만 EXECUTE 여야 한다.
-- select grantee, privilege_type from information_schema.routine_privileges
--  where routine_name = 'mcp_draft_product' order by grantee;
-- 3-2. 음성: 화이트리스트 밖 키 → 예외
-- select public.mcp_draft_product('qa-test', '{"cost": 1000}'::jsonb);
-- 3-3. 음성: 빈 값 → 예외
-- select public.mcp_draft_product('qa-test', '{"title_ko": ""}'::jsonb);
-- 3-4. 음성: active 상품 → 예외 (발행 상품 슬러그로 시도)
-- 3-5. 양성: draft 생성 → 스토어프론트 목록 쿼리에 안 나와야 한다.
