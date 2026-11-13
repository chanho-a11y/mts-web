-- D-166 관리자 문의함(contact_message) 상태 관리 (2026-11-13)
-- 상태: new(신규) / replied(회신완료) / hold(보류) / closed(종료, 미회신) / duplicate(중복)

ALTER TABLE public.contact_message
  ADD COLUMN IF NOT EXISTS handled_at timestamptz,
  ADD COLUMN IF NOT EXISTS handled_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS admin_note text;

ALTER TABLE public.contact_message DROP CONSTRAINT IF EXISTS contact_message_status_chk;
ALTER TABLE public.contact_message
  ADD CONSTRAINT contact_message_status_chk
  CHECK (status IN ('new','replied','hold','closed','duplicate'));

ALTER TABLE public.contact_message DROP CONSTRAINT IF EXISTS contact_message_note_chk;
ALTER TABLE public.contact_message
  ADD CONSTRAINT contact_message_note_chk CHECK (length(COALESCE(admin_note,'')) <= 2000);

-- 익명 INSERT(with_check true)로 상태나 처리 필드를 미리 채워 넣지 못하게 막는다.
CREATE OR REPLACE FUNCTION public.contact_message_insert_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN
    NEW.status := 'new';
    NEW.handled_at := NULL;
    NEW.handled_by := NULL;
    NEW.admin_note := NULL;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS contact_message_insert_guard ON public.contact_message;
CREATE TRIGGER contact_message_insert_guard
  BEFORE INSERT ON public.contact_message
  FOR EACH ROW EXECUTE FUNCTION public.contact_message_insert_guard();

-- 관리자만 상태 변경
DROP POLICY IF EXISTS contact_admin_update ON public.contact_message;
CREATE POLICY contact_admin_update ON public.contact_message
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE INDEX IF NOT EXISTS contact_message_status_created_idx
  ON public.contact_message (status, created_at DESC);
CREATE INDEX IF NOT EXISTS contact_message_email_created_idx
  ON public.contact_message (email, created_at DESC);
