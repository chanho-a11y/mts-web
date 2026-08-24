-- ============================================================================
-- 관리자 분석 확장 · 기반 (Stage 0 + Stage 1)
-- 2026-08-24 · Supabase mtspace-commerce (apiskyivlvebpvvxfejq)
--
-- 이 파일이 하는 일
--   1) 시·도 정규화 함수 신설 + mcp_region 이 이를 쓰도록 교체
--   2) orders.customer_type 백필 (대표 승인 완료 — 전수 백필 + admin 분리)
--   3) orders(placed_at) 인덱스
--   4) 관리자 분석 집계 함수 9종 (SECURITY INVOKER = RLS 적용 + is_admin() 가드)
--
-- 설계 원칙
--   · 관리자 분석 페이지는 service-role 이 아니라 RLS 를 타는 anon 키 + 사용자
--     세션 클라이언트를 쓴다. 따라서 여기서 만드는 것은 절대 SECURITY DEFINER 로
--     두지 않는다. 기본값(INVOKER)이면 기존 RLS 정책의 `OR is_admin()` 덕에
--     관리자=전체 / 회원=본인 이 정책 변경 없이 성립한다.
--   · 그 위에 admin_tier_price_table 과 같은 방식으로 본문에 is_admin() 가드를
--     한 번 더 둔다(이중 방어).
--   · 매출 상태 정본은 public.mcp_revenue_statuses(). 값을 복제하지 않고 호출한다.
--     (그러려면 authenticated 에 EXECUTE 가 필요 — 상수 배열만 반환하는
--      IMMUTABLE 함수라 데이터 노출이 없다.)
--   · 삭제(DROP) 는 하지 않는다. 전부 CREATE OR REPLACE / IF NOT EXISTS.
-- ============================================================================

-- (MCP apply_migration 은 자체 트랜잭션으로 감싸므로 begin/commit 을 두지 않는다)

-- ────────────────────────────────────────────────────────────────────────────
-- 1. 시·도 정규화
--    shipping_address 에 시/도 필드가 없어 addr1 첫 토큰에 의존한다. 사용자가
--    "강원특별자치도" 로도 "강원" 으로도 써서 같은 지역이 갈라져 집계됐다.
--    TS 쪽 정본은 new-website/lib/region.ts — 규칙 변경 시 함께 고칠 것.
-- ────────────────────────────────────────────────────────────────────────────
create or replace function public.region_normalize(p_raw text)
returns text
language sql
immutable
set search_path to ''
as $$
  select case
    when p_raw is null or btrim(p_raw) = '' then '기타'
    when btrim(p_raw) like '서울%'   then '서울'
    when btrim(p_raw) like '부산%'   then '부산'
    when btrim(p_raw) like '대구%'   then '대구'
    when btrim(p_raw) like '인천%'   then '인천'
    when btrim(p_raw) like '광주%'   then '광주'
    when btrim(p_raw) like '대전%'   then '대전'
    when btrim(p_raw) like '울산%'   then '울산'
    when btrim(p_raw) like '세종%'   then '세종'
    when btrim(p_raw) like '경기%'   then '경기'
    when btrim(p_raw) like '강원%'   then '강원'
    when btrim(p_raw) like '충청북%' then '충북'
    when btrim(p_raw) like '충청남%' then '충남'
    when btrim(p_raw) like '충북%'   then '충북'
    when btrim(p_raw) like '충남%'   then '충남'
    when btrim(p_raw) like '전라북%' then '전북'
    when btrim(p_raw) like '전라남%' then '전남'
    when btrim(p_raw) like '전북%'   then '전북'
    when btrim(p_raw) like '전남%'   then '전남'
    when btrim(p_raw) like '경상북%' then '경북'
    when btrim(p_raw) like '경상남%' then '경남'
    when btrim(p_raw) like '경북%'   then '경북'
    when btrim(p_raw) like '경남%'   then '경남'
    when btrim(p_raw) like '제주%'   then '제주'
    else '기타'
  end
$$;

comment on function public.region_normalize(text) is
  '주소 첫 토큰 등을 17개 시·도 표준명으로 접는다. TS 정본: lib/region.ts';

-- 주소(jsonb) → 표준 시·도. 해외 주소는 "해외".
-- 기존 mcp_region 은 split_part(addr1,' ',1) 을 그대로 돌려줘 MCP 리포트도
-- 같은 오차를 갖고 있었다. 시그니처·반환형 동일하므로 교체해도 안전하다.
create or replace function public.mcp_region(addr jsonb)
returns text
language sql
immutable
set search_path to ''
as $$
  select case
    when coalesce(nullif(upper(btrim(addr->>'country')), ''), 'KR') <> 'KR' then '해외'
    else public.region_normalize(split_part(btrim(coalesce(addr->>'addr1','')), ' ', 1))
  end
$$;

grant execute on function public.region_normalize(text) to anon, authenticated;

-- 매출 상태 정본을 관리자 화면에서도 호출할 수 있게 한다.
-- 상수 배열만 반환하는 IMMUTABLE·INVOKER 함수라 데이터 노출이 없다.
grant execute on function public.mcp_revenue_statuses() to authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. orders.customer_type 백필
--    체크아웃에 "individual" 이 하드코딩돼 전 주문이 일반회원으로 기록됐다.
--    (코드 수정은 app/checkout/actions.ts 에서 함께 반영)
--    규칙: 비회원=guest / role=admin=admin / role=business & 승인완료=business
--          / role=influencer=influencer / 그 외(승인 대기 사업자 포함)=individual
--          ※ 승인 대기를 individual 로 두는 것은 D-055 "대기=소매만" 과 일치
--    orders 테이블 UPDATE 에 걸린 트리거가 없어 다른 로직이 딸려 움직이지 않는다.
-- ────────────────────────────────────────────────────────────────────────────
update public.orders o
set customer_type = sub.t
from (
  select o2.id,
         case
           when o2.profile_id is null then 'guest'
           when p.role = 'admin' then 'admin'
           when p.role = 'business' and b.status = 'approved' then 'business'
           when p.role = 'influencer' then 'influencer'
           else 'individual'
         end as t
  from public.orders o2
  left join public.profiles p on p.id = o2.profile_id
  left join public.business_accounts b on b.profile_id = o2.profile_id
) sub
where sub.id = o.id
  and coalesce(o.customer_type, '') is distinct from sub.t;

-- ────────────────────────────────────────────────────────────────────────────
-- 3. 인덱스 — 신규 지표는 전부 placed_at 으로 기간을 자른다.
-- ────────────────────────────────────────────────────────────────────────────
create index if not exists idx_orders_placed_at on public.orders (placed_at desc);
create index if not exists idx_orders_customer_type on public.orders (customer_type);

