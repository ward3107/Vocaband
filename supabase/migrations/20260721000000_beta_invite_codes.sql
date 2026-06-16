-- =============================================================================
-- 20260721000000_beta_invite_codes.sql
--
-- Self-serve teacher access via a shared invite code (beta drives).
--
-- Until now the ONLY way to become a teacher was for an admin to pre-add the
-- email to public.teacher_allowlist (see 20260607170000_lock_teacher_signup_to_
-- allowlist.sql). That's safe but high-friction for letting a known group
-- (e.g. a beta tester chat) try the app — you'd have to collect every email.
--
-- This adds a bounded middle ground: a code you hand out. Redeeming a valid code
-- adds the caller's OWN email to teacher_allowlist (+ ai_allowlist), after which
-- the EXISTING sign-up path and users_insert RLS policy take over unchanged and
-- mint a normal role='teacher' row with the standard 14-day trial.
--
-- Security posture:
--   * Codes are NOT the public freemium "anyone can sign up" door — only people
--     who hold a code get in, and you can disable/expire/cap it at any time.
--   * The teacher_allowlist + ai_allowlist tables stay locked (no client policies);
--     all writes happen here inside a SECURITY DEFINER function, so the client
--     can neither enumerate codes nor allowlist an arbitrary email — only its own.
--   * RLS on public.users is untouched: a redeemed email still has to satisfy
--     users_insert (plan='free', trial<=now()+31d, school_id IS NULL).
--
-- Reversible: UPDATE public.beta_invite_codes SET active = false; (or DROP TABLE).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.beta_invite_codes (
  code        text PRIMARY KEY CHECK (char_length(code) BETWEEN 4 AND 64),
  label       text,                                   -- human note: "WhatsApp coders, June 2026"
  active      boolean     NOT NULL DEFAULT true,
  max_uses    integer,                                -- NULL = unlimited
  uses        integer     NOT NULL DEFAULT 0,
  grant_ai    boolean     NOT NULL DEFAULT true,      -- also add email to ai_allowlist (Vocabagrut)
  expires_at  timestamptz,                            -- NULL = never expires
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.beta_invite_codes ENABLE ROW LEVEL SECURITY;
-- No client policies: the table is managed from the Supabase dashboard, and
-- redemption happens only through redeem_beta_invite() below.

COMMENT ON TABLE public.beta_invite_codes IS
  'Shared invite codes that let a holder self-grant teacher access (adds their '
  'own email to teacher_allowlist via redeem_beta_invite). Managed via dashboard.';

-- ---------------------------------------------------------------------------
-- redeem_beta_invite(p_code) — called by the authenticated user right after
-- OAuth sign-in. Validates the code and, on success, allowlists the caller's
-- own email. Returns jsonb { ok: boolean, reason?: text }.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.redeem_beta_invite(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  v_email text := lower(public.get_my_email());
  v_code  text := upper(btrim(coalesce(p_code, '')));
  v_row   public.beta_invite_codes%ROWTYPE;
BEGIN
  IF v_email IS NULL OR v_email = '' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no-session');
  END IF;

  IF char_length(v_code) < 4 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid-code');
  END IF;

  -- Lock the row so concurrent redemptions can't blow past max_uses.
  SELECT * INTO v_row
  FROM public.beta_invite_codes
  WHERE upper(code) = v_code
  FOR UPDATE;

  IF NOT FOUND OR NOT v_row.active THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid-code');
  END IF;

  IF v_row.expires_at IS NOT NULL AND v_row.expires_at <= now() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'expired');
  END IF;

  IF v_row.max_uses IS NOT NULL AND v_row.uses >= v_row.max_uses THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'exhausted');
  END IF;

  -- Self-allowlist: only ever the caller's own email.
  INSERT INTO public.teacher_allowlist (email)
  VALUES (v_email)
  ON CONFLICT (email) DO NOTHING;

  IF v_row.grant_ai THEN
    INSERT INTO public.ai_allowlist (email)
    VALUES (v_email)
    ON CONFLICT (email) DO NOTHING;
  END IF;

  UPDATE public.beta_invite_codes
  SET uses = uses + 1
  WHERE code = v_row.code;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- Authenticated users only — anon can't redeem (must be signed in first).
REVOKE ALL ON FUNCTION public.redeem_beta_invite(text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.redeem_beta_invite(text) TO authenticated;

-- ---------------------------------------------------------------------------
-- Seed one starter code so the feature works out of the box. Rotate / disable
-- it from the dashboard when the beta ends:
--   UPDATE public.beta_invite_codes SET active = false WHERE code = 'VOCABAND-BETA';
-- Add more:
--   INSERT INTO public.beta_invite_codes (code, label, max_uses, expires_at)
--   VALUES ('MY-CODE', 'note', 50, now() + interval '30 days');
-- ---------------------------------------------------------------------------
INSERT INTO public.beta_invite_codes (code, label, max_uses, expires_at)
VALUES ('VOCABAND-BETA', 'Initial beta invite — rotate before wider sharing', 200, now() + interval '60 days')
ON CONFLICT (code) DO NOTHING;
