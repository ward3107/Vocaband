-- 20260512120000_user_guides_seen.sql
--
-- Per-account first-time-guide tracking.  Previously dismissals lived
-- only in localStorage, so a teacher signing in from a second device
-- saw every guide again.  Storing the dismissed-guide keys on the
-- users row makes "seen once → never again" travel with the account.
--
-- Schema: text[] of GuideKey values (see src/hooks/useFirstTimeGuide.ts).
-- Default '{}' so existing rows behave identically to a brand-new
-- teacher's first day (every guide still auto-shows once, then
-- persists).

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS guides_seen text[] NOT NULL DEFAULT '{}'::text[];

COMMENT ON COLUMN public.users.guides_seen IS
  'Dismissed first-time-guide keys (e.g. classroom, approvals, worksheet). '
  'Append-only on dismiss via src/hooks/useFirstTimeGuide.ts; never cleared.';
