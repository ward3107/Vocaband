-- Parent Weekly Digest — opt-in columns on public.users.
--
-- Phase 1 of the Friday parent-email feature. Captures the parent's
-- contact + their preferred language at the moment a student (or, in
-- a future flow, the teacher on behalf of a student) opts in. The
-- digest worker + cron schedule arrive in later migrations; this one
-- just locks in the schema so the column starts populating as soon
-- as the opt-in UI ships.
--
-- All three columns are nullable: parent_email being NULL means the
-- student has not opted in. The locale + opt-in timestamp are filled
-- together with the email so the digest worker can both pick the
-- right template and surface the consent timestamp if a parent ever
-- asks "when did my kid sign me up for this?".
--
-- Not gated by the F2 enforce_users_locked_columns trigger — that
-- guard blocks game-state columns (xp/streak/badges/etc.) so they
-- can only change via the SECURITY DEFINER RPCs. Parent email is
-- contact info the student owns directly, same as display_name and
-- email; lives outside the lock.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS parent_email TEXT,
  ADD COLUMN IF NOT EXISTS parent_email_locale TEXT,
  ADD COLUMN IF NOT EXISTS parent_email_opt_in_at TIMESTAMPTZ;

-- Sanity checks. Email format is intentionally loose — a contains-@
-- check catches obvious paste-the-wrong-field mistakes while leaving
-- full RFC validation to Resend's bounce handling, which is the only
-- ground truth anyway.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_parent_email_locale_check'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_parent_email_locale_check
        CHECK (parent_email_locale IS NULL OR parent_email_locale IN ('en', 'he', 'ar'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_parent_email_format_check'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_parent_email_format_check
        CHECK (parent_email IS NULL OR parent_email LIKE '%_@_%');
  END IF;
END $$;

COMMENT ON COLUMN public.users.parent_email IS
  'Parent contact for the weekly progress digest. NULL = not opted in. Owner-writable; not behind the F2 game-state lock.';
COMMENT ON COLUMN public.users.parent_email_locale IS
  'Language code (en|he|ar) the digest email is rendered in. Captured at opt-in time so it stays stable even if the student later changes their UI language.';
COMMENT ON COLUMN public.users.parent_email_opt_in_at IS
  'Timestamp the student set parent_email. Surfaced in any future "when did I sign up for this?" parent inquiry.';
