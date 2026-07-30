-- 가입 봇 차단 기록 (2026-07-30, prod apiskyivlvebpvvxfejq 적용 완료)
-- 기록용. 실제 적용은 Supabase 마이그레이션(signup_bot_defense, fix_email_norm_domain_duplication)으로 반영됨.
-- 근거: 의사결정 로그 D-097

-- ════════════════════════════════════════════════════════════════════════════
-- 배경
--   2026-07-26~29 가입 봇 30건 유입. D-091 에서 Turnstile 을 도입했으나 Cloudflare 키가
--   Vercel env 에 주입되지 않아 CAPTCHA 가 완전 비활성 상태였고, 그 사이 계속 들어왔다.
--   → 키와 무관하게 즉시 작동하는 방어를 DB·앱에 넣는다.
--
-- 실측 봇 패턴(30건 공통)
--   · 이름 = 공백 없는 랜덤 알파벳 14~24자
--   · 전화 = 0으로 시작하지 않는 10~11자리(밍국형). 한국 휴대폰은 010…
--   · 가입 즉시 로그인(created_at ≈ last_sign_in_at, 밀리초 차)
--   · 주소 1건을 같은 초에 스크립트로 작성 / 주문 0건
--   · Gmail 점(dot) 트릭으로 같은 메일박스 반복 사용
--   · 21건이 마케팅 수신 동의 체크(= 우리 도메인이 해외 피해자에게 스팸 발송하는 구조)
--
-- 대표 확정(D-097)
--   · 봇 계정 30건 완전 삭제
--   · 해외 개인고객 가입은 계속 허용(EMS 배송 있음) → 국가·전화 형식으로 막지 않고 **행동 신호만** 사용
--   · 마케팅 수신 동의 정책은 현행 유지
-- ════════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────
-- 1) 이메일 정규화 + 유일성 강제 — Gmail 점·+태그 트릭 무력화
--    Gmail 은 local part 의 점을 무시하고 '+' 뒤를 태그로 처리한다.
--    a.b.c@gmail.com / abc@gmail.com / abc+x@gmail.com 은 **같은 메일박스**다.
--    unique index 라서 앱 경로를 우회해도(REST 직접 호출) 중복 가입이 불가능하다.
--
--    ※ 최초 버전에 버그가 있었다:
--        split_part(lower(e),'+',1) || '@' || split_part(lower(e),'@',2)
--      '+' 가 없는 주소는 split_part(...,'+',1) 이 전체 문자열을 반환해 도메인이 중복됐다
--      (user.name@naver.com → user.name@naver.com@naver.com).
--      서로 다른 주소가 서로 다른 값으로 사상되긴 해서 unique 판정은 깨지지 않았으나,
--      앱(lib/signup-guard.ts)의 정규화와 불일치해 fix_email_norm_domain_duplication 으로 정정.
--      함수 변경 시 의존 인덱스를 반드시 재생성해야 한다(drop → replace → create).
-- ─────────────────────────────────────────────────────────────────────
create or replace function public.email_norm(e text)
returns text
language sql
immutable
set search_path to 'public'
as $$
  select case
    when e is null then null
    when lower(e) ~ '@(gmail|googlemail)\.com$'
      then replace(split_part(split_part(lower(e), '@', 1), '+', 1), '.', '') || '@gmail.com'
    else split_part(split_part(lower(e), '@', 1), '+', 1) || '@' || split_part(lower(e), '@', 2)
  end
$$;

create unique index if not exists profiles_email_norm_uidx
  on public.profiles (public.email_norm(email))
  where email is not null;

-- 검증(2026-07-30 라이브, 전부 롤백):
--   · 'bot.test.dot@gmail.com' 가입 후 'b.o.t.t.e.s.t.d.o.t@gmail.com' 재가입 → 차단(23505)
--   · 'bottestdot+promo@gmail.com' 재가입 → 차단(23505)
--   · 기존 47개 이메일 정규화 충돌 0건(인덱스 생성 가능 확인 후 적용)


-- ─────────────────────────────────────────────────────────────────────
-- 2) 가입 시도 기록 — IP 레이트리밋 + 차단 사유 관측
--    RLS 정책을 만들지 않는다 = anon·authenticated 접근 불가, service-role 전용.
-- ─────────────────────────────────────────────────────────────────────
create table if not exists public.signup_attempt (
  id bigserial primary key,
  ip text not null,
  email text,
  outcome text not null default 'attempt',
    -- attempt | blocked_honeypot | blocked_speed | blocked_rate | blocked_captcha | blocked_dup
  created_at timestamptz not null default now()
);
create index if not exists signup_attempt_ip_time_idx on public.signup_attempt (ip, created_at desc);
create index if not exists signup_attempt_time_idx    on public.signup_attempt (created_at desc);
alter table public.signup_attempt enable row level security;


-- ─────────────────────────────────────────────────────────────────────
-- 3) 봇 계정 30건 정리 (적용 완료)
--    1단계(가역): marketing_opt_in=false + banned_until='infinity' → 21건 수신해제, 23건 신규차단
--    2단계(확정): auth.users 삭제 → profiles·addresses·cart·security_question CASCADE
--    안전장치: 대상 수가 정확히 30건이 아니면 중단하는 가드를 넣고 실행
--    결과: 79 → 49 계정. 주문 있는 계정 삭제 0건. orphan profiles 0건.
--          주문 35건·주문품목 61건 무변동.
-- ─────────────────────────────────────────────────────────────────────
-- 분류 기준(오탐 방지를 위해 보수적으로 설정, 나머지 49건 전수 육안 확인함)
--   (name ~ '^[A-Za-z]{14,}$' and phone ~ '^[1-9][0-9]{9,10}$' and orders = 0)
--   or email in ('emilie3630@gmail.com','faerisarvoodoorn+tz@gmail.com')  -- 스팸명·도메인삽입 2건


-- ─────────────────────────────────────────────────────────────────────
-- 앱 측 방어 (코드, 배포 필요)
--   lib/signup-guard.ts 신설 — 아래 4중 방어. 상세는 파일 주석 참조.
--     ① 허니팟        : 화면·스크린리더·탭이동에서 제외된 name="website" 필드
--     ② 제출 최소시간 : 폼 렌더 시각을 HMAC 서명한 토큰(fts). 3초 미만 거절, 1시간 만료
--     ③ IP 레이트리밋 : 동일 IP 시간당 5건
--     ④ Gmail 중복    : 정규화 비교 + 위 unique index 이중
--   모두 fail-open(조회 실패 시 통과) — 방어 오작동이 실고객 가입을 막지 않게 한다.
--   Turnstile(D-091)은 키가 주입되면 같은 자리에서 함께 작동한다(대체 아님, 누적).
-- ─────────────────────────────────────────────────────────────────────

-- 잔여(대표 수동):
--   · Turnstile 키 주입 — 넣으면 5중 방어가 된다. 위 4중은 키 없이도 작동.
--   · signup_attempt 90일 이전 행 주기적 삭제(크론 후보)
--   · 배포 후 signup_attempt 의 outcome 분포로 실제 차단 효과 관측
