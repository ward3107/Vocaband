-- Fix: Allow unauthenticated (anon) users to read active quick play sessions.
-- The security hardening migration (20260339) changed the policy to
-- authenticated-only, which broke the QR code join flow — students scanning
-- the QR code haven't signed in yet, so the session query fails with RLS.

DROP POLICY IF EXISTS "Authenticated users can read active sessions" ON public.quick_play_sessions;

CREATE POLICY "Anyone can read active sessions"
ON public.quick_play_sessions FOR SELECT
TO anon, authenticated
USING (is_active = true);
