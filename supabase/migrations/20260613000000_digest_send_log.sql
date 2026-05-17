-- Parent Weekly Digest — idempotency log.
--
-- Phase 2 of the Friday parent-email feature: the send_parent_digest
-- Edge Function inserts into this table BEFORE returning success, and
-- the UNIQUE (student_uid, week_start_date) constraint means a duplicate
-- invocation in the same week (whether from a cron retry, a manual
-- re-fire, or two parallel pg_cron jobs) lands a constraint violation
-- instead of double-emailing a parent.
--
-- week_start_date is the Monday of the digest's covered week, ISO 8601
-- format. The cron job (Phase 3) computes this in the IL timezone so
-- a Friday-afternoon send for the prior week-ending-Sunday lines up
-- with how parents intuit "this week" — week starts Mon, ends Sun.
--
-- resend_email_id is the response ID from the Resend API call. Kept
-- nullable so failed-but-logged sends (the rare race where the row
-- is reserved but the HTTP call errors mid-flight) can still be
-- diagnosed; the function clears its row in that case so a retry
-- can proceed.

CREATE TABLE IF NOT EXISTS public.digest_send_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_uid     TEXT NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  parent_email    TEXT NOT NULL CHECK (parent_email LIKE '%_@_%'),
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  resend_email_id TEXT,
  UNIQUE (student_uid, week_start_date)
);

CREATE INDEX IF NOT EXISTS idx_digest_send_log_sent_at
  ON public.digest_send_log (sent_at DESC);

-- RLS: locked down completely. Only service_role can read or write.
-- No client should ever touch this table directly — the Edge Function
-- runs with the service role key.
ALTER TABLE public.digest_send_log ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.digest_send_log IS
  'Idempotency log for the parent weekly digest. UNIQUE (student_uid, week_start_date) prevents double-sends. Service-role only.';
COMMENT ON COLUMN public.digest_send_log.week_start_date IS
  'Monday of the digest''s covered week in IL timezone, ISO 8601 date.';
COMMENT ON COLUMN public.digest_send_log.resend_email_id IS
  'Resend API response ID for outbound tracing. Nullable for the race where the row is reserved but the HTTP call errors.';
