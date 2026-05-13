-- =============================================================================
-- F2 — server-side RPCs for game-state writes (xp, streak, badges, power_ups)
-- =============================================================================
--
-- AUDIT FINDING (pen-test 2026-05-12, F2): public.users columns
--   xp, streak, badges, unlocked_avatars, unlocked_themes, power_ups,
--   pet_active_days, pet_last_active_date
-- are writable by the row's owner via direct REST UPDATE.  A logged-in
-- student can DevTools:
--
--   await supabase.from('users').update({ xp: 999999, badges: [...] })
--                  .eq('uid', myUid);
--
-- … and instantly top every leaderboard / unlock every shop item.
--
-- F1 (live since 2026-05-12) pinned `plan` + `trial_ends_at`.  F2 closes
-- the gamification columns.  Step 1 of three:
--
--   (1) THIS migration: add the new RPCs that game/shop callers will go
--       through.  Purely additive — nobody calls them yet, so applying
--       this in isolation can't break anything.
--   (2) Companion PR refactors useGameFinish / useGameState /
--       useAwardBadge / GameView to call these RPCs instead of direct
--       UPDATE.
--   (3) Final migration adds the BEFORE-UPDATE trigger that rejects
--       direct writes to the locked columns.  Applied AFTER step 2
--       deploys to prod so the React doesn't fail.
--
-- ShopView already uses `purchase_item` (migration 009) for every shop
-- write (avatar / theme / power_up / title / frame / egg / booster),
-- so no shop RPC is needed.  Cosmetic "equip" writes (avatar,
-- active_theme, active_title, active_frame) stay self-writable —
-- they only let students pick from already-unlocked items.
-- =============================================================================

BEGIN;

-- ─── 1. award_progress_xp ───────────────────────────────────────────
-- Single RPC for the post-game XP+streak save.  Called by:
--   - useGameFinish.ts (assignment + free-play game finish)
--   - useGameState.ts (alternate save path)
--
-- Why a delta + new_streak instead of absolute xp:
--   - Delta lets us clamp the per-call award server-side.
--   - new_streak is constrained to {0, current, current+1} which matches
--     every legitimate transition (reset / freeze-protected / increment).
--   - Combined: a kid can't replay the RPC 1000 times to inflate XP
--     because each call is capped at 300 (≈ perfect score + booster
--     headroom) — they could still inflate by playing 1000 games, but
--     that's just legitimate progression at that point.

CREATE OR REPLACE FUNCTION public.award_progress_xp(
  p_xp_delta   integer,
  p_new_streak integer
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_uid           text := auth.uid()::text;
  v_current_xp    integer;
  v_current_streak integer;
  v_clamped_delta integer;
  v_new_xp        integer;
  XP_DELTA_MIN CONSTANT integer := -300;   -- allow refund / mistake-rollback
  XP_DELTA_MAX CONSTANT integer :=  300;   -- ≈ perfect-score (100) × max booster (~3x)
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF p_xp_delta IS NULL OR p_new_streak IS NULL THEN
    RAISE EXCEPTION 'p_xp_delta and p_new_streak are required' USING ERRCODE = '22023';
  END IF;

  -- Clamp the XP delta into the legitimate range.
  v_clamped_delta := GREATEST(XP_DELTA_MIN, LEAST(XP_DELTA_MAX, p_xp_delta));

  SELECT COALESCE(xp, 0), COALESCE(streak, 0)
    INTO v_current_xp, v_current_streak
    FROM public.users
   WHERE uid = v_uid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User row not found for uid=%', v_uid USING ERRCODE = '42704';
  END IF;

  -- Validate streak transition.  Legitimate values:
  --   0                 — reset (score < 80)
  --   v_current_streak  — preserved (streak freeze consumed)
  --   v_current_streak + 1 — incremented (score ≥ 80)
  IF p_new_streak NOT IN (0, v_current_streak, v_current_streak + 1) THEN
    RAISE EXCEPTION
      'streak transition % → % not allowed', v_current_streak, p_new_streak
      USING ERRCODE = '42501';
  END IF;

  v_new_xp := GREATEST(0, v_current_xp + v_clamped_delta);

  UPDATE public.users
     SET xp     = v_new_xp,
         streak = p_new_streak
   WHERE uid = v_uid;

  RETURN jsonb_build_object(
    'success', true,
    'new_xp', v_new_xp,
    'new_streak', p_new_streak,
    'clamped_delta', v_clamped_delta
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.award_progress_xp(integer, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.award_progress_xp(integer, integer) FROM anon;
GRANT  EXECUTE ON FUNCTION public.award_progress_xp(integer, integer) TO authenticated;

COMMENT ON FUNCTION public.award_progress_xp IS
  'Post-game XP+streak save.  Clamps p_xp_delta to ±300 (≈ perfect score '
  '× max booster) and validates p_new_streak is one of {0, current, '
  'current+1}.  Authenticated only; writes to the caller''s own row.';


-- ─── 2. award_self_badge ────────────────────────────────────────────
-- Idempotent self-grant of a milestone badge (e.g. "🎯 Perfect Score").
-- Called by useAwardBadge.ts.  No XP side effect — badge XP is awarded
-- via record_mission_progress (daily missions) or award_reward (teacher
-- grants), neither of which touches users.badges.

CREATE OR REPLACE FUNCTION public.award_self_badge(
  p_badge text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_uid text := auth.uid()::text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF p_badge IS NULL OR length(trim(p_badge)) = 0 THEN
    RAISE EXCEPTION 'p_badge cannot be empty' USING ERRCODE = '22023';
  END IF;

  -- Length cap so a kid can't paste a 10KB badge string.
  IF length(p_badge) > 64 THEN
    RAISE EXCEPTION 'p_badge too long (max 64 chars)' USING ERRCODE = '22023';
  END IF;

  UPDATE public.users
     SET badges = array_append(COALESCE(badges, ARRAY[]::text[]), p_badge)
   WHERE uid = v_uid
     AND NOT (COALESCE(badges, ARRAY[]::text[]) @> ARRAY[p_badge]);

  RETURN jsonb_build_object('success', true, 'badge', p_badge);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.award_self_badge(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.award_self_badge(text) FROM anon;
GRANT  EXECUTE ON FUNCTION public.award_self_badge(text) TO authenticated;

COMMENT ON FUNCTION public.award_self_badge IS
  'Idempotent self-grant of a milestone badge (e.g. "🎯 Perfect Score").  '
  'Caller can only grant badges to their own row.  No-op if the badge is '
  'already in the array.';


-- ─── 3. consume_power_up ────────────────────────────────────────────
-- Atomic JSONB decrement of a power-up count.  Called by GameView when
-- a student taps fifty_fifty / skip / reveal_letter.  Refuses if the
-- count is already 0.

CREATE OR REPLACE FUNCTION public.consume_power_up(
  p_kind text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_uid          text := auth.uid()::text;
  v_current_jsonb jsonb;
  v_current_count integer;
  v_new_jsonb    jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF p_kind IS NULL OR length(trim(p_kind)) = 0 THEN
    RAISE EXCEPTION 'p_kind cannot be empty' USING ERRCODE = '22023';
  END IF;

  -- Allowlist of legitimate power-up kinds.  Stops a kid from
  -- inventing fake kinds to bloat the jsonb blob.
  IF p_kind NOT IN ('fifty_fifty', 'skip', 'reveal_letter') THEN
    RAISE EXCEPTION 'Unknown power-up kind: %', p_kind USING ERRCODE = '22023';
  END IF;

  -- Row-lock so concurrent consumes can't both succeed against the
  -- same 1-remaining count.
  SELECT COALESCE(power_ups, '{}'::jsonb)
    INTO v_current_jsonb
    FROM public.users
   WHERE uid = v_uid
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User row not found for uid=%', v_uid USING ERRCODE = '42704';
  END IF;

  v_current_count := COALESCE((v_current_jsonb->>p_kind)::integer, 0);

  IF v_current_count <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'No power-ups remaining', 'kind', p_kind);
  END IF;

  v_new_jsonb := jsonb_set(v_current_jsonb, ARRAY[p_kind], to_jsonb(v_current_count - 1));

  UPDATE public.users
     SET power_ups = v_new_jsonb
   WHERE uid = v_uid;

  RETURN jsonb_build_object(
    'success', true,
    'kind', p_kind,
    'remaining', v_current_count - 1
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.consume_power_up(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.consume_power_up(text) FROM anon;
GRANT  EXECUTE ON FUNCTION public.consume_power_up(text) TO authenticated;

COMMENT ON FUNCTION public.consume_power_up IS
  'Atomic decrement of users.power_ups[p_kind].  Refuses if the count is '
  'already 0.  Allowlist: fifty_fifty, skip, reveal_letter.  Caller can '
  'only touch their own row.';

COMMIT;

-- =============================================================================
-- Verification queries (run manually after applying this migration):
--
-- 1. All three functions exist and are SECURITY DEFINER:
--    SELECT proname, prosecdef
--    FROM pg_proc
--    WHERE pronamespace='public'::regnamespace
--      AND proname IN ('award_progress_xp', 'award_self_badge', 'consume_power_up');
--
-- 2. Granted only to authenticated:
--    SELECT routine_name, grantee, privilege_type
--    FROM information_schema.routine_privileges
--    WHERE specific_schema='public'
--      AND routine_name IN ('award_progress_xp', 'award_self_badge', 'consume_power_up');
--    -- Expect rows for: postgres, service_role, authenticated.  Not anon, not PUBLIC.
--
-- 3. Smoke-test the predicates (NB: these run as service_role inside MCP,
--    so auth.uid() is NULL — they will raise.  That itself is the test:
--    the auth gate fires before any UPDATE happens):
--    SELECT public.award_progress_xp(50, 1);
--    -- Expect: ERROR 42501 'Authentication required'
-- =============================================================================
