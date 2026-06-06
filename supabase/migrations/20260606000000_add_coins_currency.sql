-- =============================================================================
-- Coins currency (shop remake Phase 1)
-- Adds a spend currency decoupled from XP. XP stays rank-only; Coins are
-- earned on game finish and spent in the shop. Coins join the F2 locked
-- columns so only SECURITY DEFINER RPCs can write them.
-- =============================================================================
BEGIN;

-- 1. Column
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS coins INTEGER NOT NULL DEFAULT 0;

-- 2. One-time goodwill seed: 10% of lifetime XP, capped at 500. Only touches
--    rows that are still at the default 0 so re-running is a no-op.
UPDATE public.users
  SET coins = LEAST(round(COALESCE(xp, 0) * 0.10)::int, 500)
  WHERE role = 'student' AND coins = 0;

-- 3. Lock the column in the F2 guard (re-create the trigger function with the
--    extra check appended; everything else is copied verbatim from
--    20260604_f2_lock_game_state_columns.sql).
CREATE OR REPLACE FUNCTION public.enforce_users_locked_columns()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER
SET search_path = public, auth AS $$
BEGIN
  IF current_user IN ('postgres', 'service_role', 'supabase_admin')
     OR public.is_admin() THEN
    RETURN NEW;
  END IF;
  IF NEW.xp IS DISTINCT FROM OLD.xp THEN
    RAISE EXCEPTION 'Direct UPDATE of users.xp is not allowed. Use the award_progress_xp / purchase_item / award_reward / record_mission_progress RPC.' USING ERRCODE = '42501';
  END IF;
  IF NEW.coins IS DISTINCT FROM OLD.coins THEN
    RAISE EXCEPTION 'Direct UPDATE of users.coins is not allowed. Use the award_coins / purchase_item RPC.' USING ERRCODE = '42501';
  END IF;
  IF NEW.streak IS DISTINCT FROM OLD.streak THEN
    RAISE EXCEPTION 'Direct UPDATE of users.streak is not allowed. Use the award_progress_xp RPC.' USING ERRCODE = '42501';
  END IF;
  IF NEW.badges IS DISTINCT FROM OLD.badges THEN
    RAISE EXCEPTION 'Direct UPDATE of users.badges is not allowed. Use the award_self_badge / award_reward RPC.' USING ERRCODE = '42501';
  END IF;
  IF NEW.unlocked_avatars IS DISTINCT FROM OLD.unlocked_avatars THEN
    RAISE EXCEPTION 'Direct UPDATE of users.unlocked_avatars is not allowed. Use the purchase_item RPC.' USING ERRCODE = '42501';
  END IF;
  IF NEW.unlocked_themes IS DISTINCT FROM OLD.unlocked_themes THEN
    RAISE EXCEPTION 'Direct UPDATE of users.unlocked_themes is not allowed. Use the purchase_item RPC.' USING ERRCODE = '42501';
  END IF;
  IF NEW.power_ups IS DISTINCT FROM OLD.power_ups THEN
    RAISE EXCEPTION 'Direct UPDATE of users.power_ups is not allowed. Use the purchase_item / consume_power_up RPC.' USING ERRCODE = '42501';
  END IF;
  IF NEW.pet_active_days IS DISTINCT FROM OLD.pet_active_days THEN
    RAISE EXCEPTION 'Direct UPDATE of users.pet_active_days is not allowed. Use the record_pet_activity RPC.' USING ERRCODE = '42501';
  END IF;
  IF NEW.pet_last_active_date IS DISTINCT FROM OLD.pet_last_active_date THEN
    RAISE EXCEPTION 'Direct UPDATE of users.pet_last_active_date is not allowed. Use the record_pet_activity RPC.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.enforce_users_locked_columns IS
  'F2 lock (SECURITY INVOKER — DEFINER was a bug, see 20260605).  Rejects '
  'direct UPDATE of game-state columns (now incl. coins) when current_user '
  'is authenticated; bypassed for postgres/service_role/admin so RPCs work.';

-- 4. award_coins — grants clamped coins to the caller. Mirrors
--    award_progress_xp's shape. Clamp guards against a spoofed client.
CREATE OR REPLACE FUNCTION public.award_coins(p_coin_delta INTEGER)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth AS $$
DECLARE
  -- Clamp 0..200: floor blocks negative "grants", ceiling caps the max a
  -- single game can pay (see coins-foundation plan §1 earn table).
  v_delta INTEGER := GREATEST(0, LEAST(COALESCE(p_coin_delta, 0), 200));
  v_new   INTEGER;
BEGIN
  UPDATE public.users
    SET coins = COALESCE(coins, 0) + v_delta
    WHERE uid = auth.uid()::text
    RETURNING coins INTO v_new;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;
  RETURN json_build_object('success', true, 'new_coins', v_new, 'granted', v_delta);
END;
$$;

REVOKE ALL ON FUNCTION public.award_coins(INTEGER) FROM anon;
GRANT EXECUTE ON FUNCTION public.award_coins(INTEGER) TO authenticated;

-- 5. purchase_item — now debits COINS, not XP. Body copied from migration 009
--    with xp->coins and the returned key new_xp->new_coins.
CREATE OR REPLACE FUNCTION public.purchase_item(
  item_type TEXT, item_id TEXT, item_cost INTEGER
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth AS $$
DECLARE
  current_coins INTEGER;
  current_list  JSONB;
  column_name   TEXT;
  user_row      RECORD;
BEGIN
  CASE item_type
    WHEN 'avatar' THEN column_name := 'unlocked_avatars';
    WHEN 'theme'  THEN column_name := 'unlocked_themes';
    WHEN 'frame'  THEN column_name := 'unlocked_frames';
    WHEN 'title'  THEN column_name := 'unlocked_titles';
    WHEN 'power_up' THEN column_name := 'power_ups';
    ELSE RETURN json_build_object('success', false, 'error', 'Invalid item type');
  END CASE;

  SELECT * INTO user_row FROM public.users WHERE uid = auth.uid()::text FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;

  current_coins := COALESCE(user_row.coins, 0);
  IF current_coins < item_cost THEN
    RETURN json_build_object('success', false, 'error', 'Not enough coins');
  END IF;

  IF item_type = 'power_up' THEN
    current_list := COALESCE(user_row.power_ups, '{}'::jsonb);
    UPDATE public.users
      SET coins = current_coins - item_cost,
          power_ups = jsonb_set(current_list, ARRAY[item_id], to_jsonb(COALESCE((current_list->>item_id)::int, 0) + 1))
      WHERE uid = auth.uid()::text;
  ELSE
    EXECUTE format(
      'UPDATE public.users SET coins = $1, %I = array_append(COALESCE(%I, ARRAY[]::text[]), $2) WHERE uid = $3',
      column_name, column_name
    ) USING current_coins - item_cost, item_id, auth.uid()::text;
  END IF;

  RETURN json_build_object('success', true, 'new_coins', current_coins - item_cost);
END;
$$;

REVOKE ALL ON FUNCTION public.purchase_item(TEXT, TEXT, INTEGER) FROM anon;
GRANT EXECUTE ON FUNCTION public.purchase_item(TEXT, TEXT, INTEGER) TO authenticated;

COMMIT;
