-- D-160 보안 점검 후속 (2026-11-09). 추가와 이동만, 삭제 없음.
-- 1) Supabase advisor: function_search_path_mutable (social_post_touch). 본문은 now() 만 쓴다.
alter function public.social_post_touch() set search_path = pg_catalog, public;

-- 2) 백업 테이블을 API 노출 스키마(public) 밖으로 옮긴다(데이터 보존, 되돌리기: alter table archive.kb_entry_bak_20260807 set schema public;).
create schema if not exists archive;
revoke all on schema archive from anon, authenticated;
alter table if exists public.kb_entry_bak_20260807 set schema archive;
