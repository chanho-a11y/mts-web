-- D-142 롯데 송장 등록과 운송장 포함 출고 메일 (2026-10-12)
-- 1) shipment.notified_at: 고객에게 출고(운송장) 메일을 보낸 시각. 재업로드 시 중복 발송 방지 키.
-- 2) 기존 행 백필: 구 흐름은 '출고' 처리 즉시 운송장 없는 출고 메일을 보냈으므로 이미 안내된 것으로 본다.
--    (이 백필이 없으면 과거 출고분에 송장을 등록할 때 메일이 한 번 더 나간다)
-- 3) 같은 주문에 같은 운송장이 두 번 들어가지 않도록 부분 유니크 인덱스.
-- 한 주문에 운송장 여러 개(박스 분할)를 허용하므로 shipment 는 주문당 여러 행일 수 있다.

alter table public.shipment add column if not exists notified_at timestamptz;

update public.shipment
   set notified_at = coalesce(shipped_at, created_at)
 where notified_at is null;

create unique index if not exists shipment_order_tracking_uniq
  on public.shipment (order_id, tracking_no)
  where tracking_no is not null;
