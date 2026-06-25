-- Push-notification per-student daily send counter.
--
-- Backs the frequency cap promised in the DPIA
-- (docs/legal/PUSH-NOTIFICATIONS-COMPLIANCE.md §1.3 "daily cap"). One row per
-- (student, local day); the Fly.io sender increments it and refuses to send
-- once a student has hit the cap for that day. `day` is the student's LOCAL
-- calendar day (Asia/Jerusalem, computed by the sender) stored as a plain
-- date, so counts reset at local midnight.
--
-- Only the service-role sender touches this table (RLS on, no policies →
-- students/teachers cannot read raw send counters). The whole push feature
-- stays behind the `push_notifications` flag (OFF by default), so this is
-- inert until push is enabled.

CREATE TABLE IF NOT EXISTS public.push_daily_counts (
  uid    TEXT    NOT NULL,
  day    DATE    NOT NULL,
  count  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (uid, day)
);

ALTER TABLE public.push_daily_counts ENABLE ROW LEVEL SECURITY;
-- Intentionally NO policies: the service-role sender bypasses RLS; no other
-- role has any reason to read or write these counters.

-- Atomic insert-or-increment; returns the NEW count for the (uid, day).
-- SECURITY DEFINER so the service role can call it via RPC; execute is
-- revoked from anon/authenticated so a client can never inflate or read it.
CREATE OR REPLACE FUNCTION public.bump_push_daily_count(p_uid TEXT, p_day DATE)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count INTEGER;
BEGIN
  INSERT INTO public.push_daily_counts (uid, day, count)
  VALUES (p_uid, p_day, 1)
  ON CONFLICT (uid, day)
  DO UPDATE SET count = public.push_daily_counts.count + 1
  RETURNING count INTO new_count;
  RETURN new_count;
END;
$$;

REVOKE ALL ON FUNCTION public.bump_push_daily_count(TEXT, DATE) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.bump_push_daily_count(TEXT, DATE) FROM anon;
REVOKE ALL ON FUNCTION public.bump_push_daily_count(TEXT, DATE) FROM authenticated;

-- Old counter rows are dead weight after their day passes; the existing
-- cleanup_expired_data cron can prune them, but even unpruned the volume is
-- negligible (one tiny row per active student per day).
