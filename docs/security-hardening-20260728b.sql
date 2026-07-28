-- 보안/성능 하드닝 2차 기록 (2026-07-28 오후, prod apiskyivlvebpvvxfejq 적용 완료)
-- 기록용. 실제 적용은 Supabase 마이그레이션으로 원격 반영됨.
-- 근거: 자사몰_보안점검_리포트_20260728.md (C-3, O-5) · 의사결정 로그 D-093

-- ════════════════════════════════════════════════════════════════════════════
-- C-3) 일반 회원의 자가 권한상승 차단  ★Critical
--      마이그레이션: guard_profile_privileged_columns
--                  → guard_profile_privileged_columns_fix_invoker (최종본)
--
-- 문제: RLS 정책 profiles_self_update 는 "자기 행이면 UPDATE 허용"이고 **컬럼 제한이 없다.**
--       게다가 anon·authenticated 역할에 profiles.role / price_tier_id UPDATE 권한이 부여돼 있어
--       로그인 사용자가 공개 anon 키로 PostgREST 를 직접 호출하면 관리자가 될 수 있었다:
--           PATCH /rest/v1/profiles?id=eq.<self>   {"role":"admin"}
--       라이브 재현 검증에서 role→admin, price_tier_id→임의 등급 모두 **성공**했다(롤백 처리).
--       C-1(가입 트리거)은 INSERT 시점만 막으므로 이 UPDATE 경로를 완전히 우회한다.
--       C-2 와 달리 action ID 조차 필요 없어 셋 중 가장 악용이 쉬웠다.
--
-- 조치 선택 근거 — 왜 컬럼 GRANT 회수가 아니라 트리거인가:
--       관리자 화면 일부(사업자 승인·등급 변경·보관·고객 일괄작업)가 관리자의 **사용자 세션**
--       (authenticated)으로 role/archived 를 수정한다. 컬럼 권한을 회수하면 그 기능들이 함께 깨진다.
--       트리거는 "관리자면 허용 / 일반 회원이면 차단"을 정확히 구분한다.
--
-- ※ 최초 버전은 SECURITY DEFINER 로 작성해 함수 안의 current_user 가 호출자가 아니라
--   함수 소유자(postgres)로 평가되면서 방어가 전혀 작동하지 않았다(검증에서 '취약: 변경됨' 확인).
--   → SECURITY INVOKER 로 전환 + auth.role() 병행 확인으로 수정.
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.guard_profile_privileged_columns()
returns trigger
language plpgsql
security invoker                       -- ★ DEFINER 로 바꾸지 말 것(호출자 판별 불가해짐)
set search_path to 'public'
as $$
declare
  via_api boolean;
begin
  via_api := (current_user in ('anon', 'authenticated'))
             or (coalesce(auth.role(), '') in ('anon', 'authenticated'));

  if not via_api then
    return new;                        -- service_role / 마이그레이션 등 신뢰 경로
  end if;

  if public.is_admin() then
    return new;                        -- 관리자
  end if;

  if new.role is distinct from old.role
     or new.price_tier_id is distinct from old.price_tier_id
     or new.id is distinct from old.id
     or new.archived is distinct from old.archived then
    raise exception
      'permission denied: profiles.(role, price_tier_id, id, archived) is admin-only'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_guard_privileged on public.profiles;
create trigger profiles_guard_privileged
before update on public.profiles
for each row execute function public.guard_profile_privileged_columns();

-- 검증 결과(2026-07-28 라이브, 전부 롤백):
--   ① 회원이 자기 role→admin        : 차단됨(42501)
--   ② 회원이 자기 price_tier_id 변경 : 차단됨(42501)
--   ③ 회원이 이름·전화·언어·마케팅수신 수정 : 허용(정상)
--   ④ 회원이 must_change_password 변경     : 허용(비번변경 플로우 유지)
--   ⑤ 관리자가 타인 role·등급·보관 변경    : 허용(관리자 화면 회귀 없음)


-- ════════════════════════════════════════════════════════════════════════════
-- O-5) RLS auth_rls_initplan 20건 해소
--      마이그레이션: rls_initplan_optimization
--
-- RLS 정책이 auth.uid() / is_admin() 을 **행마다** 재평가하던 것을 (select ...) 로 감싸
-- 쿼리당 1회 InitPlan 으로 평가되게 했다. 조건식 논리는 100% 동일 — 권한 변화 없음.
-- ALTER POLICY 사용(DROP/CREATE 아님) → 순간적 무방비 구간 없음.
--
-- 대상 20개 정책: profiles(3) security_question addresses business_accounts(2)
--   customer_variant_prices cart cart_item orders(2) order_item(2) payment(2)
--   shipment subscription review report_no
--
-- 검증:
--   · 미최적화 잔여 정책 0건
--   · 성능 어드바이저 auth_rls_initplan 20 → 0 (총 166 → 146)
--   · 격리 회귀 테스트: 본인 프로필 1 / 타인 프로필 0 / 일반회원 전체 가시행 1 /
--     타인 주소 0 / 관리자 전체 59 — 전부 기대치 일치
--
-- 보류: multiple_permissive_policies 101건(19개 테이블 정책 통합)은 RLS 재작성이라
--       회귀 위험이 커 대표 판단으로 보류(D-066 과 동일 사유).
-- ════════════════════════════════════════════════════════════════════════════

-- (정책 전문은 마이그레이션 rls_initplan_optimization 참조)


-- ════════════════════════════════════════════════════════════════════════════
-- 유지 결정(회수하지 않음) — SECURITY DEFINER 함수 REST 노출
--
-- 어드바이저가 WARN 하는 4건은 호출부·정의를 전수 확인한 결과 회수가 불가하거나 무의미하다:
--   · is_admin() / is_approved_business() — auth.uid() 기준 **호출자 본인 상태만** 반환.
--     유출 0. RLS 정책이 사용 중이라 회수 시 정책이 파손된다.
--   · resolve_price() — IDOR 가드 완료(본인 가격만). 배송비 견적·장바구니가 anon 으로 호출 → 회수 불가.
--   · current_stock() — 재고 수량 반환. 관리자 화면이 authenticated 로 호출 → 회수 시 파손.
-- → 실위험이 없다는 판단 하에 현행 유지. 어드바이저 WARN 4건은 의도된 잔존이다.
-- ════════════════════════════════════════════════════════════════════════════

-- 잔여(대표 수동, 코드/SQL 밖):
--   · Turnstile 키(NEXT_PUBLIC_TURNSTILE_SITE_KEY·TURNSTILE_SECRET_KEY) Vercel env 주입
--     → 넣기 전까지 CAPTCHA 완전 비활성이라 봇 가입이 계속 유입된다(2026-07-28 05:49 신규 1건 확인)
--   · 배포 후 Vercel 런타임 로그에서 "[csp-violation]" 수집 → 무해 확인 시 enforce 전환
--   · Vercel prod env 에 PAYMENTS_TEST_MODE 부재 확인
