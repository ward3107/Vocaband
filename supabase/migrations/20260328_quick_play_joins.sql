-- ============================================
-- Track Quick Play Student Joins
-- ============================================

-- Create table
CREATE TABLE public.quick_play_joins (
  id bigserial PRIMARY KEY,
  session_code text NOT NULL,
  student_name text NOT NULL,
  joined_at timestamp with time zone DEFAULT NOW()
);

-- Create index
CREATE INDEX idx_quick_play_joins_session_code ON public.quick_play_joins(session_code);

-- Enable RLS
ALTER TABLE public.quick_play_joins ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow insert" ON public.quick_play_joins FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow select" ON public.quick_play_joins FOR SELECT TO public USING (true);

-- Realtime
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime;
ALTER PUBLICATION supabase_realtime ADD TABLE public.quick_play_joins;
