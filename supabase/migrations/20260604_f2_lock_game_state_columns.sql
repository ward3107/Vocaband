-- =============================================================================
-- F2 — lock self-writable game-state columns on public.users (the actual lock)
-- =============================================================================
--
-- PREREQUISITE: 20260603_f2_game_state_rpcs.sql + the React PR that
-- routes useGameFinish / useGameState / useAwardBadge / GameView
-- through the new RPCs.  Without that PR in prod, applying this
-- migration breaks every game-finish, badge award, and power-up
-- consumption.
--
-- AUDIT FINDING (pen-test 2026-05-12, F2): public.users columns
--   xp, streak, badges, unlocked_avatars, unlocked_themes, power_ups,
--   pet_active_days, pet_last_active_date
-- were writable by the row's owner via direct REST UPDATE.  A logged-in
-- student could DevTools their own xp to 999,999, claim every badge,
-- and stack every power-up.  No data leak, no cross-tenant impact —
-- just gamification trust breaking at scale.
--
-- FIX: a BEFORE-UPDATE trigger that rejects writes to the locked
-- columns when called from authenticated clients.  Bypass for:
--   - SECURITY DEFINER RPCs (run as the function owner, typically
--     `postgres`), so award_progress_xp / award_self_badge /
--     consume_power_up / purchase_item / record_pet_activity /
--     award_reward / record_mission_progress all keep working.
--   - service_role calls (Stripe webhook, admin scripts, MCP).
--   - Platform admins (existing `is_admin()` helper).
--
-- Columns NOT locked (legitimately self-writable by the owner):
--   avatar, active_theme, active_title, active_frame  — equip picks
--     constrained to already-unlocked items, no fairness impact
--   display_name, timezone, guides_seen, first_rating*,
--     consent_*, subjects_taught, teacher_dashboard_theme
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.enforce_users_locked_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Bypass for service_role + SECURITY DEFINER callers (RPC body
  -- runs as the function owner, default `postgres`) + admins.  Direct
  -- writes from `authenticated` (the kid in DevTools) fall through to
  -- the column checks below.
  IF current_user IN ('postgres', 'service_role', 'supabase_admin')
     OR public.is_admin()
  THEN
    RETURN NEW;
  END IF;

  -- IS DISTINCT FROM handles NULL→NULL no-ops without raising.
  IF NEW.xp IS DISTINCT FROM OLD.xp THEN
    RAISE EXCEPTION 'Direct UPDATE of users.xp is not allowed. Use the award_progress_xp / purchase_item / award_reward / record_mission_progress RPC.'
      USING ERRCODE = '42501';
  END IF;
  IF NEW.streak IS DISTINCT FROM OLD.streak THEN
    RAISE EXCEPTION 'Direct UPDATE of users.streak is not allowed. Use the award_progress_xp RPC.'
      USING ERRCODE = '42501';
  END IF;
  IF NEW.badges IS DISTINCT FROM OLD.badges THEN
    RAISE EXCEPTION 'Direct UPDATE of users.badges is not allowed. Use the award_self_badge / award_reward RPC.'
      USING ERRCODE = '42501';
  END IF;
  IF NEW.unlocked_avatars IS DISTINCT FROM OLD.unlocked_avatars THEN
    RAISE EXCEPTION 'Direct UPDATE of users.unlocked_avatars is not allowed. Use the purchase_item RPC.'
      USING ERRCODE = '42501';
  END IF;
  IF NEW.unlocked_themes IS DISTINCT FROM OLD.unlocked_themes THEN
    RAISE EXCEPTION 'Direct UPDATE of users.unlocked_themes is not allowed. Use the purchase_item RPC.'
      USING ERRCODE = '42501';
  END IF;
  IF NEW.power_ups IS DISTINCT FROM OLD.power_ups THEN
    RAISE EXCEPTION 'Direct UPDATE of users.power_ups is not allowed. Use the purchase_item / consume_power_up RPC.'
      USING ERRCODE = '42501';
  END IF;
  IF NEW.pet_active_days IS DISTINCT FROM OLD.pet_active_days THEN
    RAISE EXCEPTION 'Direct UPDATE of users.pet_active_days is not allowed. Use the record_pet_activity RPC.'
      USING ERRCODE = '42501';
  END IF;
  IF NEW.pet_last_active_date IS DISTINCT FROM OLD.pet_last_active_date THEN
    RAISE EXCEPTION 'Direct UPDATE of users.pet_last_active_date is not allowed. Use the record_pet_activity RPC.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.enforce_users_locked_columns IS
  'F2 lock: rejects direct UPDATE of game-state columns (xp, streak, badges, '
  'unlocked_*, power_ups, pet_*) when called from authenticated clients.  '
  'SECURITY DEFINER RPCs and service_role bypass.  See 20260604 for the '
  'audit-finding context.';

DROP TRIGGER IF EXISTS users_locked_columns_guard ON public.users;

CREATE TRIGGER users_locked_columns_guard
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.enforce_users_locked_columns();

COMMENT ON TRIGGER users_locked_columns_guard ON public.users IS
  'F2 lock: blocks direct UPDATE of locked game-state columns.  Pair with '
  '20260603 (RPCs).  See docs/open-issues.md F2 entry for the full audit-'
  'finding and the React PR that has to ship before this trigger lands.';

COMMIT;

-- =============================================================================
-- Verification queries (run manually after applying this migration):
--
-- 1. Trigger exists:
--    SELECT tgname, tgrelid::regclass, tgenabled
--    FROM pg_trigger
--    WHERE tgname='users_locked_columns_guard';
--
-- 2. Authenticated direct write blocked (run from app session — NOT MCP):
--    UPDATE public.users SET xp = 99999 WHERE uid = auth.uid()::text;
--    -- Expect: ERROR 42501 'Direct UPDATE of users.xp is not allowed.'
--
-- 3. RPC path still works:
--    SELECT public.award_progress_xp(50, 1);
--    -- Expect: jsonb {success:true, new_xp:..., new_streak:1, clamped_delta:50}
--
-- 4. service_role (this MCP session) bypasses:
--    UPDATE public.users SET xp = xp WHERE uid = (SELECT uid FROM users LIMIT 1);
--    -- Expect: 1 row affected, no error
--
-- ROLLBACK plan (if anything breaks after apply):
--    DROP TRIGGER users_locked_columns_guard ON public.users;
--    -- That alone reverts the lock; the RPCs from 20260603 stay (they're
--    -- additive and don't depend on the trigger).
-- =============================================================================
