-- Add rate limiting to get_or_create_student_profile
-- Prevents class code enumeration by limiting to 10 attempts per 5 minutes per auth session

CREATE OR REPLACE FUNCTION public.get_or_create_student_profile(p_class_code text, p_display_name text, p_avatar text DEFAULT '🦊'::text)
RETURNS TABLE(profile student_profiles, is_new boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_unique_id TEXT;
  v_profile public.student_profiles;
  v_caller_uid TEXT;
  v_recent_count INT;
BEGIN
  v_caller_uid := auth.uid()::text;
  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Rate limit: max 10 profile lookups/creates per auth session per 5 minutes
  SELECT count(*) INTO v_recent_count
  FROM public.student_profiles
  WHERE auth_uid = auth.uid()
    AND joined_at > now() - interval '5 minutes';

  IF v_recent_count > 10 THEN
    RAISE EXCEPTION 'Too many requests. Please wait a moment and try again.';
  END IF;

  v_unique_id := LOWER(p_class_code) || LOWER(TRIM(p_display_name)) || ':' || v_caller_uid;

  SELECT * INTO v_profile
  FROM public.student_profiles
  WHERE unique_id = v_unique_id
     OR (unique_id = LOWER(p_class_code) || LOWER(TRIM(p_display_name)) AND auth_uid = auth.uid());

  IF NOT FOUND THEN
    INSERT INTO public.student_profiles (
      unique_id, display_name, class_code, email, status, auth_uid, avatar
    ) VALUES (
      v_unique_id, p_display_name, p_class_code,
      v_unique_id || '@internal.app', 'pending_approval', auth.uid(), p_avatar
    )
    RETURNING * INTO v_profile;
    RETURN QUERY SELECT v_profile, true::BOOLEAN;
  ELSE
    IF v_profile.unique_id != v_unique_id THEN
      UPDATE public.student_profiles
      SET unique_id = v_unique_id, email = v_unique_id || '@internal.app'
      WHERE id = v_profile.id;
      v_profile.unique_id := v_unique_id;
    END IF;
    IF p_avatar IS DISTINCT FROM v_profile.avatar THEN
      UPDATE public.student_profiles SET avatar = p_avatar WHERE id = v_profile.id;
      v_profile.avatar := p_avatar;
    END IF;
    RETURN QUERY SELECT v_profile, false::BOOLEAN;
  END IF;
END;
$function$;
