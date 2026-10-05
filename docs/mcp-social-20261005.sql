-- =====================================================================
-- MTSPACE COMMERCE MCP — 인스타그램 초안 (2026-10-05 · D-135)
--
-- 선행: docs/mcp-asset-20260806.sql · docs/mcp-attach-cover-20260806.sql 적용 완료
-- 기획: Claude Docs 「Instagram 자동 발행 시스템 설계」 (MTSPACE 전용으로 범위 축소)
--
-- 설계 요지
--   블로그 초안(D-105)과 같은 구조. mcp_reader 의 테이블 권한 0 을 유지하고
--   SECURITY DEFINER 함수 2개 + 뷰 1개만 연다. 쓰기 표면은 함수 시그니처가 전부다.
--
--   구조적으로 막는 것 (금지가 아니라 부재다)
--     - 발행        : status 인자가 없다. 함수는 'draft' 만 쓴다. 발행은 발행 워커(별건)가
--                    scheduled 행만 집어 수행하고, scheduled 로 가는 전이는 /admin/social 에서만 일어난다.
--     - 승인글 수정 : status 가 scheduled·published 면 예외. 개선안은 '<원본slug>--rev'.
--     - 외부 이미지 : media[].url 은 asset_base_url + 'mcp/' 접두사 + 대장 등록분만 받는다.
--     - 삭제        : 삭제 함수를 만들지 않는다. 정리는 /admin/social 에서 사람만.
--
-- 재실행 안전: 전 구간 멱등
-- =====================================================================


-- ── 1. 자산 정책 — purpose 'instagram' 추가 ───────────────────────────
--    Graph API 제약: JPEG, 8MB 이하, 가로세로비 4:5(0.8) ~ 1.91:1.
--    서버 코드가 PNG 를 JPEG 로 변환해 올리므로 mime 에 jpeg 만 둬도 되지만,
--    base64 로 직접 올린 PNG 도 같은 변환을 거친다 — 대장에는 결과물(jpeg)만 남는다.

update public.mcp_config
   set value_json = coalesce(value_json, '{}'::jsonb) || jsonb_build_object(
     'instagram', jsonb_build_object(
       'bucket',       'product-assets',
       'prefix',       'mcp/social',
       'mime',         jsonb_build_array('image/jpeg'),
       'max_bytes',    8388608,
       'max_b64_len',  1400000,
       'min_width',    1080,
       'min_height',   1080,
       'aspect_min',   0.8,
       'aspect_max',   1.91,
       'max_per_hour', 40
     )),
       note = coalesce(note, '') || ' | instagram: Graph API 규격(JPEG·8MB·4:5~1.91:1). D-135'
 where key = 'asset_policy';


-- ── 2. 초안 테이블 ────────────────────────────────────────────────────

create table if not exists public.social_post (
  id               uuid primary key default gen_random_uuid(),
  storefront_id    uuid        not null,
  slug             text        not null unique,
  -- 채널은 당분간 instagram 하나. 컬럼으로 두는 이유는 나중에 threads 등을 같은 표로 받기 위함.
  channel          text        not null default 'instagram' check (channel in ('instagram')),
  kind             text        not null check (kind in ('image', 'carousel')),
  caption          text        not null,
  hashtags         text[]      not null default '{}',
  -- [{url, alt, width, height, mime}] — url 은 전부 mcp/ 자산. 순서가 캐러셀 순서다.
  media            jsonb       not null,
  status           text        not null default 'draft'
                   check (status in ('draft', 'scheduled', 'published', 'rejected', 'failed')),
  suggested_time   timestamptz,
  scheduled_at     timestamptz,
  source_ref       text,
  -- 서버 룰 검사 결과 {errors:[], warnings:[]} — 승인자가 보는 참고 정보
  rule_check       jsonb       not null default '{"errors":[],"warnings":[]}'::jsonb,
  rejection_reason text,
  failure_reason   text,
  ig_media_id      text,
  ig_permalink     text,
  published_at     timestamptz,
  insights         jsonb,
  created_by       text        not null default 'mcp' check (created_by in ('mcp', 'admin')),
  token_id         uuid,
  profile_id       uuid,
  approved_by      uuid,
  approved_at      timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists social_post_status_sched_idx
  on public.social_post (status, scheduled_at);

create index if not exists social_post_created_idx
  on public.social_post (created_at desc);

-- RLS 는 켜되 정책 0건 → 함수(mcp_reader)와 service-role(관리자 화면)만 닿는다.
alter table public.social_post enable row level security;
revoke all on public.social_post from public, anon, authenticated;

comment on table public.social_post is
  '인스타그램 초안·발행 대장. MCP 는 draft 만 만들고, scheduled 전이는 /admin/social 에서 사람이, published/failed 는 발행 워커가 쓴다.';

-- updated_at 자동 갱신
create or replace function public.social_post_touch()
returns trigger language plpgsql as $fn$
begin
  new.updated_at := now();
  return new;
end;
$fn$;

drop trigger if exists social_post_touch on public.social_post;
create trigger social_post_touch
  before update on public.social_post
  for each row execute function public.social_post_touch();


-- ── 3. 조회 뷰 ───────────────────────────────────────────────────────
--    MCP 가 반려 사유·발행 결과·지표를 읽어 다음 초안에 반영한다.
--    ⚠️ 새 컬럼은 맨 뒤에만 붙인다(create or replace view 제약).

create or replace view public.mcp_v_social_post as
select sp.id, sp.slug, sp.channel, sp.kind, sp.caption, sp.hashtags, sp.media,
       sp.status, sp.suggested_time, sp.scheduled_at, sp.source_ref, sp.rule_check,
       sp.rejection_reason, sp.failure_reason, sp.ig_media_id, sp.ig_permalink,
       sp.published_at, sp.insights, sp.created_by, sp.created_at, sp.updated_at
from public.social_post sp
where sp.storefront_id = public.mcp_storefront_id();

revoke all on public.mcp_v_social_post from anon, authenticated, public;
grant select on public.mcp_v_social_post to mcp_reader;


-- ── 4. 초안 저장 함수 ────────────────────────────────────────────────

create or replace function public.mcp_social_draft(
  p_slug            text,
  p_kind            text,
  p_caption         text,
  p_hashtags        text[],
  p_media           jsonb,
  p_suggested_time  timestamptz default null,
  p_source_ref      text        default null,
  p_rule_check      jsonb       default null,
  p_token_id        uuid        default null,
  p_profile_id      uuid        default null
) returns text
language plpgsql
security definer
set search_path to 'public'
as $fn$
declare
  v_status     text;
  v_storefront uuid;
  v_base       text;
  v_n          integer;
  v_item       jsonb;
  v_url        text;
  v_path       text;
begin
  -- 입력 검증 — 조용히 잘라 담지 않고 명확히 실패한다.
  if p_slug is null or btrim(p_slug) = '' then
    raise exception '슬러그가 필요합니다.';
  end if;
  if p_kind not in ('image', 'carousel') then
    raise exception 'kind 는 image 또는 carousel 이어야 합니다(현재 %).', coalesce(p_kind, '(null)');
  end if;
  if p_caption is null or btrim(p_caption) = '' then
    raise exception '캡션이 필요합니다.';
  end if;
  if length(p_caption) > 2200 then
    raise exception '캡션이 2,200자를 넘습니다(현재 %자). 인스타그램 상한입니다.', length(p_caption);
  end if;
  if coalesce(array_length(p_hashtags, 1), 0) > 30 then
    raise exception '해시태그는 30개까지입니다(현재 %개).', array_length(p_hashtags, 1);
  end if;

  -- ── 미디어 검증 ──
  if p_media is null or jsonb_typeof(p_media) <> 'array' then
    raise exception 'media 는 배열이어야 합니다.';
  end if;
  v_n := jsonb_array_length(p_media);
  if p_kind = 'image' and v_n <> 1 then
    raise exception 'kind=image 는 이미지 1장이어야 합니다(현재 %장). 여러 장이면 carousel 로 보내세요.', v_n;
  end if;
  if p_kind = 'carousel' and (v_n < 2 or v_n > 10) then
    raise exception '캐러셀은 2~10장이어야 합니다(현재 %장).', v_n;
  end if;

  v_base := mcp_asset_base_url();
  if v_base is null then
    raise exception 'mcp_config.asset_base_url 이 설정돼 있지 않습니다.';
  end if;

  for v_item in select * from jsonb_array_elements(p_media) loop
    v_url := nullif(btrim(coalesce(v_item ->> 'url', '')), '');
    if v_url is null then
      raise exception 'media 항목에 url 이 없습니다.';
    end if;
    -- draft_post 와 같은 3중 검사 + 대장 등록 여부(attach_cover 와 같은 강도)
    if left(v_url, length(v_base) + 4) <> (v_base || 'mcp/')
       or v_url like '%..%'
       or v_url !~ '^[A-Za-z0-9:/._~%-]+$' then
      raise exception
        '이미지는 commerce_create_image(purpose=instagram) 로 등록한 자산 URL 만 쓸 수 있습니다. 외부 URL 은 받지 않습니다: %', v_url;
    end if;
    v_path := substring(v_url from length(v_base) + 1);
    if not exists (select 1 from mcp_asset where path = v_path) then
      raise exception '자산 대장에 없는 이미지입니다: %', v_path;
    end if;
  end loop;

  select status into v_status from social_post where slug = p_slug;

  -- ★ 핵심 안전장치 — 승인됐거나 발행된 초안은 MCP 가 건드리지 못한다.
  if v_status in ('scheduled', 'published') then
    raise exception
      '이미 %된 초안입니다(%). MCP 는 승인·발행된 초안을 수정할 수 없습니다. "%--rev" 처럼 다른 슬러그로 개선안을 만드세요.',
      case v_status when 'scheduled' then '승인' else '발행' end, p_slug, p_slug;
  end if;

  v_storefront := mcp_storefront_id();

  if v_status is null then
    insert into social_post (
      storefront_id, slug, kind, caption, hashtags, media,
      status, suggested_time, source_ref, rule_check, created_by, token_id, profile_id
    ) values (
      v_storefront, p_slug, p_kind, p_caption, coalesce(p_hashtags, '{}'::text[]), p_media,
      'draft',   -- ★ 하드코딩. 인자로 받지 않는다.
      p_suggested_time, p_source_ref,
      coalesce(p_rule_check, '{"errors":[],"warnings":[]}'::jsonb),
      'mcp', p_token_id, p_profile_id
    );
  else
    -- draft·rejected·failed 는 재저장 가능. 재저장하면 다시 draft 로 돌아가고 사유는 비운다.
    update social_post set
      kind             = p_kind,
      caption          = p_caption,
      hashtags         = coalesce(p_hashtags, hashtags),
      media            = p_media,
      suggested_time   = coalesce(p_suggested_time, suggested_time),
      source_ref       = coalesce(p_source_ref, source_ref),
      rule_check       = coalesce(p_rule_check, rule_check),
      status           = 'draft',
      rejection_reason = null,
      failure_reason   = null,
      scheduled_at     = null
    where slug = p_slug;
  end if;

  -- 자산 대장에 참조 선언을 남긴다(미참조 정리 리포트용). 이미 선언된 값은 지키지 않는다 — 소셜은 재사용이 흔하다.
  update mcp_asset set post_slug = coalesce(post_slug, p_slug)
   where path in (
     select substring((m ->> 'url') from length(v_base) + 1)
     from jsonb_array_elements(p_media) m
   );

  return p_slug;
end;
$fn$;

comment on function public.mcp_social_draft(text,text,text,text[],jsonb,timestamptz,text,jsonb,uuid,uuid) is
  'MCP 전용 인스타그램 초안 저장. status 는 항상 draft. scheduled·published 행은 거부. 승인은 /admin/social 에서 사람이 한다.';

revoke execute on function public.mcp_social_draft(text,text,text,text[],jsonb,timestamptz,text,jsonb,uuid,uuid)
  from public, anon, authenticated;
grant execute on function public.mcp_social_draft(text,text,text,text[],jsonb,timestamptz,text,jsonb,uuid,uuid)
  to mcp_reader;


-- ── 5. 검증 ─────────────────────────────────────────────────────────

-- 5-1. 정책이 들어갔는가
select value_json ? 'instagram' as has_instagram_policy
from public.mcp_config where key = 'asset_policy';
-- 기대: true

-- 5-2. 권한이 mcp_reader 에만 있는가
select routine_name, grantee, privilege_type
from information_schema.routine_privileges
where routine_schema = 'public' and routine_name = 'mcp_social_draft'
order by grantee;
-- 기대: postgres(소유자) + mcp_reader 만.

-- 5-3. 테이블 RLS 켜짐 + 정책 0건
select relrowsecurity as rls_on,
       (select count(*) from pg_policy where polrelid = 'public.social_post'::regclass) as policies
from pg_class where oid = 'public.social_post'::regclass;
-- 기대: true, 0

-- 5-4. 뷰 권한
select grantee, privilege_type from information_schema.table_privileges
where table_schema = 'public' and table_name = 'mcp_v_social_post' order by grantee;
-- 기대: mcp_reader SELECT (+ postgres)


-- ── 6. 롤백 (필요 시) ───────────────────────────────────────────────
-- begin;
--   drop function if exists public.mcp_social_draft(text,text,text,text[],jsonb,timestamptz,text,jsonb,uuid,uuid);
--   drop view if exists public.mcp_v_social_post;
--   drop table if exists public.social_post;   -- 데이터가 사라진다. 백업 후에만.
--   update public.mcp_config set value_json = value_json - 'instagram' where key = 'asset_policy';
-- commit;
