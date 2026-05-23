-- =============================================================================
-- 20260522020000_expand_export_and_delete.sql
--
-- C-7 from the 2026-05-22 edtech-compliance audit: complete the
-- GDPR Art. 15 (export) + Art. 17 (erasure) implementation.
--
-- BEFORE
--   export_my_data returned: user, classes_owned, progress,
--                            consent_history, assignments_created
--   delete_my_account deleted: progress, consent_log, public.users
--                              (+ cascades on classes/assignments)
--
-- Gaps closed by this migration:
--
--   1. teacher_profiles (FK by email, NOT by uid) — was orphaned on
--      delete; email + school_name survived indefinitely.  Now
--      deleted explicitly + included in export.
--
--   2. student_profiles (FK auth_uid → auth.users ON DELETE SET NULL)
--      — row's display_name + email + school survived the auth.users
--      deletion as orphans pointing at a deleted user.  Now deleted
--      explicitly BEFORE the auth.users delete.
--
--   3. audit_log (no FK) — was previously untouched by delete.
--      We keep that posture *intentionally*: GDPR Art. 17(3)(b)/(e)
--      and Israeli Privacy Protection Regulations 2017 § 8 carve out
--      retention exemptions for compliance with legal obligation
--      and for the establishment / exercise / defence of legal
--      claims, and the audit log exists for exactly that purpose.
--      The retention period (730 days, configurable in
--      `cleanup_expired_data`) is the safeguard — entries naturally
--      age out via the scheduled cleanup, at which point the
--      personal-data link is gone.
--      We additionally couldn't anonymise in-place even if we wanted
--      to: migration 20260518120000 attaches a BEFORE UPDATE trigger
--      to `audit_log` that ALWAYS raises ("audit_log is append-only").
--      Punching a GUC-controlled hole through that trigger would
--      undermine the immutability promise the MoE A4 requirement
--      relies on.  Better posture: retention as the privacy lever,
--      immutability as the security lever, both intact.
--
--   4. auth.users — was left behind ("cleaned up separately") with
--      no separate cleanup.  Email + last-login timestamp + IP
--      hash survived in the auth schema indefinitely.  Now deleted
--      from inside the SECURITY DEFINER RPC at the end of the
--      transaction.
--
--   5. Export now covers: student_profiles, teacher_profiles,
--      audit_log entries the user is actor / target of, ai_usage_counters.
--      The previously-missing surfaces are added below.
--
-- Out of scope for this migration (tracked as follow-ups):
--   - Soft-delete with 30-day grace period (today's delete is hard).
--     UX best-practice but not legally required.
--   - Async export via signed download link (today's path returns
--     the JSON inline in the RPC response).  Fine until user count
--     × table sizes outgrows a single-statement payload.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Expanded export
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.export_my_data()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  my_uid   TEXT := auth.uid()::text;
  my_email TEXT;
  result   JSONB;
BEGIN
  IF my_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Email is looked up once because teacher_profiles is keyed by
  -- email (not uid) — see audit C-7 commentary.
  SELECT email INTO my_email FROM public.users WHERE uid = my_uid;

  SELECT jsonb_build_object(
    'export_format_version',  '2026-05-22',
    'exported_at',            now(),
    'subject_uid',            my_uid,
    'subject_email',          my_email,
    'tables', jsonb_build_object(
      'user', (
        SELECT to_jsonb(u.*) FROM public.users u WHERE u.uid = my_uid
      ),
      'student_profile', (
        SELECT to_jsonb(sp.*) FROM public.student_profiles sp WHERE sp.auth_uid::text = my_uid LIMIT 1
      ),
      'teacher_profile', (
        SELECT to_jsonb(tp.*) FROM public.teacher_profiles tp WHERE tp.email = my_email LIMIT 1
      ),
      'classes_owned', (
        SELECT COALESCE(jsonb_agg(to_jsonb(c.*)), '[]'::jsonb)
        FROM public.classes c WHERE c.teacher_uid = my_uid
      ),
      'assignments_created', (
        SELECT COALESCE(jsonb_agg(to_jsonb(a.*)), '[]'::jsonb)
        FROM public.assignments a
        WHERE a.class_id IN (SELECT id FROM public.classes WHERE teacher_uid = my_uid)
      ),
      'progress', (
        SELECT COALESCE(jsonb_agg(to_jsonb(p.*)), '[]'::jsonb)
        FROM public.progress p WHERE p.student_uid = my_uid
      ),
      'consent_history', (
        SELECT COALESCE(jsonb_agg(to_jsonb(cl.*)), '[]'::jsonb)
        FROM public.consent_log cl WHERE cl.uid = my_uid
      ),
      'audit_log_as_actor', (
        -- Entries the user generated (their own actions).  Subject
        -- access right per Art. 15 — they see what they did + when.
        SELECT COALESCE(jsonb_agg(to_jsonb(al.*)), '[]'::jsonb)
        FROM public.audit_log al WHERE al.actor_uid = my_uid
      ),
      'audit_log_as_target', (
        -- Entries where the user's data was accessed by someone
        -- else (e.g. a teacher viewing a student's gradebook).
        -- Subject access right per Art. 15(1)(c) — they see who
        -- received their data.
        SELECT COALESCE(jsonb_agg(to_jsonb(al.*)), '[]'::jsonb)
        FROM public.audit_log al WHERE al.target_uid = my_uid AND al.actor_uid <> my_uid
      ),
      'ai_usage', (
        -- Per-day AI feature usage counters (teacher).  Counts only,
        -- no prompts retained (Anthropic/Gemini are zero-retention
        -- under our DPAs — see SUBPROCESSORS.md).
        SELECT COALESCE(jsonb_agg(to_jsonb(c.*)), '[]'::jsonb)
        FROM public.ai_usage_counters c WHERE c.teacher_uid = my_uid
      )
    )
  ) INTO result;

  -- Log the export action (subject access request, per Reg 2017 § 8)
  INSERT INTO public.audit_log (actor_uid, action, data_category, target_uid)
  VALUES (my_uid, 'export_data', 'all', my_uid);

  RETURN result;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. Expanded delete
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  my_uid           TEXT := auth.uid()::text;
  my_email         TEXT;
  my_role          TEXT;
  deleted_progress         INT := 0;
  deleted_classes          INT := 0;
  deleted_student_profile  INT := 0;
  deleted_teacher_profile  INT := 0;
  deleted_auth_user        INT := 0;
BEGIN
  IF my_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT role, email INTO my_role, my_email FROM public.users WHERE uid = my_uid;
  IF my_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  -- Log the deletion BEFORE we mutate anything else so we have an
  -- audit record even if the rest of the transaction rolls back.
  -- The actor_uid stays as the original uid: see the migration
  -- header for the Art. 17(3) retention argument.  Entries naturally
  -- age out at the 730-day mark via cleanup_expired_data.
  INSERT INTO public.audit_log (actor_uid, action, data_category, target_uid, metadata)
  VALUES (
    my_uid, 'delete_account', 'all', my_uid,
    jsonb_build_object('role', my_role)
  );

  IF my_role = 'student' THEN
    DELETE FROM public.progress WHERE student_uid = my_uid;
    GET DIAGNOSTICS deleted_progress = ROW_COUNT;

    -- student_profiles.auth_uid is ON DELETE SET NULL → orphans on
    -- auth.users delete.  Explicit delete required.
    DELETE FROM public.student_profiles WHERE auth_uid::text = my_uid;
    GET DIAGNOSTICS deleted_student_profile = ROW_COUNT;

    DELETE FROM public.consent_log WHERE uid = my_uid;

  ELSIF my_role = 'teacher' THEN
    -- Anonymise gradebook progress for the teacher's classes
    -- (student rows survive — those belong to the students).
    UPDATE public.progress
    SET student_name = 'Deleted Student'
    WHERE class_code IN (SELECT code FROM public.classes WHERE teacher_uid = my_uid)
      AND student_uid NOT IN (SELECT uid FROM public.users WHERE role = 'student');

    -- teacher_profiles is keyed by email (no uid FK).  Explicit
    -- delete required.
    IF my_email IS NOT NULL THEN
      DELETE FROM public.teacher_profiles WHERE email = my_email;
      GET DIAGNOSTICS deleted_teacher_profile = ROW_COUNT;
    END IF;

    -- Classes cascade-delete to assignments via FK.  Cascades also
    -- clean up: ai_usage_counters, vocabulary_collections,
    -- vocabulary_sets, competitions, interactive_worksheets,
    -- saved_word_groups (all have teacher_uid REFERENCES users(uid)
    -- ON DELETE CASCADE).
    DELETE FROM public.classes WHERE teacher_uid = my_uid;
    GET DIAGNOSTICS deleted_classes = ROW_COUNT;

    DELETE FROM public.consent_log WHERE uid = my_uid;

  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Admin accounts cannot self-delete');
  END IF;

  -- audit_log entries are NOT touched here — see migration header.
  -- Retention exemption: GDPR Art. 17(3)(b)/(e) + Israeli Privacy
  -- Protection Regulations 2017 § 8.  Entries age out at 730 days
  -- via cleanup_expired_data, at which point the personal-data link
  -- is gone.  Immutability trigger (migration 20260518120000) would
  -- block in-place anonymisation anyway.

  -- Now the public side is clean — delete the public.users row.
  -- This must run BEFORE auth.users delete because public.users.uid
  -- references auth.users(id).
  DELETE FROM public.users WHERE uid = my_uid;

  -- Finally, remove the auth identity itself.  This wipes the
  -- email + last-login + IP-hash that Supabase stores per user.
  -- Service role bypasses RLS; auth.users has no RLS by default
  -- but the schema is owned by `supabase_auth_admin`, so the
  -- function owner (postgres) needs DELETE privilege — which it
  -- has via the SECURITY DEFINER context on standard Supabase
  -- projects.  Wrapped defensively: if a tighter privilege
  -- posture or a future Supabase upgrade revokes the privilege,
  -- the rest of the deletion (public schema rows) still commits
  -- and the response flags `deleted_auth_user = -1` so the
  -- operator knows to run the cleanup via the Supabase Auth
  -- Admin API (`auth.admin.deleteUser`) instead.
  BEGIN
    DELETE FROM auth.users WHERE id::text = my_uid;
    GET DIAGNOSTICS deleted_auth_user = ROW_COUNT;
  EXCEPTION
    WHEN insufficient_privilege OR undefined_table THEN
      deleted_auth_user := -1;
  END;

  RETURN jsonb_build_object(
    'success',                  true,
    'role',                     my_role,
    'deleted_progress',         deleted_progress,
    'deleted_classes',          deleted_classes,
    'deleted_student_profile',  deleted_student_profile,
    'deleted_teacher_profile',  deleted_teacher_profile,
    'deleted_auth_user',        deleted_auth_user,
    'audit_log_retained_until', (CURRENT_DATE + INTERVAL '730 days'),
    'note',                     'Account fully erased from operational data. Audit log entries kept under GDPR Art. 17(3)(b)/(e) + Israeli Reg 2017 § 8 legal-retention exemption; aged out automatically by cleanup_expired_data at 730 days.'
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. Function ownership + grants (preserve the existing posture from
--    20260517115649_revoke_anon_grants_on_definer_rpcs.sql)
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.export_my_data()    FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.delete_my_account() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.export_my_data()    TO authenticated;
GRANT  EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;

COMMENT ON FUNCTION public.export_my_data() IS
  '2026-05-22 C-7: full GDPR Art. 15 / Reg 2017 § 13 subject access export. '
  'Includes user + class + assignment + progress + consent + audit (both as '
  'actor and as target) + AI usage counters + per-role profile.';

COMMENT ON FUNCTION public.delete_my_account() IS
  '2026-05-22 C-7: full GDPR Art. 17 erasure. Deletes public.users + auth.users + '
  'student_profiles + teacher_profiles + per-role data. audit_log entries are '
  'retained under Art. 17(3)(b)/(e) legal-retention exemption and age out at '
  '730 days via cleanup_expired_data.';
