-- =====================================================================
-- MTSPACE COMMERCE MCP — 인스타그램 발행 워커 (2026-10-07 · D-137)
-- 선행: docs/mcp-social-20261005.sql
-- 워커 재시도·선점 컬럼. 토큰은 mcp_config 에 ig_token_mtspace / ig_token_issued_mtspace 로 워커가 직접 쓴다
-- (service-role). mcp_reader 는 mcp_config 테이블 권한이 없으므로 MCP 로 새지 않는다.
-- 재실행 안전.
-- =====================================================================

alter table public.social_post
  add column if not exists retry_count     integer     not null default 0,
  add column if not exists last_attempt_at timestamptz;

comment on column public.social_post.retry_count is '워커 재시도 횟수. 3회 뒤 failed';
comment on column public.social_post.last_attempt_at is '워커 선점 표식. 60초 안에 다른 워커가 같은 건을 집지 않게 한다';

-- 검증
-- select column_name from information_schema.columns where table_name='social_post' and column_name in ('retry_count','last_attempt_at');
-- 기대: 2행
