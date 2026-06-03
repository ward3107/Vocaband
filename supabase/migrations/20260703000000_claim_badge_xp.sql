-- claim_badge_xp — server-authoritative, one-shot badge XP rewards.
--
-- Background: the arcade dashboard lets a student tap an earned badge to
-- collect a small XP reward.  The first implementation deduped claims in
-- localStorage only, so clearing site data let a student re-collect the
-- same badge's XP repeatedly (the retention RPC just adds a delta — it
-- doesn't know which badge it came from).
--
-- Fix: a real claim ledger.  public.claimed_badges holds one row per
-- (uid, badge_id); the SECURITY DEFINER RPC below inserts that row and
-- grants the XP in a single transaction, so a second attempt for the
-- same badge is a no-op no matter what the client does.  The truth lives
-- in the DB, not the browser.
--
-- Mirrors claim_retention_xp (20260514130000) for the XP-write half:
-- authenticated-only, writes the caller's own users.xp, clamps the delta.

CREATE TABLE IF NOT EXISTS public.claimed_badges (
  uid        text        NOT NULL,
  badge_id   text        NOT NULL,
  xp_awarded integer     NOT NULL,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (uid, badge_id)
);

ALTER TABLE public.claimed_badges ENABLE ROW LEVEL SECURITY;

-- Students may read their own claim rows so the dashboard can hydrate
-- which badges are already collected.  All writes go through the
-- SECURITY DEFINER RPC below — there is intentionally no INSERT/UPDATE
-- policy, so the client cannot forge or delete claims directly.
DROP POLICY IF EXISTS claimed_badges_select_own ON public.claimed_badges;
CREATE POLICY claimed_badges_select_own ON public.claimed_badges
  FOR SELECT TO authenticated
  USING (uid = auth.uid()::text);

CREATE OR REPLACE FUNCTION public.claim_badge_xp(
  p_badge_id text,
  p_xp       integer
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_uid        text := auth.uid()::text;
  v_rows       integer;
  v_current_xp integer;
  v_new_xp     integer;
  v_clamped    integer;
  XP_MIN CONSTANT integer := 0;
  XP_MAX CONSTANT integer := 500;  -- badge rewards are small; cap tight
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF p_badge_id IS NULL OR length(btrim(p_badge_id)) = 0 THEN
    RAISE EXCEPTION 'p_badge_id is required' USING ERRCODE = '22023';
  END IF;

  IF p_xp IS NULL THEN
    RAISE EXCEPTION 'p_xp is required' USING ERRCODE = '22023';
  END IF;

  v_clamped := GREATEST(XP_MIN, LEAST(XP_MAX, p_xp));

  -- Atomic dedup: a duplicate (uid, badge_id) hits the PK and is
  -- skipped.  ROW_COUNT then tells us whether THIS call was the first
  -- claim (1) or a replay (0).
  INSERT INTO public.claimed_badges (uid, badge_id, xp_awarded)
  VALUES (v_uid, p_badge_id, v_clamped)
  ON CONFLICT (uid, badge_id) DO NOTHING;
  GET DIAGNOSTICS v_rows = ROW_COUNT;

  SELECT COALESCE(xp, 0) INTO v_current_xp
    FROM public.users
   WHERE uid = v_uid;

  IF NOT FOUND THEN
    -- Roll the ledger insert back via the exception so a user with no
    -- row can't leave an orphan claim.
    RAISE EXCEPTION 'User row not found for uid=%', v_uid USING ERRCODE = '42704';
  END IF;

  -- Replay → grant nothing, just report the current total.
  IF v_rows = 0 THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_claimed', true,
      'new_xp', v_current_xp,
      'xp_awarded', 0
    );
  END IF;

  -- First claim → grant the reward.
  v_new_xp := v_current_xp + v_clamped;
  UPDATE public.users SET xp = v_new_xp WHERE uid = v_uid;

  RETURN jsonb_build_object(
    'success', true,
    'already_claimed', false,
    'new_xp', v_new_xp,
    'xp_awarded', v_clamped
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_badge_xp(text, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.claim_badge_xp(text, integer) FROM anon;
GRANT  EXECUTE ON FUNCTION public.claim_badge_xp(text, integer) TO authenticated;

COMMENT ON FUNCTION public.claim_badge_xp IS
  'One-shot badge XP claim. Inserts a public.claimed_badges row and adds
   the (clamped, <=500) XP to the caller''s users.xp in one transaction;
   replays for an already-claimed badge grant nothing. Server-authoritative
   dedup — clearing client storage cannot re-trigger a grant.';
