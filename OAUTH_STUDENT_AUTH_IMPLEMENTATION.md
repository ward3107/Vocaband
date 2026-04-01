# OAuth Student Authentication - Implementation Guide

## Overview
This document describes the OAuth student authentication system. Students now sign in with Google OAuth, then enter a class code to join a classroom. Teachers are pre-approved by the admin via Supabase Dashboard.

## Database Changes

### 1. Teacher Management (Manual via Supabase Dashboard)

**Table:** `public.teacher_profiles`

**How to add teachers:**
1. Go to Supabase Dashboard → Table Editor
2. Find `teacher_profiles` table
3. Click "Insert row"
4. Add teacher details:
   - email: `teacher@school.il`
   - display_name: `Sarah Cohen`
   - school_name: `ABC School`
   - status: `active` (default)

**No API access** - Teachers can only be added/removed via Supabase Dashboard for maximum security.

### 2. Student Profiles (Auto-Created via OAuth)

**Updated Table:** `public.student_profiles`

**New columns:**
- `email`: TEXT UNIQUE - From Google OAuth (verified)
- `avatar`: TEXT - Student's chosen avatar (default: '🦊')
- `auth_uid`: UUID - Links to Supabase auth.users

**Function:** `public.get_or_create_student_profile_oauth()`
- Takes email, auth_uid from Google OAuth
- Takes class_code, display_name, avatar from student input
- Returns profile + is_new flag
- Creates pending_approval status (teacher must approve)

### 3. User Role Detection

**View:** `public.user_roles`
- Returns current user's role: 'teacher', 'student', or 'new_user'
- Based on email lookup in teacher_profiles or student_profiles

**Function:** `public.is_teacher(email)`
- Returns TRUE if email is in teacher_profiles
- Used in OAuth callback to route users

## Frontend Flow

### Student Signup Flow

```
1. Student opens Vocaband
   ↓
2. Clicks "Sign in with Google"
   ↓
3. Google OAuth: "Allow Vocaband to access your email?"
   ↓
4. Student clicks "Allow"
   ↓
5. OAuth callback - Check user role:
   ↓
   ├─ Is teacher? → Teacher dashboard
   ├─ Is student? → Student dashboard
   └─ New user? → Enter class code flow
       ↓
6. Student enters class code
   ↓
7. Profile created with:
   - email (from Google)
   - auth_uid (from Supabase)
   - display_name (from Google)
   - class_code (from input)
   - avatar (chosen or default)
   - status: 'pending_approval'
   ↓
8. Teacher sees student in approval queue
   ↓
9. Teacher approves → status: 'active'
   ↓
10. Student can access class
```

## Security Benefits

### Before (Anonymous Auth + Avatar)
- ❌ Anyone could claim any name
- ❌ No email verification
- ❌ Name collisions possible
- ❌ Impersonation easy

### After (OAuth + Class Code)
- ✅ Verified email from Google
- ✅ Real identity tied to account
- ✅ No name collisions (email unique)
- ✅ Impersonation impossible (need Google account)
- ✅ Teachers pre-approved (manual whitelist)
- ✅ Audit trail (email logs)

## Deployment Steps

### Step 1: Apply Database Migration
1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `supabase/migrations/20260401_oauth_student_auth.sql`
3. Execute the SQL
4. Verify tables created:
   - `teacher_profiles` (empty)
   - `student_profiles` (updated with email, avatar columns)

### Step 2: Enable Google OAuth in Supabase
1. Go to Supabase Dashboard → Authentication → Providers
2. Enable Google provider
3. Add your Google OAuth credentials (Client ID, Secret)
4. Set redirect URL: `https://your-domain.com/auth/callback`

### Step 3: Add Teachers (Manual)
1. Go to Supabase Dashboard → Table Editor
2. Open `teacher_profiles` table
3. Insert teacher records:
   ```sql
   INSERT INTO teacher_profiles (email, display_name, school_name)
   VALUES
     ('teacher1@school.il', 'Teacher Name 1', 'School 1'),
     ('teacher2@school.il', 'Teacher Name 2', 'School 2');
   ```

### Step 4: Test Student Signup
1. Open Vocaband
2. Click "Sign in with Google"
3. Authenticate with test Gmail account
4. Enter class code
5. Verify student profile created in `student_profiles` table
6. Verify teacher sees student in approval queue

## Teacher Management (Supabase Dashboard)

### Add Teacher
```
Supabase Dashboard → Table Editor → teacher_profiles
→ Insert Row
→ Fill: email, display_name, school_name
→ Save
```

### Remove Teacher
```
Supabase Dashboard → Table Editor → teacher_profiles
→ Find teacher row
→ Click Delete
→ Confirm
```

### List All Teachers
```
Supabase Dashboard → Table Editor → teacher_profiles
→ View all rows
```

### Update Teacher
```
Supabase Dashboard → Table Editor → teacher_profiles
→ Find teacher row
→ Edit fields
→ Save
```

## Testing Checklist

- [ ] Migration applied successfully
- [ ] `teacher_profiles` table created
- [ ] `student_profiles` has email, avatar columns
- [ ] Google OAuth enabled in Supabase
- [ ] Teacher added via Supabase Dashboard
- [ ] Teacher can log in and see dashboard
- [ ] Student can sign up with Google
- [ ] Student enters class code → profile created
- [ ] Teacher sees student in approval queue
- [ ] Student approved → can access class
- [ ] Legacy students (without email) still work

## Technical Details

### OAuth Function Signature
```sql
FUNCTION public.get_or_create_student_profile_oauth(
  p_class_code TEXT,
  p_display_name TEXT,
  p_email TEXT,
  p_auth_uid UUID,
  p_avatar TEXT DEFAULT '🦊'
)
RETURNS TABLE (
  profile public.student_profiles,
  is_new BOOLEAN
)
```

### User Role Detection
```sql
-- In OAuth callback
SELECT role FROM public.user_roles;
-- Returns: 'teacher', 'student', or 'new_user'
```

### RPC Call from Frontend
```typescript
// After OAuth callback
const { data: result } = await supabase
  .rpc('get_or_create_student_profile_oauth', {
    p_class_code: classCode,
    p_display_name: displayName,
    p_email: email,
    p_auth_uid: authUid,
    p_avatar: avatar
  });
```

## Migration Notes

### Legacy Students (No Email)
- Old students without email still work
- They can log in with anonymous auth
- Consider migrating them to OAuth (ask them to sign in with Google)

### Future Enhancements (Optional)
1. Allow students to link multiple classes
2. Add parent email for under-13 compliance
3. Add student settings page
4. Allow avatar changes after signup
5. Add "Remember me" across sessions

## Troubleshooting

### Issue: Student sees "Not authenticated" error
**Solution:** Check that OAuth callback is properly configured in Supabase

### Issue: Teacher can't access dashboard
**Solution:** Verify teacher email is in `teacher_profiles` table with status='active'

### Issue: Student not in approval queue
**Solution:** Check that `get_or_create_student_profile_oauth` was called with correct parameters

### Issue: "Function not found" error
**Solution:** Verify migration was applied successfully, check function exists

## Security Best Practices

1. **Teacher Whitelist:** Only pre-approved emails in `teacher_profiles`
2. **No Admin API:** Teachers managed via Supabase Dashboard only
3. **Email Verification:** Google OAuth provides verified emails
4. **Class Codes:** Still required for students to join classes
5. **Pending Approval:** New students require teacher approval
6. **Audit Trail:** All actions tied to verified email addresses
