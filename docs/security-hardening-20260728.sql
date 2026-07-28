-- 보안 하드닝 마이그레이션 기록 (2026-07-28, prod apiskyivlvebpvvxfejq 에 적용 완료)
-- 이 파일은 기록용. 실제 적용은 Supabase 마이그레이션(harden_signup_role_escalation)으로 원격 반영됨.
-- 근거: 자사몰_보안점검_리포트_20260728.md (C-1)

-- ─────────────────────────────────────────────────────────────────────────────
-- C-1) 가입 권한상승 차단 — handle_new_user 트리거의 role 화이트리스트
--
-- 문제: 트리거가 raw_user_meta_data.role 을 그대로 profiles.role 에 캐스팅해 넣었고,
--       customer_role enum 에 admin·influencer 가 실재했다.
--       → 가입 요청에 role=admin 을 실어 보내는 것만으로 관리자 계정이 발급됨.
--       전 /api/admin/* 과 관리자 액션이 profiles.role='admin' 만 확인하므로 전체 권한 탈취로 직결.
--
-- 조치: 공개 가입에서 허용되는 등급을 individual|business 로 강제.
--       admin·influencer 는 관리자가 수동 승격만 가능.
--       앱(app/account/actions.ts signUpAction)에도 동일 화이트리스트 → 2중 방어.
--       (DB 방어가 있어야 GoTrue 직접호출 등 다른 가입 경로도 함께 막힌다)
--
-- 검증(2026-07-28, 라이브):
--   · role=admin 주입 가입 → profiles.role = 'individual' 로 강등 확인 (테스트 계정 즉시 삭제)
--   · role=business 정상 가입 → business_accounts 1행·addresses 1행 정상 생성 (회귀 없음)
--   · 기존 admin 계정 = chanho@mtspace.coffee 1건뿐(2026-06-16 생성) — 무단 승격 흔적 없음
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  sq jsonb;
  requested_role text := nullif(m->>'role','');
  safe_role public.customer_role;
begin
  -- 공개 가입에서 허용되는 등급만 통과. 그 외(admin·influencer·오타·NULL)는 individual 로 강등.
  safe_role := case
                 when requested_role in ('individual','business')
                   then requested_role::public.customer_role
                 else 'individual'::public.customer_role
               end;

  insert into public.profiles (id, email, name, phone, role, language, marketing_opt_in)
  values (
    new.id, new.email,
    coalesce(m->>'name',''), coalesce(m->>'phone',''),
    safe_role,
    coalesce(m->>'language','ko'),
    coalesce((m->>'marketing_opt_in')::boolean,false)
  ) on conflict (id) do nothing;

  if m ? 'address' then
    insert into public.addresses (profile_id, recipient, phone, country, zipcode, addr1, addr2, is_default)
    values (new.id, m->'address'->>'recipient', m->'address'->>'phone',
            coalesce(m->'address'->>'country','KR'), m->'address'->>'zipcode',
            m->'address'->>'addr1', m->'address'->>'addr2', true);
  end if;

  if m ? 'security' then
    for sq in select e from jsonb_array_elements(m->'security') as e loop
      insert into public.security_question (profile_id, idx, question, answer_hash)
      values (new.id, (sq->>'idx')::smallint, sq->>'q', sq->>'a')
      on conflict (profile_id, idx) do nothing;
    end loop;
  end if;

  if m ? 'business' then
    insert into public.business_accounts (profile_id, company_name, biz_reg_no, representative, contact_name, contact_phone, tax_invoice_email, status)
    values (new.id, m->'business'->>'company_name', m->'business'->>'biz_reg_no',
            m->'business'->>'representative', m->'business'->>'contact_name',
            m->'business'->>'contact_phone', m->'business'->>'tax_invoice_email', 'pending');
  end if;

  return new;
end;
$function$;

-- ─────────────────────────────────────────────────────────────────────────────
-- C-2) 관리자 Server Action 인가 — 코드 레벨 조치(DB 변경 없음)
--   lib/auth-guard.ts 신설 + app/admin/**/actions.ts 42개 액션에 가드 적용.
--   service-role(RLS 우회) 사용 액션이 무인가로 호출되던 문제. 상세는 리포트 C-2 참조.
-- ─────────────────────────────────────────────────────────────────────────────

-- 잔여(대표 수동, 코드/SQL 밖) — 2026-07-13 분에서 이월:
--   · 배포 후 CSP-Report-Only 리포트 확인 → 이상 없으면 Content-Security-Policy 로 enforce 전환
--   · Vercel prod env 에 PAYMENTS_TEST_MODE 부재 확인
