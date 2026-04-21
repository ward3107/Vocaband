-- Add active_frame and active_title columns to the users table.
--
-- The shop ships frames (Crown / Fire / Gold / Rainbow / Lightning / …)
-- and titles (Scholar / Legend / Final Boss / …) that students can
-- purchase AND equip.  The purchase flow already writes to
-- `unlocked_avatars` (where both frames and titles are stored as
-- prefixed strings: `frame_crown`, `title_final_boss`) — that half
-- works.  The equip flow tried to write to `active_frame` and
-- `active_title` columns, but those columns were NEVER created in the
-- schema — so the updates silently went to nothing, and the dashboard
-- had nowhere to read the equipped id from.  Result: buying a frame
-- or title took XP and showed no visible change.  Black hole.
--
-- This migration plugs the hole.  IF NOT EXISTS so it's safe to run
-- twice; default NULL (student equips nothing by default).

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS active_frame TEXT;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS active_title TEXT;

COMMENT ON COLUMN public.users.active_frame IS
  'Id of the currently-equipped frame cosmetic, or NULL if none. Must be a frame id from src/constants/game.ts NAME_FRAMES.';

COMMENT ON COLUMN public.users.active_title IS
  'Id of the currently-equipped title cosmetic, or NULL if none. Must be a title id from src/constants/game.ts TITLES_CATALOG.';

-- No RLS changes needed — the existing users_update policy (added in
-- migration 20260340) permits the student to update their own row's
-- non-class_code fields, which includes these two columns.
