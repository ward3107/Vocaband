BEGIN;

CREATE FUNCTION public.billing_my_usage() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  WITH account AS (
    SELECT u.uid, u.school_id, public.billing_entitlement(u.uid) AS access
    FROM public.users u WHERE u.uid=auth.uid()::text AND u.role='teacher'
  )
  SELECT jsonb_build_object(
    'scope', CASE WHEN access->>'tier'='school' AND school_id IS NOT NULL THEN 'school' ELSE 'teacher' END,
    'used', CASE WHEN access->>'tier'='school' AND school_id IS NOT NULL
      THEN public.billing_roster_size(NULL,school_id)
      ELSE public.billing_roster_size(uid,NULL) END,
    'capacity', (access->>'capacity')::integer
  )
  FROM account;
$$;

CREATE FUNCTION public.school_weekly_activity(p_previous boolean DEFAULT false) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  WITH local_day AS (
    SELECT (now() AT TIME ZONE 'Asia/Jerusalem')::date AS today, public.billing_my_school(true) AS school_id
  ), week AS (
    SELECT school_id, today-extract(dow FROM today)::integer
      - CASE WHEN p_previous THEN 7 ELSE 0 END AS starts_on
    FROM local_day WHERE school_id IS NOT NULL
  ), bounds AS (
    SELECT school_id, starts_on, starts_on+6 AS ends_on,
      starts_on::timestamp AT TIME ZONE 'Asia/Jerusalem' AS since,
      (starts_on+7)::timestamp AT TIME ZONE 'Asia/Jerusalem' AS until
    FROM week
  ), classes AS (
    SELECT c.id, c.code, c.name
    FROM bounds b JOIN public.users u ON u.school_id=b.school_id AND u.role='teacher'
    JOIN public.classes c ON c.teacher_uid=u.uid
    WHERE c.archived_at IS NULL AND c.subject='english'
  ), weekly AS (
    SELECT DISTINCT c.id AS class_id, c.code, p.student_uid, p.assignment_id
    FROM bounds b CROSS JOIN classes c
    JOIN public.progress p ON p.class_code=c.code
    WHERE p.completed_at>=b.since AND p.completed_at<b.until
      AND nullif(p.student_uid,'') IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.student_profiles s
        WHERE s.class_code=c.code AND s.auth_uid::text=p.student_uid AND s.status IN ('active','approved')
      )
  ), finished AS (
    SELECT DISTINCT w.class_id, w.student_uid
    FROM weekly w CROSS JOIN bounds b
    JOIN public.assignments a ON a.id=w.assignment_id AND a.class_id=w.class_id
    -- Match assignment completion in the student app. Flashcards do not count.
    WHERE coalesce(cardinality(array_remove(a.allowed_modes,'flashcards')),1)>0
      AND NOT EXISTS (
      SELECT 1 FROM unnest(coalesce(a.allowed_modes, ARRAY[
        'classic','listening','spelling','matching','memory-flip','true-false','flashcards',
        'scramble','reverse','letter-sounds','sentence-builder','fill-blank','idiom','speed-round'
      ]::text[])) AS mode(value)
      WHERE mode.value<>'flashcards' AND NOT EXISTS (
        SELECT 1 FROM public.progress p
        WHERE p.assignment_id=a.id AND p.class_code=w.code AND p.student_uid=w.student_uid
          AND p.mode=mode.value AND p.completed_at<b.until
      )
    )
  ), per_class AS (
    SELECT c.name, count(DISTINCT w.student_uid) AS practiced,
      count(DISTINCT f.student_uid) AS completed
    FROM classes c
    LEFT JOIN weekly w ON w.class_id=c.id
    LEFT JOIN finished f ON f.class_id=c.id AND f.student_uid=w.student_uid
    GROUP BY c.id,c.name
  )
  SELECT jsonb_build_object(
    'startsOn',b.starts_on, 'endsOn',b.ends_on,
    'classesPracticed',(SELECT count(*) FROM per_class WHERE practiced>0),
    'studentsCompleted',(SELECT count(DISTINCT student_uid) FROM finished),
    'classes',coalesce((SELECT jsonb_agg(to_jsonb(c) ORDER BY c.practiced DESC,c.name) FROM per_class c),'[]'::jsonb)
  )
  FROM bounds b;
$$;

REVOKE ALL ON FUNCTION public.billing_my_usage(),public.school_weekly_activity(boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.billing_my_usage(),public.school_weekly_activity(boolean) TO authenticated;

COMMIT;
