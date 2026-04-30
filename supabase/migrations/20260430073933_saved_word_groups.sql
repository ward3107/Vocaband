-- Saved word groups — per-teacher persistent storage so the
-- wizard's "Saved Groups" picker survives logout / device change.
-- Previously stored in localStorage under the key
-- 'vocaband-saved-groups', which meant a teacher who logged out OR
-- moved to a different device lost everything.
--
-- Idempotent: every CREATE has IF NOT EXISTS or DROP-then-CREATE.
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS public.saved_word_groups (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_uid  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 80),
  -- Word IDs from the curriculum vocabulary OR negative IDs for
  -- custom words.  Stored as int8 array so we can fit Date.now()-
  -- based negative IDs (which are 13-digit timestamps and overflow
  -- int4).
  word_ids     BIGINT[] NOT NULL CHECK (array_length(word_ids, 1) BETWEEN 1 AND 500),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Most-recent-first lookup per teacher
CREATE INDEX IF NOT EXISTS saved_word_groups_teacher_recent_idx
  ON public.saved_word_groups (teacher_uid, created_at DESC);

-- Ensure no duplicate group names per teacher (so renames have a
-- unique target).  Case-insensitive match.
CREATE UNIQUE INDEX IF NOT EXISTS saved_word_groups_teacher_name_uniq
  ON public.saved_word_groups (teacher_uid, lower(trim(name)));

ALTER TABLE public.saved_word_groups ENABLE ROW LEVEL SECURITY;

-- DROP existing policies first so this migration is fully idempotent
-- even if previously partially-applied.
DROP POLICY IF EXISTS saved_word_groups_select_own ON public.saved_word_groups;
DROP POLICY IF EXISTS saved_word_groups_insert_own ON public.saved_word_groups;
DROP POLICY IF EXISTS saved_word_groups_update_own ON public.saved_word_groups;
DROP POLICY IF EXISTS saved_word_groups_delete_own ON public.saved_word_groups;

CREATE POLICY saved_word_groups_select_own
  ON public.saved_word_groups FOR SELECT TO authenticated
  USING (auth.uid() = teacher_uid);

CREATE POLICY saved_word_groups_insert_own
  ON public.saved_word_groups FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = teacher_uid);

CREATE POLICY saved_word_groups_update_own
  ON public.saved_word_groups FOR UPDATE TO authenticated
  USING (auth.uid() = teacher_uid)
  WITH CHECK (auth.uid() = teacher_uid);

CREATE POLICY saved_word_groups_delete_own
  ON public.saved_word_groups FOR DELETE TO authenticated
  USING (auth.uid() = teacher_uid);

-- Touch the updated_at column on UPDATE so renames are timestamped.
CREATE OR REPLACE FUNCTION public.touch_saved_word_groups_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS saved_word_groups_touch_updated_at
  ON public.saved_word_groups;

CREATE TRIGGER saved_word_groups_touch_updated_at
  BEFORE UPDATE ON public.saved_word_groups
  FOR EACH ROW EXECUTE FUNCTION public.touch_saved_word_groups_updated_at();

-- Grant baseline (RLS still gates everything; without these grants
-- the authenticated role can't even attempt the queries).
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_word_groups TO authenticated;
