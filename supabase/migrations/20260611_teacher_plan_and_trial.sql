-- 20260611_teacher_plan_and_trial — add plan + 30-day trial to teachers.
--
-- Strategy: the `plan` column tracks PAID state only ('free' | 'pro' |
-- 'school').  The `trial_ends_at` timestamp gives a 30-day Pro trial
-- window even for plan='free'.  The app evaluates the EFFECTIVE plan
-- at runtime via src/core/plan.ts:
--
--   effectivePlan(user) =
--     plan === 'pro' || plan === 'school'             → pro
--     plan === 'free' && trial_ends_at > now()        → pro (trialing)
--     otherwise                                       → free
--
-- This avoids a daily cron-job to flip rows when trials expire.  The
-- DB stays purely declarative.
--
-- Existing teachers (rows that pre-date this migration) are grandfathered
-- into a fresh 30-day trial — they've been using the unlimited app for
-- free until now, suddenly hard-gating them would burn goodwill.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS plan          TEXT        NOT NULL DEFAULT 'free'
    CHECK (plan IN ('free', 'pro', 'school')),
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ NULL;

-- Used by analytics ("how many trials end this week?") and (eventually)
-- by a "your trial ends tomorrow" reminder email.  Cheap on writes
-- because trial_ends_at is set once at signup and never updated.
CREATE INDEX IF NOT EXISTS idx_users_trial_ends_at
  ON public.users (trial_ends_at)
  WHERE trial_ends_at IS NOT NULL;

-- ── Grandfather existing teachers ────────────────────────────────
-- Anyone who was a teacher BEFORE this migration ran gets a fresh
-- 30-day trial starting today.  New teachers (post-migration) get
-- their trial set by the app at signup time, NOT here.
UPDATE public.users
   SET trial_ends_at = now() + INTERVAL '30 days'
 WHERE role = 'teacher'
   AND trial_ends_at IS NULL
   AND plan = 'free';

COMMENT ON COLUMN public.users.plan IS
  'Paid plan tier. ''free'' is the default; ''pro'' / ''school'' are set when the teacher (or their school) starts paying. Effective plan at runtime also considers trial_ends_at — see src/core/plan.ts.';

COMMENT ON COLUMN public.users.trial_ends_at IS
  'Timestamp when the 30-day Pro trial expires. While > now() and plan=''free'', the teacher gets Pro features. NULL for non-trialing users (e.g., Pro/School who already pay) and historical rows pre-migration.';
