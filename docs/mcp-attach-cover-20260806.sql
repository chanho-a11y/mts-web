-- =====================================================================
-- MTSPACE COMMERCE MCP — 초안 커버 부착 (2026-08-06 · D-108)
--
-- 선행: docs/mcp-asset-20260806.sql (D-107) 적용 완료
--
-- 왜 별도 함수인가:
--   commerce_draft_post 는 body_md 를 다시 받아 본문을 재생성한다. DB 에는
--   body_html 만 있고 마크다운 원본이 없으므로, 커버를 붙이려는 재저장이
--   본문을 바꾼다(D-107 실사용에서 실측). 커버 부착은 cover_image 한 컬럼만
--   만지는 전용 함수로 분리한다.
--
-- 구조적으로 막는 것(금지가 아니라 부재다):
--   - 발행글 수정: published 행이면 예외
--   - 외부 URL: asset_base_url + 'mcp/' 접두사 + '..' 거부 + 허용문자 3중 검사
--   - 미등록 자산: mcp_asset 대장에 없는 경로는 거부(draft_post 보다 한 단계 강함)
--
-- 재실행 안전: create or replace (멱등)
-- =====================================================================

create or replace function public.mcp_attach_cover(
  p_slug        text,
  p_cover_image text
) returns text
language plpgsql security definer set search_path to 'public'
as $fn$
declare
  v_status text; v_base text; v_cover text; v_path text;
begin
  if p_slug is null or btrim(p_slug) = '' then
    raise exception '슬러그가 필요합니다.';
  end if;

  v_cover := nullif(btrim(coalesce(p_cover_image, '')), '');
  if v_cover is null then
    raise exception '커버 이미지 URL 이 필요합니다.';
  end if;

  v_base := mcp_asset_base_url();
  if v_base is null then
    raise exception 'mcp_config.asset_base_url 이 설정돼 있지 않습니다.';
  end if;
  if left(v_cover, length(v_base) + 4) <> (v_base || 'mcp/')
     or v_cover like '%..%'
     or v_cover !~ '^[A-Za-z0-9:/._~%-]+$' then
    raise exception '커버 이미지는 commerce_create_image 로 등록한 자산 URL 만 쓸 수 있습니다. 외부 URL 은 받지 않습니다.';
  end if;

  v_path := substring(v_cover from length(v_base) + 1);
  if not exists (select 1 from mcp_asset where path = v_path) then
    raise exception '자산 대장에 없는 경로입니다(%). commerce_create_image 로 먼저 등록하세요.', v_path;
  end if;

  select status into v_status from content_post where slug = p_slug;
  if v_status is null then
    raise exception '해당 슬러그의 글이 없습니다(%). commerce_draft_post 로 먼저 초안을 만드세요.', p_slug;
  end if;
  if v_status = 'published' then
    raise exception '이미 발행된 글입니다(%). MCP 는 발행글을 수정할 수 없습니다. "%--rev" 개선안 초안을 쓰세요.', p_slug, p_slug;
  end if;

  update content_post set cover_image = v_cover where slug = p_slug;
  update mcp_asset set post_slug = coalesce(post_slug, p_slug) where path = v_path;

  return p_slug;
end;
$fn$;

comment on function public.mcp_attach_cover(text, text) is
  'MCP 전용: 초안의 커버만 교체한다. 본문은 건드리지 않는다. 발행글·미등록 자산·외부 URL 거부.';

revoke execute on function public.mcp_attach_cover(text, text) from public, anon, authenticated;
grant execute on function public.mcp_attach_cover(text, text) to mcp_reader;

-- ── 검증 ─────────────────────────────────────────────────────────────
-- 권한: postgres + mcp_reader (+ service_role) 만이어야 한다
select grantee, privilege_type from information_schema.routine_privileges
where routine_schema = 'public' and routine_name = 'mcp_attach_cover' order by grantee;
-- 거부 3종 (실행하면 의도적으로 에러):
-- select mcp_attach_cover('<초안slug>', 'https://evil.tld/x.png');                       -- 외부 URL
-- select mcp_attach_cover('<초안slug>', '<base>/mcp/blog/cover/999999/none-000000000000.webp'); -- 대장 미등록
-- select mcp_attach_cover('<발행slug>', '<정상 자산 URL>');                              -- 발행글
