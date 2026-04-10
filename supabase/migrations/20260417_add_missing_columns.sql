-- ============================================
-- Add missing columns to users and assignments tables
-- ============================================
-- The app code references these columns but they were never added to the schema.
-- Without these columns, xp/streak updates and assignment saves silently fail.

-- 1. Add gamification columns to users table
-- These are used by the app to track student progress directly on the users row.
-- (student_profiles also has xp, but the app writes to users for the logged-in user.)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS streak INTEGER DEFAULT 0;

-- 2. Add shop/theme columns to users table
-- Used by the Shop feature for purchased items and active cosmetics.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS unlocked_avatars TEXT[] DEFAULT '{}';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS unlocked_themes TEXT[] DEFAULT '{}';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS power_ups JSONB DEFAULT '{}';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS active_theme TEXT DEFAULT 'default';

-- 3. Add sentence columns to assignments table
-- Used by the Sentence Builder game mode.
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS sentences TEXT[] DEFAULT '{}';
ALTER TABLE public.assignments ADD COLUMN IF NOT EXISTS sentence_difficulty INTEGER DEFAULT 2;
