-- =============================================================================
-- F2 hotfix: enforce_users_locked_columns must be SECURITY INVOKER
-- =============================================================================
--
-- BUG (discovered during 20260604 apply-time verification, 2026-05-13):
--   The original trigger function shipped as SECURITY DEFINER, which
--   means it runs as its OWNER (postgres).  Inside a SECURITY DEFINER
--   function `current_user` evaluates to the function owner, not the
--   session role.  So the bypass clause:
--
--     IF current_user IN ('postgres', 'service_role', 'supabase_admin')
--        OR public.is_admin()
--     THEN RETURN NEW; END IF;
--
--   was ALWAYS true.  Every UPDATE — including from authenticated
--   end-users via direct REST — silently bypassed the column-lock
--   checks.  The trigger was effectively dead code.
--
-- VERIFICATION before the fix:
--   SET LOCAL ROLE authenticated;
--   SET request.jwt.claims TO '{"sub":"<student-uid>","role":"authenticated"}';
--   UPDATE public.users SET xp = 999999 WHERE uid = <that-uid>;  -- ACCEPTED ✗
--
-- VERIFICATION after the fix (SECURITY INVOKER, ditto setup):
--   UPDATE public.users SET xp = 999999 WHERE uid = <that-uid>;  -- 42501 ✓
--
-- Why INVOKER is correct for this trigger:
--   - Direct REST UPDATE from authenticated session → trigger sees
--     current_user = 'authenticated' → bypass FALSE → column checks
--     fire → exception raised.
--   - SECURITY DEFINER RPC (award_progress_xp / purchase_item / …)
--     does an UPDATE inside its body → the RPC has already changed
--     current_user to postgres → the (INVOKER) trigger inherits that
--     context → current_user = 'postgres' → bypass TRUE → UPDATE
--     succeeds.  No regression on legitimate RPC paths.
--   - service_role (Stripe webhook, admin scripts, MCP queries) →
--     current_user = 'service_role' → bypass TRUE → UPDATE succeeds.
--
-- is_admin() is itself SECURITY DEFINER so it can still read users
-- regardless of the calling context.
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.enforce_users_locked_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, auth
AS $$
BEGIN
  IF current_user IN ('postgres', 'service_role', 'supabase_admin')
     OR public.is_admin()
  THEN
    RETURN NEW;
  END IF;

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
  'F2 lock (SECURITY INVOKER — DEFINER was a bug, see 20260605).  '
  'Rejects direct UPDATE of game-state columns when current_user is '
  'authenticated; bypassed for postgres/service_role/admin so RPCs and '
  'webhooks keep working.';

COMMIT;
