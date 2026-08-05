-- =====================================================================
-- MTSPACE COMMERCE MCP — 상품 정보 수정 제안 큐 (2026-08-05)
--
-- 선행: docs/mcp-install/install.sql · docs/mcp-run/01_structure.sql
-- 적용 완료: Supabase 마이그레이션 3건
--   mcp_product_change_queue / mcp_product_change_add_category_story / mcp_v_category_include_shared
--
-- 왜 제안 큐인가
--   블로그는 draft 상태가 있어 "초안만 쓰기"가 그대로 승인 게이트였다.
--   상품에는 그런 중간 상태가 없고 수정 대상이 대부분 판매 중인 상품이라,
--   쓰는 순간 라이브가 바뀐다. 그래서 MCP 는 제안만 쌓고,
--   관리자가 /admin/products/changes 에서 before→after 를 보고 반영한다.
--
-- 구조적으로 막는 것 (금지가 아니라 부재)
--   - 즉시 반영   : 제안 함수는 product 를 건드리지 않는다
--   - 삭제        : 삭제 함수가 없다. 빈 문자열·빈 배열·빈 객체·null 은 예외로 거부한다
--   - 신규 등록    : product INSERT 경로가 없다
--   - 위험 필드    : 화이트리스트 밖 키는 예외. 가격·재고·SKU 는 다른 테이블이라 애초에 닿지 않는다
--
-- 화이트리스트에서 제외한 것과 이유
--   body_html                        파생 산출물. 스토어프론트가 렌더하지 않고 스튜디오가 재생성한다
--   key_color·palette·label_point    resolveTheme() 이 읽는 디자인 토큰
--   brew_recipe                      구 컬럼(전량 빈 객체, D-104). 정본은 recipe
--   ingredients·report_no·shelf_life·maker_info·material·packaging·storage
--                                    식품위생법 표시사항. 모델이 창작하면 법적 리스크
--   status·published_at·slug·prev_slugs·is_b2b_only·weight_g·cost
--                                    상거래 위험. weight_g 은 배송비 구간을 바꾸는데 화면 경고가 없다
--
-- 상품 상태와 무관하다 — 초안(draft)·발행(active)·보관(archived) 모두 제안 대상이다.
-- =====================================================================


-- ── 1. 제안 테이블 ───────────────────────────────────────────────────

create table if not exists public.mcp_product_change (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references public.product(id) on delete cascade,
  patch        jsonb not null,               -- {필드: 새 값}
  before       jsonb not null,               -- {필드: 제안 시점의 값} — 충돌 검사용
  note         text,                         -- 왜 바꾸는지(제안자가 남긴다)
  status       text not null default 'pending'
                 check (status in ('pending','applied','rejected')),
  created_at   timestamptz not null default now(),
  reviewed_at  timestamptz,
  reviewed_by  uuid references public.profiles(id)
);

create index if not exists mcp_product_change_pending_idx
  on public.mcp_product_change (status, created_at desc);

comment on table public.mcp_product_change is
  'MCP 가 올린 상품 수정 제안. 관리자가 반영해야 product 에 적용된다. MCP 는 이 테이블에 직접 접근하지 못한다.';

alter table public.mcp_product_change enable row level security;

drop policy if exists mcp_product_change_admin on public.mcp_product_change;
create policy mcp_product_change_admin on public.mcp_product_change
  for all using (public.is_admin()) with check (public.is_admin());

-- mcp_reader 는 어떤 테이블에도 권한이 없다는 불변식을 새 테이블에서도 유지한다.
revoke all on public.mcp_product_change from anon, public, mcp_reader;
grant select, insert, update on public.mcp_product_change to authenticated;


-- ── 2. 카테고리 헬퍼 ─────────────────────────────────────────────────
--    categories 는 product 컬럼이 아니라 product_categories 관계다.
--    비교·검증을 위해 슬러그 배열로 정규화해서 다룬다.

create or replace function public.mcp_product_category_slugs(p_product_id uuid)
returns text[] language sql stable set search_path to 'public' as $fn$
  select coalesce(array_agg(c.slug order by c.slug), '{}'::text[])
  from product_categories pc
  join category c on c.id = pc.category_id
  where pc.product_id = p_product_id
$fn$;


-- ── 3. 읽기 뷰 보강 ──────────────────────────────────────────────────
--    story·story_en·categories 는 그동안 MCP 가 읽지 못했다.
--    현재 값을 못 읽으면 정확한 수정 제안도 못 한다.
--    ⚠️ create or replace view 는 새 컬럼을 맨 뒤에만 붙일 수 있다.

create or replace view public.mcp_v_product as
select p.id, p.slug, p.title_ko as title, p.title_en, p.one_liner, p.one_liner_en,
       p.product_type, p.status, p.is_b2b_only, p.weight_g, p.key_color,
       p.seo_title, p.seo_description, p.seo_title_en, p.seo_description_en,
       p.published_at, p.updated_at, ps.is_visible, ps."position", p.evidence,
       jsonb_strip_nulls(jsonb_build_object(
         'roast_level', p.roast_level, 'flavor_notes', to_jsonb(p.flavor_notes),
         'origin', p.origin, 'producer', p.producer, 'variety', p.variety,
         'altitude', p.altitude, 'process', p.process, 'recipe', p.recipe,
         'packaging', p.packaging, 'storage', p.storage, 'shelf_life', p.shelf_life,
         'ingredients', p.ingredients, 'maker_info', p.maker_info, 'report_no', p.report_no,
         'material', p.material, 'label_point', p.label_point)) as attributes,
       jsonb_strip_nulls(jsonb_build_object(
         'roast_level', p.roast_level_en, 'flavor_notes', to_jsonb(p.flavor_notes_en),
         'producer', p.producer_en, 'variety', p.variety_en, 'altitude', p.altitude_en,
         'process', p.process_en, 'recipe', p.recipe_en, 'packaging', p.packaging_en,
         'storage', p.storage_en, 'shelf_life', p.shelf_life_en,
         'ingredients', p.ingredients_en, 'maker_info', p.maker_info_en)) as attributes_en,
       p.story, p.story_en,
       to_jsonb(public.mcp_product_category_slugs(p.id)) as categories
from product p
join product_storefronts ps on ps.product_id = p.id and ps.storefront_id = mcp_storefront_id();

revoke all on public.mcp_v_product from anon, authenticated, public;
grant select on public.mcp_v_product to mcp_reader;

-- 카테고리 목록. brand_id 는 현재 전량 NULL(브랜드 공용)이라 내부 조인이면 목록이 빈다.
create or replace view public.mcp_v_category as
select c.slug, c.name_ko as name, c.name_en, c.kind, c.is_b2b, c."position"
from category c
where c.brand_id is null
   or c.brand_id in (select b.id from brand b join storefront s on s.brand_id = b.id
                      where s.id = mcp_storefront_id());

revoke all on public.mcp_v_category from anon, authenticated, public;
grant select on public.mcp_v_category to mcp_reader;


-- ── 4. 수정 가능 필드 (단일 정본) ────────────────────────────────────

create or replace function public.mcp_product_editable_fields()
returns text[] language sql immutable set search_path to 'public' as $fn$
  select array[
    -- 한국어 — 마케팅 카피
    'title_ko','one_liner','story','seo_title','seo_description',
    -- 한국어 — 커피 정보
    'flavor_notes','roast_level','origin','producer','variety','altitude','process',
    'recipe','hashtags','evidence','product_type','categories',
    -- 영문
    'title_en','one_liner_en','story_en','seo_title_en','seo_description_en',
    'flavor_notes_en','roast_level_en','producer_en','variety_en','altitude_en',
    'process_en','recipe_en'
  ]
$fn$;


-- ── 5. 제안 등록 (MCP 가 호출) ───────────────────────────────────────

create or replace function public.mcp_propose_product_change(
  p_slug  text,
  p_patch jsonb,
  p_note  text default null
) returns jsonb
language plpgsql security definer set search_path to 'public'
as $fn$
declare
  v_product  product%rowtype;
  v_row      jsonb;
  v_allowed  text[] := mcp_product_editable_fields();
  v_key      text;
  v_val      jsonb;
  v_cur      jsonb;
  v_patch    jsonb := '{}'::jsonb;
  v_before   jsonb := '{}'::jsonb;
  v_id       uuid;
  v_bad      text[];
begin
  if p_slug is null or btrim(p_slug) = '' then
    raise exception '슬러그가 필요합니다.';
  end if;
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' or p_patch = '{}'::jsonb then
    raise exception '변경할 내용이 없습니다.';
  end if;

  -- 상태 필터를 두지 않는다 — 초안·발행·보관 어떤 상품이든 제안 대상이다.
  select * into v_product from product where slug = p_slug;
  if not found then
    raise exception '상품을 찾지 못했습니다(%). commerce_search_products 로 슬러그를 확인하세요.', p_slug;
  end if;

  v_row := to_jsonb(v_product)
           || jsonb_build_object('categories', to_jsonb(mcp_product_category_slugs(v_product.id)));

  for v_key, v_val in select * from jsonb_each(p_patch) loop
    if not (v_key = any(v_allowed)) then
      raise exception '수정할 수 없는 필드입니다: %. 허용 필드: %',
        v_key, array_to_string(v_allowed, ', ');
    end if;

    -- 빈 값은 사실상의 삭제다. 이 서버는 값을 지우지 않는다.
    if v_val is null
       or jsonb_typeof(v_val) = 'null'
       or (jsonb_typeof(v_val) = 'string' and btrim(v_val #>> '{}') = '')
       or (jsonb_typeof(v_val) = 'array'  and jsonb_array_length(v_val) = 0)
       or (jsonb_typeof(v_val) = 'object' and v_val = '{}'::jsonb) then
      raise exception '빈 값으로 만들 수 없습니다: %. 이 서버는 값을 지우지 않습니다.', v_key;
    end if;

    -- 카테고리는 존재하는 슬러그인지 검사한다(오탈자로 분류가 비는 사고 방지)
    if v_key = 'categories' then
      if jsonb_typeof(v_val) <> 'array' then
        raise exception 'categories 는 카테고리 슬러그 배열이어야 합니다.';
      end if;
      select coalesce(array_agg(s), '{}'::text[]) into v_bad
      from jsonb_array_elements_text(v_val) s
      where s not in (select slug from category);
      if array_length(v_bad, 1) > 0 then
        raise exception '없는 카테고리입니다: %. commerce_get_schema 의 categories 를 확인하세요.',
          array_to_string(v_bad, ', ');
      end if;
      select jsonb_agg(s order by s) into v_val from jsonb_array_elements_text(v_val) s;
    end if;

    v_cur := v_row -> v_key;
    -- 현재 값과 같은 필드는 제안에서 뺀다(빈 제안·소음 방지)
    if v_cur is distinct from v_val then
      v_patch  := v_patch  || jsonb_build_object(v_key, v_val);
      v_before := v_before || jsonb_build_object(v_key, v_cur);
    end if;
  end loop;

  if v_patch = '{}'::jsonb then
    raise exception '현재 값과 동일합니다. 바뀌는 내용이 없습니다.';
  end if;

  insert into mcp_product_change (product_id, patch, before, note, status)
  values (v_product.id, v_patch, v_before, nullif(btrim(coalesce(p_note, '')), ''), 'pending')
  returning id into v_id;

  return jsonb_build_object(
    'change_id', v_id, 'slug', p_slug,
    'fields', (select jsonb_agg(k order by k) from jsonb_object_keys(v_patch) k),
    'status', 'pending'
  );
end;
$fn$;

comment on function public.mcp_propose_product_change(text,jsonb,text) is
  'MCP 전용 상품 수정 제안. product 를 바꾸지 않는다. 화이트리스트 밖 필드와 빈 값은 거부한다.';


-- ── 6. 반영 / 버림 (관리자가 호출) ───────────────────────────────────
--    ★ SECURITY INVOKER — 호출자 권한으로 돌아 RLS 가 그대로 적용된다(D-092·093).
--      SECURITY DEFINER 로 두면 이 함수 자체가 권한상승 경로가 된다.

create or replace function public.apply_mcp_product_change(p_change_id uuid)
returns jsonb
language plpgsql security invoker set search_path to 'public'
as $fn$
declare
  chg        mcp_product_change%rowtype;
  v_row      jsonb;
  v_key      text;
  v_conflict text[] := '{}';
  n          product%rowtype;
begin
  if not is_admin() then
    raise exception '관리자만 제안을 반영할 수 있습니다.';
  end if;

  select * into chg from mcp_product_change where id = p_change_id;
  if not found then raise exception '제안을 찾지 못했습니다.'; end if;
  if chg.status <> 'pending' then
    raise exception '이미 처리된 제안입니다(%).', chg.status;
  end if;

  select to_jsonb(p.*) || jsonb_build_object('categories', to_jsonb(mcp_product_category_slugs(p.id)))
    into v_row from product p where id = chg.product_id;
  if v_row is null then raise exception '상품이 없습니다.'; end if;

  -- 제안 생성 이후 다른 경로로 값이 바뀌었으면 덮어쓰지 않는다.
  for v_key in select jsonb_object_keys(chg.before) loop
    if (v_row -> v_key) is distinct from (chg.before -> v_key) then
      v_conflict := v_conflict || v_key;
    end if;
  end loop;
  if array_length(v_conflict, 1) > 0 then
    raise exception '제안 생성 이후 값이 바뀐 필드가 있습니다: %. 제안을 버리고 다시 만드세요.',
      array_to_string(v_conflict, ', ');
  end if;

  n := jsonb_populate_record(null::product, (v_row - 'categories') || (chg.patch - 'categories'));

  -- 화이트리스트 컬럼만 명시적으로 쓴다. 이 목록이 쓰기 표면의 전부다.
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
    updated_at = now()
  where id = chg.product_id;

  -- 카테고리는 관계라 재설정한다. 상품·카테고리 자체를 지우는 것이 아니라 매핑만 교체한다.
  if chg.patch ? 'categories' then
    delete from product_categories where product_id = chg.product_id;
    insert into product_categories (product_id, category_id)
    select chg.product_id, cat.id
    from category cat
    where cat.slug in (select jsonb_array_elements_text(chg.patch -> 'categories'));
  end if;

  update mcp_product_change
     set status = 'applied', reviewed_at = now(), reviewed_by = auth.uid()
   where id = p_change_id;

  return jsonb_build_object('applied', true,
    'fields', (select jsonb_agg(k order by k) from jsonb_object_keys(chg.patch) k));
end;
$fn$;

create or replace function public.reject_mcp_product_change(p_change_id uuid)
returns void
language plpgsql security invoker set search_path to 'public'
as $fn$
begin
  if not is_admin() then
    raise exception '관리자만 제안을 처리할 수 있습니다.';
  end if;
  update mcp_product_change
     set status = 'rejected', reviewed_at = now(), reviewed_by = auth.uid()
   where id = p_change_id and status = 'pending';
  if not found then
    raise exception '대기 중인 제안을 찾지 못했습니다.';
  end if;
end;
$fn$;


-- ── 7. MCP 조회용 뷰 ─────────────────────────────────────────────────

create or replace view public.mcp_v_product_change as
select c.id, p.slug, p.title_ko as title, c.patch, c.before, c.note,
       c.status, c.created_at, c.reviewed_at
from public.mcp_product_change c
join public.product p on p.id = c.product_id;

revoke all on public.mcp_v_product_change from anon, authenticated, public;
grant select on public.mcp_v_product_change to mcp_reader;


-- ── 8. 권한 ─────────────────────────────────────────────────────────
--    SECURITY DEFINER 함수는 기본적으로 PUBLIC 에 EXECUTE 가 열린다.

revoke execute on function public.mcp_propose_product_change(text,jsonb,text)
  from public, anon, authenticated;
grant execute on function public.mcp_propose_product_change(text,jsonb,text)
  to mcp_reader;

revoke execute on function public.mcp_product_editable_fields() from public, anon;
grant  execute on function public.mcp_product_editable_fields() to mcp_reader, authenticated;

revoke execute on function public.mcp_product_category_slugs(uuid) from public, anon;
grant  execute on function public.mcp_product_category_slugs(uuid) to mcp_reader, authenticated;

revoke execute on function public.apply_mcp_product_change(uuid)  from public, anon;
revoke execute on function public.reject_mcp_product_change(uuid) from public, anon;
grant  execute on function public.apply_mcp_product_change(uuid)  to authenticated;
grant  execute on function public.reject_mcp_product_change(uuid) to authenticated;


-- ── 9. 검증 ─────────────────────────────────────────────────────────

-- 9-1. mcp_reader 가 제안 테이블에 직접 닿지 못하는가 (기대: 0)
select count(*) as reader_table_grants
from information_schema.role_table_grants
where table_name = 'mcp_product_change' and grantee = 'mcp_reader';

-- 9-2. 함수 권한에 anon / PUBLIC 이 없는가
select routine_name, grantee, privilege_type
from information_schema.routine_privileges
where routine_schema = 'public'
  and routine_name in ('mcp_propose_product_change','apply_mcp_product_change','reject_mcp_product_change')
order by routine_name, grantee;

-- 9-3. 거부 동작 일괄 확인 (전부 '거부' 로 나와야 한다)
-- create or replace function pg_temp.t(p jsonb) returns text language plpgsql as $$
-- begin perform public.mcp_propose_product_change('damn-good-1000', p); return '통과(문제!)';
-- exception when others then return '거부 — ' || sqlerrm; end $$;
-- select v.label, pg_temp.t(v.patch) from (values
--   ('weight_g',    '{"weight_g":500}'::jsonb),
--   ('ingredients', '{"ingredients":"커피원두 100%"}'::jsonb),
--   ('status',      '{"status":"archived"}'::jsonb),
--   ('key_color',   '{"key_color":"#000000"}'::jsonb),
--   ('body_html',   '{"body_html":"<p>x</p>"}'::jsonb),
--   ('빈 문자열',    '{"story":"   "}'::jsonb),
--   ('null',        '{"story":null}'::jsonb),
--   ('빈 배열',      '{"flavor_notes":[]}'::jsonb),
--   ('빈 객체',      '{"recipe":{}}'::jsonb),
--   ('없는 카테고리', '{"categories":["nope-xyz"]}'::jsonb)
-- ) v(label, patch);
