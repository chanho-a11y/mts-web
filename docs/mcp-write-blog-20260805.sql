-- =====================================================================
-- MTSPACE COMMERCE MCP — 블로그 초안 쓰기 (2026-08-05)
--
-- 선행: docs/mcp-install/install.sql · docs/mcp-run/01_structure.sql 적용 완료
--
-- 설계 요지
--   mcp_reader 는 지금도 어떤 테이블에도 권한이 없다. 그 상태를 그대로 두고,
--   SECURITY DEFINER 함수 하나에만 EXECUTE 를 준다. 쓰기 표면은 이 함수 시그니처가 전부다.
--
--   함수가 구조적으로 막는 것:
--     - 발행       : status 를 'draft' 로 하드코딩한다(인자로 받지 않는다)
--     - 발행글 수정 : status='published' 행이면 예외를 던진다
--     - 브랜드 혼입 : storefront_id 를 mcp_storefront_id() 로 고정한다
--     - 삭제       : 삭제 함수를 만들지 않는다
--
-- 재실행 안전: create or replace (멱등)
-- =====================================================================


-- ── 1. 뷰 갱신 — 본문·커버를 상세 조회에 싣는다 ──────────────────────
--    commerce_get_post 가 기존 글을 읽고 개선안을 쓰려면 body_html 이 필요하다.
--
--    ⚠️ create or replace view 는 기존 컬럼의 이름·순서를 바꾸지 못하고
--       새 컬럼은 반드시 "맨 뒤"에만 붙일 수 있다. 중간에 끼워 넣으면
--       ERROR: cannot change name of view column 이 난다.
--       그래서 body_html·cover_image 를 마지막에 둔다.

create or replace view public.mcp_v_content_post as
select cp.id, cp.slug, cp.title, cp.excerpt, cp.tags, cp.author, cp.status,
       cp.published_at, cp.seo_title, cp.seo_description,
       cp.body_html, cp.cover_image
from public.content_post cp
where cp.storefront_id = public.mcp_storefront_id() or cp.storefront_id is null;

-- 뷰를 교체해도 권한은 유지되지만, 누락 시 익명 노출로 이어지므로 다시 못 박는다.
revoke all on public.mcp_v_content_post from anon, authenticated, public;
grant select on public.mcp_v_content_post to mcp_reader;


-- ── 2. 초안 저장 함수 ────────────────────────────────────────────────

create or replace function public.mcp_draft_post(
  p_slug            text,
  p_title           text,
  p_body_html       text,
  p_excerpt         text    default null,
  p_tags            text[]  default null,
  p_seo_title       text    default null,
  p_seo_description text    default null
) returns text
language plpgsql
security definer
set search_path to 'public'
as $fn$
declare
  v_status text;
  v_storefront uuid;
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

  select status into v_status from content_post where slug = p_slug;

  -- ★ 핵심 안전장치 — 발행된 글은 MCP 가 건드리지 못한다.
  if v_status = 'published' then
    raise exception
      '이미 발행된 글입니다(%). MCP 는 발행글을 수정할 수 없습니다. "%--rev" 처럼 다른 슬러그로 개선안 초안을 만드세요.',
      p_slug, p_slug;
  end if;

  v_storefront := mcp_storefront_id();

  if v_status is null then
    insert into content_post (
      slug, title, body_html, excerpt, tags, author,
      storefront_id, status, published_at, seo_title, seo_description
    ) values (
      p_slug, p_title, p_body_html, p_excerpt, coalesce(p_tags, '{}'::text[]), '홍찬호',
      v_storefront,
      'draft',   -- ★ 하드코딩. 인자로 받지 않는다.
      null,      -- ★ published_at 은 어떤 경우에도 쓰지 않는다.
      p_seo_title, p_seo_description
    );
  else
    update content_post set
      title           = p_title,
      body_html       = p_body_html,
      excerpt         = p_excerpt,
      tags            = coalesce(p_tags, tags),
      seo_title       = coalesce(p_seo_title, seo_title),
      seo_description = coalesce(p_seo_description, seo_description),
      storefront_id   = coalesce(storefront_id, v_storefront),
      status          = 'draft'
    where slug = p_slug;
  end if;

  return p_slug;
end;
$fn$;

comment on function public.mcp_draft_post(text,text,text,text,text[],text,text) is
  'MCP 전용 블로그 초안 저장. status 는 항상 draft 이며 발행글은 거부한다. 발행은 관리자 화면에서 사람이 한다.';


-- ── 3. 권한 ─────────────────────────────────────────────────────────
--    SECURITY DEFINER 함수는 기본적으로 PUBLIC 에 EXECUTE 가 열린다.
--    회수를 빠뜨리면 익명 사용자가 초안을 무제한 생성할 수 있다(install.sql §7-3 과 같은 함정).

revoke execute on function public.mcp_draft_post(text,text,text,text,text[],text,text)
  from public, anon, authenticated;

grant execute on function public.mcp_draft_post(text,text,text,text,text[],text,text)
  to mcp_reader;


-- ── 4. 검증 ─────────────────────────────────────────────────────────

-- 4-1. 뷰에 본문이 실렸는가
select count(*) as has_body_html
from information_schema.columns
where table_schema = 'public' and table_name = 'mcp_v_content_post' and column_name = 'body_html';
-- 기대: 1

-- 4-2. 권한이 mcp_reader 에만 있는가
select grantee, privilege_type
from information_schema.routine_privileges
where routine_schema = 'public' and routine_name = 'mcp_draft_post'
order by grantee;
-- 기대: postgres(소유자) + mcp_reader 만. anon / authenticated / PUBLIC 이 보이면 실패.

-- 4-3. 발행글 거부 동작 — 발행된 슬러그로 호출해 예외가 나는지 본다.
--      (아래는 확인용이며 실행하면 의도적으로 에러가 난다)
-- select public.mcp_draft_post('blog-damn-good-story', '테스트', '<p>x</p>');
-- 기대: ERROR  이미 발행된 글입니다(blog-damn-good-story). …

-- 4-4. 초안 생성 → 정리
-- select public.mcp_draft_post('mcp-smoke-draft', 'MCP 스모크 초안', '<p>확인용</p>');
-- select slug, status, published_at, storefront_id from public.content_post where slug = 'mcp-smoke-draft';
-- delete from public.content_post where slug = 'mcp-smoke-draft';
