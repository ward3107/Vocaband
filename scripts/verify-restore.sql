-- =============================================================================
-- verify-restore.sql — backup-restore drill verification
-- =============================================================================
--
-- Run this against the RESTORED database to confirm the backup is intact
-- and structurally identical to production.  Pass criteria:
--   * No empty tables on the populated-data section
--   * Zero rows in the orphaned-records section
--   * Every key public.* table has rowsecurity = TRUE
--   * Every SECURITY DEFINER RPC listed below still present
--   * Most-recent timestamps are within the expected window for the
--     restore point you picked
--
-- Usage (Supabase dashboard → SQL editor on the temp project):
--   1. Open the SQL editor for `vocaband-restore-test`
--   2. Paste this whole file
--   3. Run.  Copy the output into the drill report.
--
-- Usage (psql against a local restored DB):
--   psql "$RESTORED_DB_URL" -f scripts/verify-restore.sql
-- =============================================================================

\echo
\echo '=== 1. Row counts on key tables ==='
\echo '   Should each be > 0 unless the project is brand-new.'
\echo
SELECT
  (SELECT COUNT(*) FROM public.users)            AS users,
  (SELECT COUNT(*) FROM public.classes)          AS classes,
  (SELECT COUNT(*) FROM public.assignments)      AS assignments,
  (SELECT COUNT(*) FROM public.progress)         AS progress,
  (SELECT COUNT(*) FROM public.consent_log)      AS consent_log,
  (SELECT COUNT(*) FROM public.audit_log)        AS audit_log;

\echo
\echo '=== 2. Empty-table detector ==='
\echo '   Any row showing EMPTY here means the restore missed that table.'
\echo
SELECT
  CASE WHEN (SELECT COUNT(*) FROM public.users)       > 0 THEN 'OK' ELSE 'EMPTY' END AS users_pop,
  CASE WHEN (SELECT COUNT(*) FROM public.classes)     > 0 THEN 'OK' ELSE 'EMPTY' END AS classes_pop,
  CASE WHEN (SELECT COUNT(*) FROM public.assignments) > 0 THEN 'OK' ELSE 'EMPTY' END AS assignments_pop,
  CASE WHEN (SELECT COUNT(*) FROM public.progress)    > 0 THEN 'OK' ELSE 'EMPTY' END AS progress_pop;

\echo
\echo '=== 3. Foreign-key integrity ==='
\echo '   Every `bad_rows` value should be 0.  Non-zero = data corruption in'
\echo '   the restore or an undeclared cascade-delete relationship.'
\echo
SELECT 'orphaned classes (teacher_uid)' AS check, COUNT(*) AS bad_rows
FROM public.classes c
WHERE c.teacher_uid IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.users u WHERE u.uid = c.teacher_uid)
UNION ALL
SELECT 'orphaned assignments (class_id)', COUNT(*)
FROM public.assignments a
WHERE NOT EXISTS (SELECT 1 FROM public.classes c WHERE c.id = a.class_id)
UNION ALL
SELECT 'orphaned progress (student_uid)', COUNT(*)
FROM public.progress p
WHERE p.student_uid IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.users u WHERE u.uid = p.student_uid)
UNION ALL
SELECT 'orphaned progress (assignment_id)', COUNT(*)
FROM public.progress p
WHERE p.assignment_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.assignments a WHERE a.id = p.assignment_id);

\echo
\echo '=== 4. Role distribution ==='
\echo '   Expect a healthy mix of `teacher` + `student`, at least one `admin`.'
\echo
SELECT role, COUNT(*) AS n
FROM public.users
WHERE role IS NOT NULL
GROUP BY role
ORDER BY role;

\echo
\echo '=== 5. RLS still enabled on every sensitive table ==='
\echo '   `rowsecurity` MUST be TRUE on every row below.  FALSE = critical.'
\echo
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'users', 'classes', 'assignments', 'progress',
    'consent_log', 'audit_log', 'authz_failures',
    'quick_play_sessions', 'quick_play_joins',
    'teacher_profiles', 'bagrut_tests', 'bagrut_responses', 'bagrut_cache'
  )
ORDER BY tablename;

\echo
\echo '=== 6. SECURITY DEFINER RPCs present ==='
\echo '   Pre-restore list (must be present post-restore too):'
\echo '     is_admin, is_teacher, is_teacher_allowed'
\echo '     export_my_data, delete_my_account, cleanup_expired_data'
\echo '     on_class_deleted, log_authz_failure'
\echo '     audit_log_forbid_update, audit_log_forbid_delete'
\echo '     generate_session_code, save_student_progress_batch'
\echo
SELECT proname AS rpc_name
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.prosecdef = TRUE
ORDER BY proname;

\echo
\echo '=== 7. Recent activity timestamps ==='
\echo '   Should match the restore point you picked, ± a few hours.'
\echo '   If everything is from months ago, the restore landed the wrong snapshot.'
\echo
SELECT
  (SELECT MAX(first_seen_at) FROM public.users      WHERE first_seen_at IS NOT NULL) AS most_recent_user_signup,
  (SELECT MAX(completed_at)  FROM public.progress   WHERE completed_at  IS NOT NULL) AS most_recent_progress,
  (SELECT MAX(created_at)    FROM public.audit_log)                                  AS most_recent_audit_log;

\echo
\echo '=== 8. Migration ledger (Supabase schema_migrations) ==='
\echo '   Expect every migration filename from supabase/migrations/ to appear here.'
\echo '   Any missing version = the restore stopped before that migration ran.'
\echo
SELECT version
FROM supabase_migrations.schema_migrations
ORDER BY version DESC
LIMIT 20;

\echo
\echo '=== Done.  Save this output as part of the drill report. ==='
