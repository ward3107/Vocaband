# TODO: Student Progress Save Issue

## Status: IN PROGRESS - Code changed, needs testing

### Problem
Students can't save their game progress. Error: "Anonymous sign-ins are disabled"

### What was changed (in `src/App.tsx`):

1. **processStudentProfile function (~lines 1837-1900)**
   - Removed `signInAnonymously()` call
   - Now uses `profile.auth_uid` directly
   - Added users table upsert for XP/streak tracking

2. **saveScore function (~lines 2590-2630)**
   - No longer requires Supabase auth session
   - Uses `user.uid` directly

### Test tomorrow:
1. Run: `npx supabase db push` (apply migrations)
2. Hard refresh browser (Ctrl+Shift+R)
3. Have student log in and play a game
4. Check if score saves in progress table

### Files to check:
- `src/App.tsx` - processStudentProfile and saveScore functions
- `supabase/migrations/20260329_add_save_progress_rpc.sql`
- `supabase/migrations/20260327_student_profiles.sql`
