-- Teacher Rewards System
-- Allows teachers to manually award XP, badges, titles, and avatars to students
-- All rewards are logged for audit purposes

-- Table: teacher_rewards (audit log)
CREATE TABLE IF NOT EXISTS public.teacher_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_uid TEXT NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  student_uid TEXT NOT NULL,
  student_name TEXT NOT NULL,
  reward_type TEXT NOT NULL CHECK (reward_type IN ('xp', 'badge', 'title', 'avatar')),
  reward_value TEXT NOT NULL,  -- XP amount as string, or badge/title/avatar identifier
  reason TEXT,  -- Optional reason for the reward
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for queries (teacher's reward history)
CREATE INDEX IF NOT EXISTS idx_teacher_rewards_teacher
  ON public.teacher_rewards(teacher_uid, created_at DESC);

-- Index for student reward history
CREATE INDEX IF NOT EXISTS idx_teacher_rewards_student
  ON public.teacher_rewards(student_uid, created_at DESC);

-- Enable RLS
ALTER TABLE public.teacher_rewards ENABLE ROW LEVEL SECURITY;

-- Teachers can view their own reward history
CREATE POLICY "Teachers can view their own rewards"
  ON public.teacher_rewards FOR SELECT
  USING (auth.uid()::text = teacher_uid);

-- Teachers can insert rewards (they created)
CREATE POLICY "Teachers can insert rewards"
  ON public.teacher_rewards FOR INSERT
  WITH CHECK (auth.uid()::text = teacher_uid);

-- RPC: award_reward
-- Grants XP, badges, titles, or avatars to a student
CREATE OR REPLACE FUNCTION public.award_reward(
  p_student_uid TEXT,
  p_reward_type TEXT,
  p_reward_value TEXT,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  teacher_uid TEXT := auth.uid()::text;
  student_name TEXT;
  current_xp INTEGER;
  new_xp INTEGER;
BEGIN
  -- Verify caller is a teacher
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE uid = teacher_uid AND role = 'teacher') THEN
    RAISE EXCEPTION 'Only teachers can award rewards' USING ERRCODE = '42501';
  END IF;

  -- Get student name for logging
  SELECT display_name INTO student_name
  FROM public.users
  WHERE uid = p_student_uid;

  IF student_name IS NULL THEN
    RAISE EXCEPTION 'Student not found' USING ERRCODE = '42704';
  END IF;

  -- Handle different reward types
  IF p_reward_type = 'xp' THEN
    -- Get current XP
    SELECT COALESCE(xp, 0) INTO current_xp FROM public.users WHERE uid = p_student_uid;

    -- Update XP
    new_xp := current_xp + CAST(p_reward_value AS INTEGER);
    UPDATE public.users SET xp = new_xp WHERE uid = p_student_uid;

  ELSIF p_reward_type = 'badge' THEN
    -- Add badge to array if not already present
    UPDATE public.users
    SET badges = array_append(COALESCE(badges, ARRAY[]::TEXT[]), p_reward_value)
    WHERE uid = p_student_uid AND NOT (badges @> ARRAY[p_reward_value]);

  ELSIF p_reward_type = 'title' THEN
    -- Add title to badges array (stored as badge with prefix)
    UPDATE public.users
    SET badges = array_append(COALESCE(badges, ARRAY[]::TEXT[]), '🏷️ ' || p_reward_value)
    WHERE uid = p_student_uid AND NOT (badges @> ARRAY['🏷️ ' || p_reward_value]);

  ELSIF p_reward_type = 'avatar' THEN
    -- Add avatar to badges array (stored as badge with prefix)
    UPDATE public.users
    SET badges = array_append(COALESCE(badges, ARRAY[]::TEXT[]), '🎭 ' || p_reward_value)
    WHERE uid = p_student_uid AND NOT (badges @> ARRAY['🎭 ' || p_reward_value]);
  ELSE
    RAISE EXCEPTION 'Invalid reward_type: %', p_reward_type USING ERRCODE = '22023';
  END IF;

  -- Log the reward for audit
  INSERT INTO public.teacher_rewards (
    teacher_uid, student_uid, student_name, reward_type, reward_value, reason
  ) VALUES (
    teacher_uid, p_student_uid, student_name, p_reward_type, p_reward_value, p_reason
  );

  RETURN jsonb_build_object(
    'success', true,
    'student_name', student_name,
    'reward_type', p_reward_type,
    'reward_value', p_reward_value
  );
END;
$$;

-- Grant execute on function to authenticated users
GRANT EXECUTE ON FUNCTION public.award_reward(
  TEXT, TEXT, TEXT, TEXT
) TO authenticated;
