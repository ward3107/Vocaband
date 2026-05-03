-- Saved word groups: re-key by email so a teacher who logs in with
-- magic link AND with Google OAuth (same email, different auth.users
-- UUID) sees the same set of groups.
--
-- Background: when "Manual identity linking" isn't enabled in
-- Supabase Auth, the magic-link signin and the Google OAuth signin
-- create SEPARATE rows in auth.users for the same email — different
-- UUIDs.  Saved groups were keyed by teacher_uid (the UUID), so a
-- group saved while logged in via magic link became invisible after
-- the teacher signed in via Google OAuth, and vice-versa.
--
-- Fix: add a teacher_email column, backfill from auth.users, and
-- switch RLS + the unique-name index + the recent-lookup index to
-- use email instead of uid.  Email is the stable identity across
-- auth methods.  teacher_uid stays as a column for audit / future
-- use, but the FK + cascade are dropped so deleting one auth
-- identity (e.g. revoking the Google OAuth row) doesn't nuke groups
-- that the OTHER identity (the magic-link row) still owns.
--
-- Idempotent: every step uses IF EXISTS / IF NOT EXISTS / DROP-then-
-- CREATE.  Safe to re-run.

-- 1. Add the new column.
ALTER TABLE public.saved_word_groups
  ADD COLUMN IF NOT EXISTS teacher_email TEXT;

-- 2. Backfill from auth.users for any rows missing the email.
--    Lower-cased so the unique-name + RLS comparisons work
--    case-insensitively.
UPDATE public.saved_word_groups swg
SET    teacher_email = lower(au.email)
FROM   auth.users au
WHERE  swg.teacher_uid = au.id
  AND  (swg.teacher_email IS NULL OR swg.teacher_email = '');

-- 3. NOT NULL once backfilled.  Will fail if a row's auth.users
--    parent was deleted before backfill — operator must clean up
--    orphan rows manually before re-running this migration in that
--    case.
ALTER TABLE public.saved_word_groups
  ALTER COLUMN teacher_email SET NOT NULL;

-- 4. Drop the FK + cascade.  Without this, deleting one auth.users
--    row (say the kid's first OAuth signin that they later
--    abandoned) would also delete every row whose teacher_uid
--    happens to match that UUID — even if the SAME email is still
--    represented by another auth.users row that owns the same
--    groups via teacher_email.
ALTER TABLE public.saved_word_groups
  DROP CONSTRAINT IF EXISTS saved_word_groups_teacher_uid_fkey;

-- 5. Replace the RLS policies — switch from auth.uid() = teacher_uid
--    to email-match against the JWT.  Lower() both sides so the
--    comparison stays case-insensitive (auth.jwt's email comes
--    through with whatever casing the OAuth provider returned).
DROP POLICY IF EXISTS saved_word_groups_select_own ON public.saved_word_groups;
DROP POLICY IF EXISTS saved_word_groups_insert_own ON public.saved_word_groups;
DROP POLICY IF EXISTS saved_word_groups_update_own ON public.saved_word_groups;
DROP POLICY IF EXISTS saved_word_groups_delete_own ON public.saved_word_groups;

CREATE POLICY saved_word_groups_select_own
  ON public.saved_word_groups FOR SELECT TO authenticated
  USING (lower(teacher_email) = lower((auth.jwt() ->> 'email')::text));

CREATE POLICY saved_word_groups_insert_own
  ON public.saved_word_groups FOR INSERT TO authenticated
  WITH CHECK (lower(teacher_email) = lower((auth.jwt() ->> 'email')::text));

CREATE POLICY saved_word_groups_update_own
  ON public.saved_word_groups FOR UPDATE TO authenticated
  USING (lower(teacher_email) = lower((auth.jwt() ->> 'email')::text))
  WITH CHECK (lower(teacher_email) = lower((auth.jwt() ->> 'email')::text));

CREATE POLICY saved_word_groups_delete_own
  ON public.saved_word_groups FOR DELETE TO authenticated
  USING (lower(teacher_email) = lower((auth.jwt() ->> 'email')::text));

-- 6. Re-key the unique-name index.  Old: (teacher_uid,
--    lower(trim(name))).  New: (lower(teacher_email),
--    lower(trim(name))).  Same anti-duplicate purpose, now scoped
--    to the email instead of the UUID.
DROP INDEX IF EXISTS saved_word_groups_teacher_name_uniq;
CREATE UNIQUE INDEX saved_word_groups_teacher_name_uniq
  ON public.saved_word_groups (lower(teacher_email), lower(trim(name)));

-- 7. Re-key the recent-lookup index for the wizard's "your saved
--    groups" sort.
DROP INDEX IF EXISTS saved_word_groups_teacher_recent_idx;
CREATE INDEX saved_word_groups_teacher_recent_idx
  ON public.saved_word_groups (lower(teacher_email), created_at DESC);

-- After this migration runs successfully, the app's
-- useSavedWordGroups hook (src/hooks/useSavedWordGroups.ts) reads
-- and writes teacher_email instead of teacher_uid.  The teacher_uid
-- column stays populated on insert (audit / debugging) but no
-- query filter relies on it.
