-- =====================================================================
-- MTSPACE COMMERCE MCP — 커버 이미지 등록 (2026-08-06 · D-107)
--
-- 선행: docs/mcp-foundation-20260729.sql · docs/mcp-write-blog-20260805.sql 적용 완료
-- 기획: MCP_이미지업로드_설계기획서_20260806.md (v1.1, 부록 A가 정본)
--
-- 설계 요지
--   mcp_reader 의 테이블 권한 0 을 그대로 유지한다. 자산 대장은 SECURITY DEFINER
--   함수 두 개로만 닿고, 파일 쓰기는 storage.objects 의 INSERT 정책 하나로만 열린다.
--   경로 프리픽스 mcp/ 밖으로는 어떤 것도 만들 수 없다.
--
--   구조적으로 막는 것 (금지가 아니라 부재다)
--     - 덮어쓰기 : storage.objects 에 UPDATE 정책을 만들지 않는다
--     - 삭제     : DELETE 정책도 삭제 함수도 만들지 않는다
--     - 본문 이미지: purpose 에 blog-body 가 없다 (커버 전용)
--     - 외부 URL : mcp_draft_post 가 asset_base_url + 'mcp/' 접두사만 받는다
--
-- 재실행 안전: 전 구간 멱등 (create or replace · if not exists · on conflict)
-- =====================================================================


-- ── 1. 설정 시딩 ─────────────────────────────────────────────────────
--    패키지 코드에 기본값을 두지 않는다. 인스턴스마다 다른 값이므로
--    없으면 부팅 시 오류가 나야 한다(브랜드 토큰과 같은 취급).

insert into public.mcp_config (key, value, value_json, note) values
  ('asset_base_url',
   'https://apiskyivlvebpvvxfejq.supabase.co/storage/v1/object/public/product-assets/',
   null,
   'MCP 가 등록한 자산의 공개 URL 접두사. mcp_draft_post 의 cover_image 검증 기준.')
on conflict (key) do update
  set value = excluded.value, note = excluded.note;

insert into public.mcp_config (key, value, value_json, note) values
  ('default_author', '홍찬호', null,
   'MCP 초안의 기본 저자. 인도 인스턴스는 반드시 고객사 값으로 바꾼다(D-107).')
on conflict (key) do update
  set value = excluded.value, note = excluded.note;

-- ⚠️ mcp_config.value 는 NOT NULL 이다. json 전용 키에도 표식 문자열을 넣는다
--    (기존 product_attribute_schema 가 value='json' 인 것과 같은 방식).
insert into public.mcp_config (key, value, value_json, note) values
  ('asset_policy', 'json',
   '{
      "blog-cover": {
        "bucket": "product-assets",
        "mime": ["image/png", "image/jpeg", "image/webp"],
        "max_bytes": 1048576,
        "max_b64_len": 1400000,
        "min_width": 1200,
        "min_height": 630,
        "aspect_min": 1.2,
        "aspect_max": 2.0,
        "max_per_hour": 20,
        "prefix": "mcp/blog/cover"
      }
    }'::jsonb,
   'commerce_create_image 의 품질 게이트. min 1200x630 은 OG 권장 규격이다.')
on conflict (key) do update
  set value = excluded.value, value_json = excluded.value_json, note = excluded.note;


-- ── 2. 자산 대장 ─────────────────────────────────────────────────────
--    mcp_reader 는 storage.objects 를 조회하지 못한다(그래야 한다).
--    중복 판정·쿼터·미참조 정리·alt 보관을 위해 대장이 필요하다.

create table if not exists public.mcp_asset (
  id            uuid primary key default gen_random_uuid(),
  storefront_id uuid        not null,
  purpose       text        not null,
  path          text        not null unique,
  sha256        text        not null,
  bytes         integer     not null,
  mime          text        not null,
  width         integer     not null,
  height        integer     not null,
  alt           text,
  post_slug     text,
  -- 두 인증 경로를 구분해 남긴다. OAuth 경로는 token_id 가 null 이다(mcp/auth.ts).
  token_id      uuid,
  profile_id    uuid        not null,
  created_at    timestamptz not null default now()
);

-- 쿼터 조회용. profile_id 로 세는 이유는 OAuth 경로에 token_id 가 없기 때문이다.
create index if not exists mcp_asset_profile_recent_idx
  on public.mcp_asset (profile_id, created_at desc);

-- 미참조 자산 정리 리포트용
create index if not exists mcp_asset_post_slug_idx
  on public.mcp_asset (post_slug);

-- RLS 는 켜되 정책을 만들지 않는다 → 어떤 롤도 직접 닿지 못하고 함수로만 통한다.
alter table public.mcp_asset enable row level security;

revoke all on public.mcp_asset from public, anon, authenticated;

comment on table public.mcp_asset is
  'MCP 가 등록한 자산 대장. 실제 파일은 storage.objects 에 있고 이 표는 중복 판정·쿼터·정리에 쓴다.';


-- ── 3. 설정 헬퍼 ─────────────────────────────────────────────────────

create or replace function public.mcp_asset_base_url()
returns text
language sql stable security definer
set search_path to 'public'
as $fn$
  -- 트레일링 슬래시를 정규화한다. 시딩이 어떻게 되든 접두사 비교가 깨지지 않는다.
  select rtrim(nullif(btrim(value), ''), '/') || '/'
  from public.mcp_config where key = 'asset_base_url'
$fn$;

create or replace function public.mcp_default_author()
returns text
language sql stable security definer
set search_path to 'public'
as $fn$
  select nullif(btrim(value), '') from public.mcp_config where key = 'default_author'
$fn$;

-- 이 둘은 다른 SECURITY DEFINER 함수 안에서만 호출된다 → mcp_reader 에 grant 하지 않는다.
revoke execute on function public.mcp_asset_base_url() from public, anon, authenticated;
revoke execute on function public.mcp_default_author() from public, anon, authenticated;


-- ── 4. 사전 점검 — 쿼터 + 중복 ───────────────────────────────────────
--    바이트를 쓰기 "전에" 부른다. 업로드 후에 막으면 막는 의미가 없다.
--    반환: 이미 있는 경로(중복) 또는 null

create or replace function public.mcp_asset_precheck(
  p_purpose    text,
  p_profile_id uuid,
  p_path       text
) returns text
language plpgsql security definer
set search_path to 'public'
as $fn$
declare
  v_policy   jsonb;
  v_max      integer;
  v_used     integer;
  v_existing text;
begin
  -- 신원 없이 등록할 수 없다. OAuth·정적 토큰 두 경로 모두 profile_id 는 항상 채워진다.
  if p_profile_id is null then
    raise exception '자산 등록에는 식별된 계정이 필요합니다.';
  end if;

  select value_json -> p_purpose into v_policy
  from public.mcp_config where key = 'asset_policy';

  if v_policy is null then
    raise exception '자산 정책(asset_policy.%)이 없습니다. mcp_config 를 확인하세요.', p_purpose;
  end if;

  -- 경로 방어(심층). 서버 코드가 뚫려도 여기서 다시 막는다.
  if p_path is null
     or p_path !~ '^mcp/[A-Za-z0-9._/-]+$'
     or p_path like '%..%' then
    raise exception '허용되지 않는 자산 경로입니다: %', coalesce(p_path, '(null)');
  end if;

  select path into v_existing from public.mcp_asset where path = p_path;
  if v_existing is not null then
    -- 같은 바이트를 다시 올린 것이다. 쿼터를 소모시키지 않는다.
    return v_existing;
  end if;

  v_max := coalesce((v_policy ->> 'max_per_hour')::integer, 0);
  if v_max <= 0 then
    raise exception '자산 정책에 max_per_hour 가 없습니다(asset_policy.%).', p_purpose;
  end if;

  select count(*) into v_used
  from public.mcp_asset
  where profile_id = p_profile_id
    and created_at > now() - interval '1 hour';

  if v_used >= v_max then
    raise exception
      '시간당 자산 등록 한도(%건)를 넘었습니다. 잠시 후 다시 시도하거나 /admin/blog 에서 직접 올리세요.',
      v_max;
  end if;

  return null;
end;
$fn$;

revoke execute on function public.mcp_asset_precheck(text, uuid, text)
  from public, anon, authenticated;
grant execute on function public.mcp_asset_precheck(text, uuid, text) to mcp_reader;


-- ── 5. 대장 등록 ─────────────────────────────────────────────────────
--    스토리지 업로드가 끝난 뒤 부른다. 반환값은 "중복이었는가".
--    경쟁 상황(같은 이미지 동시 2회)에서도 on conflict 로 한 행만 남는다.

create or replace function public.mcp_register_asset(
  p_purpose    text,
  p_path       text,
  p_sha256     text,
  p_bytes      integer,
  p_mime       text,
  p_width      integer,
  p_height     integer,
  p_alt        text,
  p_post_slug  text,
  p_token_id   uuid,
  p_profile_id uuid
) returns boolean
language plpgsql security definer
set search_path to 'public'
as $fn$
declare
  v_inserted integer;
begin
  if p_profile_id is null then
    raise exception '자산 등록에는 식별된 계정이 필요합니다.';
  end if;

  if p_path is null
     or p_path !~ '^mcp/[A-Za-z0-9._/-]+$'
     or p_path like '%..%' then
    raise exception '허용되지 않는 자산 경로입니다: %', coalesce(p_path, '(null)');
  end if;

  if not exists (
    select 1 from public.mcp_config
    where key = 'asset_policy' and value_json ? p_purpose
  ) then
    raise exception '자산 정책(asset_policy.%)이 없습니다.', p_purpose;
  end if;

  insert into public.mcp_asset (
    storefront_id, purpose, path, sha256, bytes, mime, width, height,
    alt, post_slug, token_id, profile_id
  ) values (
    mcp_storefront_id(),   -- ★ 브랜드 혼입 차단. 인자로 받지 않는다.
    p_purpose, p_path, p_sha256, p_bytes, p_mime, p_width, p_height,
    p_alt, p_post_slug, p_token_id, p_profile_id
  )
  on conflict (path) do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted = 0;   -- 0 이면 이미 있던 것 = 중복
end;
$fn$;

revoke execute on function
  public.mcp_register_asset(text,text,text,integer,text,integer,integer,text,text,uuid,uuid)
  from public, anon, authenticated;
grant execute on function
  public.mcp_register_asset(text,text,text,integer,text,integer,integer,text,text,uuid,uuid)
  to mcp_reader;


-- ── 6. mcp_draft_post 재정의 ─────────────────────────────────────────
--
--   ⚠️ 반드시 트랜잭션으로 감싼다.
--      7인자 함수를 남긴 채 8인자(default 포함) 함수를 만들면 7인자 호출이
--      양쪽에 매치되어 SQLSTATE 42725 (function is not unique) 가 난다.
--      2026-08-06 실측으로 재현 확인. drop 과 create 사이에 초안 쓰기가 죽는
--      창이 생기지 않도록 한 트랜잭션에 넣는다.
--
--   함께 고치는 것 (D-107)
--      author 하드코딩('홍찬호') 제거 → mcp_config.default_author
--      인도 패키지가 이 함수를 그대로 가져가면 고객사 글의 저자가 홍찬호가 된다.

begin;

drop function if exists public.mcp_draft_post(text,text,text,text,text[],text,text);

create function public.mcp_draft_post(
  p_slug            text,
  p_title           text,
  p_body_html       text,
  p_excerpt         text    default null,
  p_tags            text[]  default null,
  p_seo_title       text    default null,
  p_seo_description text    default null,
  p_cover_image     text    default null
) returns text
language plpgsql
security definer
set search_path to 'public'
as $fn$
declare
  v_status     text;
  v_storefront uuid;
  v_author     text;
  v_base       text;
  v_cover      text;
begin
  -- 입력 검증 — 조용히 잘라 담지 않고 명확히 실패한다.
  if p_slug is null or btrim(p_slug) = '' then
    raise exception '슬러그가 필요합니다.';
  end if;
  if p_title is null or btrim(p_title) = '' then
    raise exception '제목이 필요합니다.';
  end if;
  if length(p_title) > 200 then
    raise exception '제목이 200자를 넘습니다(현재 %자).', length(p_title);
  end if;
  if length(coalesce(p_body_html, '')) > 200000 then
    raise exception '본문이 200KB 를 넘습니다.';
  end if;
  if coalesce(array_length(p_tags, 1), 0) > 10 then
    raise exception '태그는 10개까지입니다.';
  end if;

  -- ── 커버 이미지 검증 ──
  --    like 'base/mcp/%' 만으로는 'base/mcp/../thumb/x.png' 가 통과한다.
  --    그 문자열이 그대로 og:image 로 나가면 CDN 에서 mcp/ 밖 객체로 해석된다.
  --    접두사 일치 + '..' 거부 + 허용문자 집합, 셋을 모두 본다.
  v_cover := nullif(btrim(coalesce(p_cover_image, '')), '');
  if v_cover is not null then
    v_base := mcp_asset_base_url();
    if v_base is null then
      raise exception 'mcp_config.asset_base_url 이 설정돼 있지 않습니다.';
    end if;
    if left(v_cover, length(v_base) + 4) <> (v_base || 'mcp/')
       or v_cover like '%..%'
       or v_cover !~ '^[A-Za-z0-9:/._~%-]+$' then
      raise exception
        '커버 이미지는 commerce_create_image 로 등록한 자산 URL 만 쓸 수 있습니다. 외부 URL 은 받지 않습니다.';
    end if;
  end if;

  select status into v_status from content_post where slug = p_slug;

  -- ★ 핵심 안전장치 — 발행된 글은 MCP 가 건드리지 못한다.
  if v_status = 'published' then
    raise exception
      '이미 발행된 글입니다(%). MCP 는 발행글을 수정할 수 없습니다. "%--rev" 처럼 다른 슬러그로 개선안 초안을 만드세요.',
      p_slug, p_slug;
  end if;

  v_storefront := mcp_storefront_id();

  if v_status is null then
    -- ★ 저자는 설정에서 온다. 패키지에 브랜드 기본값을 두지 않는다.
    v_author := mcp_default_author();
    if v_author is null then
      raise exception
        'mcp_config.default_author 가 설정돼 있지 않습니다. 인스턴스마다 다른 값이라 기본값을 쓰지 않습니다.';
    end if;

    insert into content_post (
      slug, title, body_html, excerpt, tags, author,
      storefront_id, status, published_at, seo_title, seo_description, cover_image
    ) values (
      p_slug, p_title, p_body_html, p_excerpt, coalesce(p_tags, '{}'::text[]), v_author,
      v_storefront,
      'draft',   -- ★ 하드코딩. 인자로 받지 않는다.
      null,      -- ★ published_at 은 어떤 경우에도 쓰지 않는다.
      p_seo_title, p_seo_description, v_cover
    );
  else
    update content_post set
      title           = p_title,
      body_html       = p_body_html,
      excerpt         = p_excerpt,
      tags            = coalesce(p_tags, tags),
      seo_title       = coalesce(p_seo_title, seo_title),
      seo_description = coalesce(p_seo_description, seo_description),
      -- ★ coalesce 가 없으면 커버를 생략한 재저장이 기존 커버를 지운다.
      cover_image     = coalesce(v_cover, cover_image),
      storefront_id   = coalesce(storefront_id, v_storefront),
      status          = 'draft'
    where slug = p_slug;
  end if;

  return p_slug;
end;
$fn$;

comment on function public.mcp_draft_post(text,text,text,text,text[],text,text,text) is
  'MCP 전용 블로그 초안 저장. status 는 항상 draft 이며 발행글은 거부한다. 커버는 mcp/ 프리픽스 자산만 받는다.';

-- SECURITY DEFINER 함수는 기본적으로 PUBLIC 에 EXECUTE 가 열린다.
-- drop 으로 기존 grant 가 사라졌으므로 반드시 다시 부여한다.
revoke execute on function public.mcp_draft_post(text,text,text,text,text[],text,text,text)
  from public, anon, authenticated;
grant execute on function public.mcp_draft_post(text,text,text,text,text[],text,text,text)
  to mcp_reader;

commit;


-- ── 7. 스토리지 권한 ─────────────────────────────────────────────────
--    현재 storage.objects 에는 정책이 0건이다(모든 업로드가 service_role 로
--    RLS 를 우회하고 있다). 아래 정책은 mcp_reader 에게만 걸리므로
--    기존 관리자 업로드 경로에 영향이 없다.

grant usage on schema storage to mcp_reader;
grant select on storage.buckets to mcp_reader;
grant select, insert on storage.objects to mcp_reader;

-- 버킷 조회 — 업로드 시 storage-api 가 버킷 메타를 읽는다.
drop policy if exists mcp_reader_bucket_read on storage.buckets;
create policy mcp_reader_bucket_read on storage.buckets
  for select to mcp_reader
  using (id = 'product-assets');

-- 파일 생성 — mcp/ 프리픽스 안에서만.
drop policy if exists mcp_reader_object_insert on storage.objects;
create policy mcp_reader_object_insert on storage.objects
  for insert to mcp_reader
  with check (
    bucket_id = 'product-assets'
    and name like 'mcp/%'
    and name not like '%..%'
  );

-- 존재 확인 — storage-api 가 업로드 전후로 객체를 조회할 수 있다.
-- 조건 없는 SELECT 정책을 주면 안 된다. 반드시 같은 프리픽스로 묶는다.
drop policy if exists mcp_reader_object_read on storage.objects;
create policy mcp_reader_object_read on storage.objects
  for select to mcp_reader
  using (bucket_id = 'product-assets' and name like 'mcp/%');

-- ★ UPDATE·DELETE 정책은 만들지 않는다.
--   덮어쓰기와 삭제가 "부재"로 차단된다(D-105 와 같은 방식).


-- ── 8. 버킷 방어 ─────────────────────────────────────────────────────
--    서버 코드 검증과 이중이지만, 지금은 코드가 유일한 방어선이라
--    코드 버그가 곧 무제한 업로드다.
--    ※ gif 를 남기는 이유: app/api/upload/route.ts 가 gif 를 허용한다.
--      버킷을 3종으로 좁히면 관리자 업로드가 깨진다(범위 밖 회귀).
--    ※ 실측: 현재 이 버킷의 객체는 image/jpeg 30건 · image/png 26건,
--      최대 4.3MB 이므로 아래 제한으로 기존 자산에 영향이 없다.

update storage.buckets
   set file_size_limit    = 10485760,
       allowed_mime_types = array['image/png','image/jpeg','image/webp','image/gif']
 where id = 'product-assets';


-- ── 9. 검증 ─────────────────────────────────────────────────────────

-- 9-1. mcp_draft_post 가 8인자 "하나만" 있는가 (7인자가 남아 있으면 실패)
select p.proname, pg_get_function_identity_arguments(p.oid) as args
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'mcp_draft_post';
-- 기대: 1행. 마지막 인자가 p_cover_image text

-- 9-2. 새 함수들의 EXECUTE 가 mcp_reader 에만 있는가
select routine_name, grantee, privilege_type
from information_schema.routine_privileges
where routine_schema = 'public'
  and routine_name in ('mcp_draft_post','mcp_asset_precheck','mcp_register_asset')
order by routine_name, grantee;
-- 기대: postgres(소유자) + mcp_reader 만. anon / authenticated / PUBLIC 이 보이면 실패.

-- 9-3. 스토리지 정책이 의도대로인가 (INSERT 1 · SELECT 1, UPDATE·DELETE 0)
select c.relname as tbl, p.polname,
       case p.polcmd when 'r' then 'SELECT' when 'a' then 'INSERT'
                     when 'w' then 'UPDATE' when 'd' then 'DELETE' else 'ALL' end as cmd
from pg_policy p
join pg_class c on c.oid = p.polrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'storage'
order by 1, 3;
-- 기대: buckets/SELECT 1건, objects/INSERT 1건, objects/SELECT 1건. UPDATE·DELETE 는 0건이어야 한다.

-- 9-4. 대장에 RLS 가 켜져 있고 정책이 0건인가
select relrowsecurity as rls_on,
       (select count(*) from pg_policy where polrelid = 'public.mcp_asset'::regclass) as policies
from pg_class where oid = 'public.mcp_asset'::regclass;
-- 기대: rls_on = true, policies = 0

-- 9-5. 설정이 들어갔는가
select key, (value is not null) as has_text, (value_json is not null) as has_json
from public.mcp_config
where key in ('asset_base_url','asset_policy','default_author')
order by key;
-- 기대: 3행. asset_policy 는 has_json = true, 나머지는 has_text = true

-- 9-6. 버킷 제한
select id, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'product-assets';
-- 기대: 10485760 · {image/png,image/jpeg,image/webp,image/gif}


-- ── 10. 롤백 (필요 시) ───────────────────────────────────────────────
--
-- begin;
--   drop policy if exists mcp_reader_object_insert on storage.objects;
--   drop policy if exists mcp_reader_object_read   on storage.objects;
--   drop policy if exists mcp_reader_bucket_read   on storage.buckets;
--   revoke insert, select on storage.objects from mcp_reader;
--   revoke select on storage.buckets from mcp_reader;
--   drop function if exists public.mcp_draft_post(text,text,text,text,text[],text,text,text);
--   -- 이어서 docs/mcp-write-blog-20260805.sql 의 7인자 함수를 다시 만들고 grant 한다.
-- commit;
--
-- 이미 올라간 파일은 mcp/ 아래에 남는다(삭제가 부재로 차단돼 있으므로).
-- 대장(mcp_asset)도 남긴다 — 롤백이 데이터를 지우지 않는다.
