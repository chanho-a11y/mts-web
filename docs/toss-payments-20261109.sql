-- D-161 토스페이먼츠 병행 연동: payment.provider enum 에 'toss' 추가.
-- 비파괴 변경(값 추가만). 기존 행, 뷰, 함수에 영향 없음. 되돌릴 필요가 생기면 코드에서 toss 선택지만 숨기면 된다.
-- 적용은 대표 '적용해' 승인 후 (맥 배포 대행기 ACTION=migrate 또는 Supabase SQL Editor).
alter type public.payment_provider add value if not exists 'toss';

-- 확인
select enumlabel from pg_enum e join pg_type t on t.oid = e.enumtypid where t.typname = 'payment_provider' order by e.enumsortorder;
