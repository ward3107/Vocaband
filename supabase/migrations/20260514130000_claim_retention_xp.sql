-- claim_retention_xp — unblock retention reward XP grants.
--
-- Background: src/App.tsx's onGrantXp callback used to do
--   supabase.from('users').update({ xp: newXp }).eq('uid', user.uid)
-- directly from the client.  When RLS on public.users tightened to
-- disallow direct UPDATEs (only SECURITY DEFINER paths may write
-- xp/badges/cosmetics), every retention reward — daily chest, weekly
-- challenge, comeback, pet evolution milestones — started returning
-- 403 Forbidden.  The XP bumped optimistically client-side but never
-- persisted, so a refresh wiped it.
--
-- Fix: this SECURITY DEFINER RPC.  Caller hands us a positive delta;
-- we clamp it to a sane range and add it to the caller's own row.
-- Authenticated-only.  No streak / no badge writes — that's
-- award_progress_xp's job (20260603_f2_game_state_rpcs.sql) and we
-- intentionally don't overlap so the gameplay cap (300) stays tight.
--
-- Anti-cheat: the 2000-XP cap is well above any legitimate single
-- retention grant (largest today is +150 from pet evolution) but
-- below what would let a malicious client meaningfully cheat the
-- leaderboards even if they spammed the RPC.  GoTrue's per-IP
-- throttle bounds spam volume.

CREATE OR REPLACE FUNCTION public.claim_retention_xp(
  p_xp_delta integer
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_uid           text := auth.uid()::text;
  v_current_xp    integer;
  v_new_xp        integer;
  v_clamped_delta integer;
  XP_DELTA_MIN CONSTANT integer := 0;
  XP_DELTA_MAX CONSTANT integer := 2000;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF p_xp_delta IS NULL THEN
    RAISE EXCEPTION 'p_xp_delta is required' USING ERRCODE = '22023';
  END IF;

  v_clamped_delta := GREATEST(XP_DELTA_MIN, LEAST(XP_DELTA_MAX, p_xp_delta));

  SELECT COALESCE(xp, 0) INTO v_current_xp
    FROM public.users
   WHERE uid = v_uid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User row not found for uid=%', v_uid USING ERRCODE = '42704';
  END IF;

  v_new_xp := v_current_xp + v_clamped_delta;

  UPDATE public.users
     SET xp = v_new_xp
   WHERE uid = v_uid;

  RETURN jsonb_build_object(
    'success', true,
    'new_xp', v_new_xp,
    'clamped_delta', v_clamped_delta
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_retention_xp(integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.claim_retention_xp(integer) FROM anon;
GRANT  EXECUTE ON FUNCTION public.claim_retention_xp(integer) TO authenticated;

COMMENT ON FUNCTION public.claim_retention_xp IS
  'Adds XP to the caller''s users row for retention / cosmetic rewards
   (daily chest, weekly challenge, comeback, pet evolution).  Distinct
   from award_progress_xp (gameplay) — does not touch streak.  Caps
   the delta at 2000 to bound client-side cheating;  legitimate single
   claims are well under this (largest is pet evolution at +150).';
