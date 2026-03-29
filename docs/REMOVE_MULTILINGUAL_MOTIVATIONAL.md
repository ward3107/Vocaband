# Remove Hebrew & Arabic Motivational Phrases from Supabase

## Overview
This guide helps you identify and remove Hebrew and Arabic motivational audio files from your Supabase storage bucket.

## Step 1: Check What's in Storage

### Option A: Using the Node.js Script (Recommended)

```bash
# List all motivational files
node scripts/manage-motivational.js
```

This will show:
- ✓ English files (safe to keep)
- ⚠️ Hebrew files (detected by Hebrew characters)
- ⚠️ Arabic files (detected by Arabic characters)

### Option B: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **Storage**
3. Find the **`motivational`** bucket
4. Look through the files for Hebrew/Arabic names

## Step 2: Delete Non-English Files

### Option A: Using the Node.js Script (Automatic)

```bash
# Preview what will be deleted
node scripts/manage-motivational.js

# Actually delete the files
node scripts/manage-motivotional.js --delete
```

### Option B: Manual Deletion via Supabase Dashboard

1. Go to **Storage** → **`motivational`** bucket
2. Select files with Hebrew/Arabic names
3. Click **Delete**

### Option C: Using Supabase SQL Editor

If you want to delete via SQL (for tables, not storage):

```sql
-- Note: This is for DATABASE tables, not storage buckets
-- Storage files must be deleted via the dashboard or API

-- If you have a motivational_phrases table:
DELETE FROM motivational_phrases
WHERE lang != 'en';
```

## Step 3: Verify Cleanup

Run the list script again to confirm:

```bash
node scripts/manage-motivational.js
```

You should see:
- ✓ Hebrew files found: 0
- ✓ Arabic files found: 0

## What Gets Deleted

The script detects Hebrew/Arabic files using:
- **Hebrew detection**: Files containing Unicode characters `\u0590-\u05FF`
- **Arabic detection**: Files containing Unicode characters `\u0600-\u06FF`

Examples of files that would be deleted:
- `מעולה-כידי.mp3` (Hebrew: "Well done")
- `عمل-رائع.mp3` (Arabic: "Great job")
- `bravo-he.mp3` (if it contains Hebrew characters)

**Safe files that will be kept**:
- `great-job.mp3`
- `well-done.mp3`
- `awesome.mp3`
- etc.

## Troubleshooting

### Script won't run?

Make sure you have the required dependencies:
```bash
npm install @supabase/supabase-js dotenv
```

### Permission denied?

Ensure your `.env.local` has:
```
VITE_SUPABASE_URL=your-project-url
SUPABASE_SERVICE_KEY=your-service-key
```

### Can't see files?

1. Check you're looking at the right bucket: `motivational`
2. Ensure you have the correct project permissions
3. Try refreshing the Supabase dashboard

## Additional Cleanup

If you also want to remove Hebrew/Arabic motivational phrases from your codebase:

1. **Check for hardcoded translations:**
   ```bash
   # Search for Hebrew/Arabic in your code
   grep -r "[\u0590-\u05FF]" src/
   grep -r "[\u0600-\u06FF]" src/
   ```

2. **Check DemoMode component:**
   - Open `src/components/DemoMode.tsx`
   - Look for Hebrew/Arabic translations in `demoTranslations`

3. **Review vocabulary lists:**
   - Check `src/vocabulary.ts` or `src/vocabulary-matching.ts`
   - Look for Hebrew/Arabic word entries

## After Cleanup

Your app will:
- ✅ Only play English motivational audio
- ✅ Reduce storage usage
- ✅ Avoid confusion in multi-language environments
- ✅ Maintain consistent user experience

## Need Help?

If you encounter issues:
1. Check the browser console for errors
2. Verify your Supabase credentials
3. Ensure proper bucket permissions
4. Check the storage bucket name is exactly `motivational`
