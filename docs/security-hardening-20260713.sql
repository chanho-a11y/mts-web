-- 보안/성능 하드닝 마이그레이션 기록 (2026-07-13, prod apiskyivlvebpvvxfejq 에 적용 완료)
-- 이 파일은 기록용. 실제 적용은 Supabase 마이그레이션으로 원격 반영됨.

-- 1) harden_resolve_price_idor
--    유효 프로필을 본인(auth.uid())으로 강제. service_role/admin 만 임의 p_profile_id 허용.
--    (정의 전문은 pg_get_functiondef(resolve_price) 참조)

-- 2) fix_function_search_path
ALTER FUNCTION public.next_order_no() SET search_path = public, pg_temp;
-- ALTER FUNCTION public.mts_build_body(...) SET search_path = public, pg_temp;  (오버로드 포함 DO 블록으로 적용)

-- 3) revoke_handle_new_user_execute
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;

-- 4) add_fk_covering_indexes
--    커버링 인덱스 없는 public FK 36건에 btree 인덱스 생성 (idx_<table>_<col>).

-- 5) contact_newsletter_input_constraints
ALTER TABLE public.contact_message
  ADD CONSTRAINT contact_message_input_chk
  CHECK (email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
         AND length(email) <= 254 AND length(coalesce(name,'')) <= 100
         AND length(coalesce(phone,'')) <= 40 AND length(coalesce(message,'')) <= 5000) NOT VALID;
ALTER TABLE public.newsletter_subscriber
  ADD CONSTRAINT newsletter_subscriber_email_chk
  CHECK (email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' AND length(email) <= 254) NOT VALID;

-- 대시보드 설정(코드/SQL 밖, 대표 수동):
--   · Auth > Leaked password protection ON (HaveIBeenPwned)
--   · 배포 후 CSP-Report-Only 리포트 확인 → 이상 없으면 Content-Security-Policy 로 enforce 전환
--   · Vercel prod env 에 PAYMENTS_TEST_MODE 부재 확인
