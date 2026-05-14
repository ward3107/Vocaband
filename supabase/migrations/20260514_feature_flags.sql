-- =============================================================================
-- Feature flags — safe gradual-rollout switch system
-- =============================================================================
--
-- WHY:
--
-- Vocaband is used by real Israeli schools during live class hours.  A
-- bad push that breaks Word Match at 09:00 ends a teacher's lesson and
-- costs us the school.  We need a way to ship new code while keeping
-- the user-visible feature OFF until we're confident it's safe — then
-- turn it on for one trusted class, watch for a day, then roll out to
-- everyone.  And if anything misbehaves: flip the switch off without a
-- redeploy.
--
-- HOW IT WORKS:
--
--   1. Every flag is one row in this table:
--        name='spelling_race'   enabled=false   enabled_for_classes=[]
--
--   2. Frontend code wraps a new feature in:
--        if (isFlagOn('spelling_race', classCode)) { ... new ... }
--
--   3. To launch:
--        a. enabled=false, enabled_for_classes=['ABC123']  → only that class sees it
--        b. enabled=true,  enabled_for_classes=[]          → everyone sees it
--        c. enabled=false                                  → kill switch — nobody sees it
--
--   4. Flags are world-readable (anyone, including anon students on the
--      QR-join screen, needs to read them).  Only admins can write.
--
-- =============================================================================

BEGIN;

-- ─── 1. Table ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.feature_flags (
  name                 text        PRIMARY KEY,
  enabled              boolean     NOT NULL DEFAULT false,
  -- Empty array + enabled=true   → everyone sees the feature.
  -- Non-empty array              → only those class CODES see the feature
  --                                (enabled flag is ignored for targeted rollouts —
  --                                listed classes always see it, others don't).
  enabled_for_classes  text[]      NOT NULL DEFAULT '{}'::text[],
  description          text        NOT NULL DEFAULT '',
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT feature_flags_name_format CHECK (
    -- Snake-case identifiers only.  Keeps flag names predictable and
    -- prevents accidental SQL-injection-flavoured names in the table.
    name ~ '^[a-z][a-z0-9_]{1,63}$'
  )
);

COMMENT ON TABLE public.feature_flags IS
  'Runtime feature switches.  Frontend reads via useFeatureFlags hook. '
  'Admins toggle rows directly in Supabase dashboard (or future admin UI). '
  'See migration 20260514_feature_flags.sql for the rollout playbook.';

COMMENT ON COLUMN public.feature_flags.enabled IS
  'Master switch.  true + empty enabled_for_classes = everyone.  false = nobody '
  '(unless they are in enabled_for_classes, in which case they still see it — '
  'this lets us turn a feature OFF globally but keep it on for a beta class).';

COMMENT ON COLUMN public.feature_flags.enabled_for_classes IS
  'Class CODES (the join code, e.g. "ABC123") that always see this feature '
  'regardless of the enabled column.  Use for beta rollouts: list one or two '
  'trusted classes, watch for a day, then flip enabled=true and clear this '
  'array for global rollout.';


-- ─── 2. updated_at auto-bump ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.feature_flags_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS feature_flags_updated_at ON public.feature_flags;
CREATE TRIGGER feature_flags_updated_at
  BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW
  EXECUTE FUNCTION public.feature_flags_set_updated_at();


-- ─── 3. RLS: world-read, admin-write ─────────────────────────────────
-- Reads must be open to everyone (anonymous QR-join students, logged-in
-- students, teachers) because the frontend evaluates flags BEFORE the
-- user picks a role.  Flag rows carry no secrets — just on/off state.
--
-- Writes are admin-only.  Uses the existing is_admin() function from
-- migration 004_teacher_allowlist.sql.

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS feature_flags_select ON public.feature_flags;
CREATE POLICY feature_flags_select ON public.feature_flags
  AS PERMISSIVE FOR SELECT TO public
  USING (true);

DROP POLICY IF EXISTS feature_flags_insert ON public.feature_flags;
CREATE POLICY feature_flags_insert ON public.feature_flags
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS feature_flags_update ON public.feature_flags;
CREATE POLICY feature_flags_update ON public.feature_flags
  AS PERMISSIVE FOR UPDATE TO public
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS feature_flags_delete ON public.feature_flags;
CREATE POLICY feature_flags_delete ON public.feature_flags
  AS PERMISSIVE FOR DELETE TO public
  USING (public.is_admin());

COMMENT ON POLICY feature_flags_select ON public.feature_flags IS
  'World-readable.  Flag state is not a secret — the frontend needs to '
  'evaluate flags during initial render, before auth has settled.';

COMMENT ON POLICY feature_flags_update ON public.feature_flags IS
  'Admins only.  Use the Supabase dashboard SQL editor or table editor '
  'while logged in as an admin user (users.role = ''admin'').';


-- ─── 4. Seed one documentation row ───────────────────────────────────
-- Not a real feature — just a self-documenting example so a new admin
-- opening the Supabase table for the first time sees how the columns
-- are used.  Safe to delete once real flags exist.

INSERT INTO public.feature_flags (name, enabled, enabled_for_classes, description)
VALUES (
  'example_flag',
  false,
  '{}'::text[],
  'Example row — delete me once real flags exist.  Set enabled=true to turn on globally, or add class codes to enabled_for_classes for a beta rollout.'
)
ON CONFLICT (name) DO NOTHING;

COMMIT;

-- =============================================================================
-- Rollout playbook (read this before adding a new flag):
--
-- 1. Pick a snake_case name (e.g. 'spelling_race', 'new_shop_layout').
--    Names are permanent; pick something descriptive.
--
-- 2. Add the row OFF first:
--      INSERT INTO public.feature_flags (name, description)
--      VALUES ('spelling_race', 'New game mode — beta');
--
-- 3. Ship the code wrapped in `isFlagOn('spelling_race', classCode)`.
--    Push to production — feature is invisible because enabled=false.
--
-- 4. Beta with one class:
--      UPDATE public.feature_flags
--      SET enabled_for_classes = ARRAY['ABC123']
--      WHERE name = 'spelling_race';
--    Wait a day.  Watch Sentry.  Ask the teacher how it went.
--
-- 5. Roll out to everyone:
--      UPDATE public.feature_flags
--      SET enabled = true, enabled_for_classes = '{}'::text[]
--      WHERE name = 'spelling_race';
--
-- 6. Something broke?  Kill switch:
--      UPDATE public.feature_flags SET enabled = false
--      WHERE name = 'spelling_race';
--    Feature disappears in < 60 seconds (the hook re-fetches periodically).
--
-- 7. Feature is stable and shipped?  Two-step cleanup:
--      a. Delete the `isFlagOn(...)` wrapping in the frontend.
--      b. DELETE FROM public.feature_flags WHERE name = 'spelling_race';
--    Order matters — remove code first so a stale flag row can't turn
--    off a feature that's now always-on.
--
-- ROLLBACK plan:
--   DROP TABLE public.feature_flags;
--   DROP FUNCTION public.feature_flags_set_updated_at();
--   The frontend hook returns `false` for any unknown flag (fail-closed),
--   so dropping the table makes all flagged features disappear — same
--   effect as setting enabled=false on every row.
-- =============================================================================
