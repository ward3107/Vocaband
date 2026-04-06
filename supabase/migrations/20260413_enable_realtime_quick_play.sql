-- Enable Supabase Realtime on progress and quick_play_sessions tables.
-- This replaces HTTP polling with push-based WebSocket events,
-- reducing Quick Play requests from ~1500+ to near-zero per session.
ALTER PUBLICATION supabase_realtime ADD TABLE public.progress;
ALTER PUBLICATION supabase_realtime ADD TABLE public.quick_play_sessions;
