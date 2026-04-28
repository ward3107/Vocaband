-- =============================================================================
-- First-rating columns for the in-app rating prompt
-- =============================================================================
--
-- Adds three columns to public.users so we can:
--   1. Capture a teacher's or student's first rating (1-5 stars).
--   2. Remember when they rated so we never re-prompt.
--   3. Remember when they DISMISSED the prompt so we wait at least
--      7 days before asking again, instead of nagging on every load.
--
-- The prompt UI fires under these conditions:
--
--   TEACHER: opens dashboard AND has at least one assignment with
--   ≥3 distinct student plays — i.e. has seen real value.
--
--   STUDENT: just finished their FIRST game with score ≥70 — i.e.
--   they're feeling good and the experience worked.
--
-- Users can give feedback inside the app's rating modal by tapping
-- one of the 1-5 ratings.  No public review channel is wired today
-- — that comes later (App Store / Google Play / a public testimonials
-- wall).  The numeric rating alone gives us signal to start.
--
-- Backward compat: all three columns nullable so existing rows are
-- valid + the prompt fires for everyone exactly once.
-- =============================================================================

BEGIN;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS first_rating SMALLINT
    CHECK (first_rating IS NULL OR first_rating BETWEEN 1 AND 5);

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS first_rating_at TIMESTAMPTZ;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS rating_dismissed_at TIMESTAMPTZ;

COMMIT;

COMMENT ON COLUMN public.users.first_rating IS
  'In-app NPS-style rating, 1-5 stars.  Captured the FIRST time the '
  'user is prompted; never overwritten so we don''t inflate the '
  'sample with happy returning users.';

COMMENT ON COLUMN public.users.rating_dismissed_at IS
  'Set when the user closes the prompt without rating.  The prompt '
  'waits at least 7 days from this timestamp before re-asking, so '
  'we don''t nag every dashboard open.';
