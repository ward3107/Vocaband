-- =============================================================================
-- Admin content moderation — review + remove teacher-authored vocabulary
-- =============================================================================
-- The only user-generated free text in the product is the vocabulary library:
-- teacher-created sets (name/description), their words (english/hebrew/arabic),
-- and the example sentences (manual or AI). Admins had no way to find or remove
-- inappropriate content there. This adds a review-and-remove surface — search,
-- drill-in, delete a set or a single word — mirroring admin_class_management.
--
-- Scope is deliberately review+remove (no "flag" state column, no app-behavior
-- change): deletion is the moderation action, and the existing FK cascades
-- (set -> words -> sentences, word -> sentences) keep removal clean. All
-- functions are SECURITY DEFINER + assert_admin(), audited, anon-revoked.
-- Additive + idempotent; edits no existing object.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. admin_list_vocab_sets — search/list custom sets. p_query matches the set
--    name/description, the owning teacher's name/email, OR any contained word
--    (english/hebrew/arabic) so a reported word leads back to its set.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_list_vocab_sets(
  p_query TEXT DEFAULT NULL,
  p_limit INT  DEFAULT 50
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  v_q     TEXT := nullif(trim(COALESCE(p_query, '')), '');
  v_like  TEXT := '%' || lower(COALESCE(nullif(trim(COALESCE(p_query, '')), ''), '')) || '%';
  v_limit INT  := LEAST(GREATEST(COALESCE(p_limit, 50), 1), 200);
  result  JSONB;
BEGIN
  PERFORM public.assert_admin();

  SELECT COALESCE(jsonb_agg(rec ORDER BY rec->>'updated_at' DESC), '[]'::jsonb) INTO result
  FROM (
    SELECT jsonb_build_object(
      'id',            s.id,
      'name',          s.name,
      'description',   s.description,
      'source_type',   s.source_type,
      'teacher_uid',   s.teacher_uid,
      'teacher_name',  (SELECT u.display_name FROM public.users u WHERE u.uid = s.teacher_uid),
      'teacher_email', (SELECT u.email        FROM public.users u WHERE u.uid = s.teacher_uid),
      'word_count',    (SELECT count(*) FROM public.vocabulary_set_words w WHERE w.set_id = s.id),
      'created_at',    s.created_at,
      'updated_at',    s.updated_at
    ) AS rec
    FROM public.vocabulary_sets s
    WHERE v_q IS NULL
       OR lower(s.name) LIKE v_like
       OR lower(COALESCE(s.description, '')) LIKE v_like
       OR EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.uid = s.teacher_uid
              AND (lower(COALESCE(u.email, '')) LIKE v_like OR lower(COALESCE(u.display_name, '')) LIKE v_like)
          )
       OR EXISTS (
            SELECT 1 FROM public.vocabulary_set_words w
            WHERE w.set_id = s.id
              AND (lower(w.english) LIKE v_like
                OR lower(COALESCE(w.hebrew, '')) LIKE v_like
                OR lower(COALESCE(w.arabic, '')) LIKE v_like)
          )
    ORDER BY s.updated_at DESC
    LIMIT v_limit
  ) q;

  RETURN result;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. admin_vocab_set_detail — one set + its words (each with its primary
--    sentence) for review. Word list capped to keep the payload bounded.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_vocab_set_detail(p_set_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE result JSONB;
BEGIN
  PERFORM public.assert_admin();

  SELECT jsonb_build_object(
    'set', (SELECT jsonb_build_object(
        'id', s.id, 'name', s.name, 'description', s.description,
        'source_type', s.source_type, 'teacher_uid', s.teacher_uid,
        'teacher_name',  (SELECT u.display_name FROM public.users u WHERE u.uid = s.teacher_uid),
        'teacher_email', (SELECT u.email        FROM public.users u WHERE u.uid = s.teacher_uid),
        'word_count',    (SELECT count(*) FROM public.vocabulary_set_words w WHERE w.set_id = s.id),
        'created_at', s.created_at, 'updated_at', s.updated_at
      ) FROM public.vocabulary_sets s WHERE s.id = p_set_id),
    'words', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', w.id,
        'english', w.english, 'hebrew', w.hebrew, 'arabic', w.arabic,
        'part_of_speech', w.part_of_speech,
        'sentence', (SELECT sn.text FROM public.vocabulary_set_word_sentences sn
                     WHERE sn.word_id = w.id ORDER BY sn.is_primary DESC, sn.created_at LIMIT 1),
        'sentence_generated_by', (SELECT sn.generated_by FROM public.vocabulary_set_word_sentences sn
                     WHERE sn.word_id = w.id ORDER BY sn.is_primary DESC, sn.created_at LIMIT 1)
      ) ORDER BY w.position), '[]'::jsonb)
      FROM (SELECT * FROM public.vocabulary_set_words WHERE set_id = p_set_id ORDER BY position LIMIT 300) w)
  ) INTO result;

  IF result->'set' IS NULL OR result->'set' = 'null'::jsonb THEN
    RETURN jsonb_build_object('error', 'not_found');
  END IF;
  RETURN result;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. admin_delete_vocab_set — remove a set (cascades words + sentences).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_delete_vocab_set(
  p_set_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  v_name    TEXT;
  v_teacher TEXT;
  v_words   INT := 0;
BEGIN
  PERFORM public.assert_admin();

  SELECT name, teacher_uid INTO v_name, v_teacher FROM public.vocabulary_sets WHERE id = p_set_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'vocabulary set % not found', p_set_id USING ERRCODE = '23503';
  END IF;
  SELECT count(*) INTO v_words FROM public.vocabulary_set_words WHERE set_id = p_set_id;

  INSERT INTO public.audit_log (actor_uid, action, data_category, target_uid, metadata)
  VALUES (auth.uid()::text, 'admin_delete_vocab_set', 'vocabulary', p_set_id::text,
          jsonb_build_object('name', v_name, 'teacher_uid', v_teacher, 'words', v_words,
                             'reason', COALESCE(trim(p_reason), '')));

  DELETE FROM public.vocabulary_sets WHERE id = p_set_id;  -- cascades words -> sentences

  RETURN jsonb_build_object('success', true, 'id', p_set_id, 'name', v_name, 'deleted_words', v_words);
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. admin_delete_vocab_word — remove a single word (cascades its sentences)
--    and keep the set's denormalised word_count consistent.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_delete_vocab_word(
  p_word_id UUID,
  p_reason  TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  v_english TEXT;
  v_set_id  UUID;
BEGIN
  PERFORM public.assert_admin();

  SELECT english, set_id INTO v_english, v_set_id FROM public.vocabulary_set_words WHERE id = p_word_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'vocabulary word % not found', p_word_id USING ERRCODE = '23503';
  END IF;

  INSERT INTO public.audit_log (actor_uid, action, data_category, target_uid, metadata)
  VALUES (auth.uid()::text, 'admin_delete_vocab_word', 'vocabulary', p_word_id::text,
          jsonb_build_object('english', v_english, 'set_id', v_set_id,
                             'reason', COALESCE(trim(p_reason), '')));

  DELETE FROM public.vocabulary_set_words WHERE id = p_word_id;  -- cascades sentences

  UPDATE public.vocabulary_sets
  SET word_count = (SELECT count(*) FROM public.vocabulary_set_words WHERE set_id = v_set_id),
      updated_at = now()
  WHERE id = v_set_id;

  RETURN jsonb_build_object('success', true, 'id', p_word_id, 'set_id', v_set_id);
END;
$$;

-- ---------------------------------------------------------------------------
-- Grants — authenticated only; assert_admin() inside each is the real gate.
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.admin_list_vocab_sets(TEXT, INT)   FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_vocab_set_detail(UUID)       FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_delete_vocab_set(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_delete_vocab_word(UUID, TEXT) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_list_vocab_sets(TEXT, INT)    TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_vocab_set_detail(UUID)        TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_vocab_set(UUID, TEXT)  TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_vocab_word(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION public.admin_delete_vocab_set IS
  'Admin-only: delete a teacher vocabulary set + its words/sentences (FK cascade). Audited with a snapshot.';

COMMIT;
