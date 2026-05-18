-- =============================================================================
-- Drop the open INSERT policies on worksheet tables — close the spam vector
-- =============================================================================
--
-- Background: the original P0 finding in the May 2026 DB audit flagged two
-- RLS policies that allow ANY caller (anon or authenticated) to insert rows
-- with no constraint:
--
--   - interactive_worksheets: "Anyone can create interactive worksheets"
--     (INSERT WITH CHECK true)
--   - worksheet_attempts:     "Anyone can submit worksheet attempts"
--     (INSERT WITH CHECK true)
--
-- These were originally added so the public worksheet-share flow could mint
-- rows without authentication. But the codebase has since moved to RPCs that
-- handle the inserts in a controlled way:
--
--   - create_interactive_worksheet     (SECURITY DEFINER)
--   - create_interactive_worksheet_v2  (SECURITY DEFINER)
--   - submit_worksheet_attempt         (SECURITY DEFINER)
--
-- All three are SECURITY DEFINER and run as the function owner, so they
-- bypass RLS for their INSERTs.  Grep across src/ + server.ts confirms NO
-- client-side code path does a direct INSERT on these tables — every write
-- goes through one of the RPCs.  The open policies are dead weight that a
-- bot could exploit to fill either table with arbitrary rows.
--
-- Risk of this migration: zero per static analysis.  If a code path is
-- discovered that does need a direct INSERT, it will surface as an RLS
-- violation (clear error) and can either be migrated to the RPC or get a
-- targeted policy added back.
--
-- After this migration the worksheet tables have the following INSERT
-- access:
--   - interactive_worksheets: service_role + SECURITY DEFINER RPCs
--   - worksheet_attempts:     service_role + SECURITY DEFINER RPCs
-- =============================================================================

DROP POLICY IF EXISTS "Anyone can create interactive worksheets"
  ON public.interactive_worksheets;

DROP POLICY IF EXISTS "Anyone can submit worksheet attempts"
  ON public.worksheet_attempts;
