# Cloudflare R2 Setup for Motivational Audio

## Overview
Host your motivational audio files on Cloudflare R2 for better performance and global caching.

## Step 1: Create Cloudflare R2 Bucket

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **R2** → **Create Bucket**
3. Name it: `vocaband-audio` (or any name you prefer)
4. Select a location (or keep "Auto" for best performance)

## Step 2: Enable Public Access

1. Open your bucket
2. Go to **Settings** → **Public Access**
3. Click **Enable Public Access**
4. Copy your **Public Bucket URL** (e.g., `https://your-bucket.r2.dev`)

## Step 3: Upload Your Audio Files

You have 64 motivational phrases ready to upload. Name them exactly as listed below:

```
great-job.mp3, well-done.mp3, awesome.mp3, keep-it-up.mp3, nailed-it.mp3,
brilliant.mp3, youre-on-fire.mp3, fantastic.mp3, way-to-go.mp3, superstar.mp3,
amazing.mp3, perfect.mp3, excellent.mp3, outstanding.mp3, incredible.mp3,
wonderful.mp3, spectacular.mp3, terrific.mp3, superb.mp3, magnificent.mp3,
you-got-it.mp3, thats-right.mp3, correct.mp3, spot-on.mp3, exactly-right.mp3,
you-rock.mp3, keep-going.mp3, dont-stop.mp3, youre-amazing.mp3, good-thinking.mp3,
nice-work.mp3, good-work.mp3, you-did-it.mp3, first-try.mp3, like-a-pro.mp3,
you-are-a-champion.mp3, unstoppable.mp3, on-point.mp3, crushing-it.mp3,
legend.mp3, genius.mp3, word-master.mp3, vocab-hero.mp3, language-champion.mp3,
english-star.mp3, you-smashed-it.mp3, top-of-the-class.mp3, gold-star.mp3,
level-up.mp3, new-high-score.mp3, on-a-roll.mp3, nothing-can-stop-you.mp3,
brain-power.mp3, quick-learner.mp3, smart-cookie.mp3, proud-of-you.mp3,
hard-work-pays-off.mp3, knowledge-is-power.mp3, english-unlocked.mp3,
new-word-learned.mp3, one-step-closer.mp3, making-progress.mp3, never-give-up.mp3,
you-can-do-it.mp3, full-marks.mp3, ten-out-of-ten.mp3, flawless.mp3,
exceptional.mp3, elite.mp3, top-tier.mp3, first-class.mp3, wow.mp3,
unbelievable.mp3, mic-drop.mp3, pure-talent.mp3
```

### Upload Methods

**Option A: Cloudflare Dashboard**
1. Open your bucket
2. Click **Upload**
3. Select all 64 MP3 files
4. Click **Upload**

**Option B: Using wrangler CLI**
```bash
# Install wrangler
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Upload all files
wrangler r2 object put vocaband-audio/great-job.mp3 --file=path/to/great-job.mp3
# Repeat for all 64 files...
```

**Option C: Use a script** (create `scripts/upload-to-cloudflare.js`):
```javascript
// Example upload script
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { readFileSync } from 'fs';
import { glob } from 'glob';

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

const files = glob.sync('audio/*.mp3');
for (const file of files) {
  const key = file.replace('audio/', '').replace('.mp3', '');
  await r2Client.send(new PutObjectCommand({
    Bucket: 'vocaband-audio',
    Key: `${key}.mp3`,
    Body: readFileSync(file),
  }));
  console.log(`✓ Uploaded ${key}`);
}
```

## Step 4: Configure Your App

Add your Cloudflare R2 URL to `.env.local`:

```bash
VITE_CLOUDFLARE_URL="https://your-bucket.r2.dev"
```

Or for a custom domain:
```bash
VITE_CLOUDFLARE_URL="https://audio.vocaband.com"
```

## Step 5: Test

1. Restart your dev server:
   ```bash
   npm run dev
   ```

2. Play the game and listen for motivational audio

3. Check browser DevTools → Network to confirm files load from Cloudflare

## Benefits of Cloudflare R2

- ✅ **Global CDN**: Files cached in 300+ locations worldwide
- ✅ **Fast**: ~50ms latency globally
- ✅ **Free Tier**: 10GB storage + 10M class A operations/month
- ✅ **Cheap**: $0.015/GB after free tier (vs Supabase $0.021/GB)
- ✅ **Bandwidth**: No egress fees (Cloudflare's biggest advantage!)
- ✅ **Public URLs**: No authentication needed for public files

## Optional: Custom Domain

1. Go to **R2** → **Your Bucket** → **Settings** → **Public Access**
2. Click **Add Custom Domain**
3. Enter: `audio.vocaband.com` (or your preferred subdomain)
4. Update DNS records as instructed
5. Update `.env.local`:
   ```bash
   VITE_CLOUDFLARE_URL="https://audio.vocaband.com"
   ```

## Fallback Behavior

If `VITE_CLOUDFLARE_URL` is not set, the app automatically falls back to Supabase storage.

## File Naming Convention

All files must match these patterns:
- ✅ `great-job.mp3` (kebab-case)
- ❌ `Great_Job.mp3` (wrong case)
- ❌ `great job.mp3` (spaces not allowed)
- ❌ `greatJob.mp3` (camelCase not allowed)

## Generating Audio Files

If you need to generate the 64 MP3 files, you can:

1. **Use AI Voice Services**:
   - ElevenLabs: https://elevenlabs.io
   - OpenAI TTS API
   - Google Cloud Text-to-Speech

2. **Use Free TTS**:
   - [Natural Readers](https://www.naturalreaders.com/online/)
   - [TTSMP3.com](https://ttsmp3.com/)
   - Download each phrase as MP3

3. **Batch Generate** (Python script example):
   ```python
   from gtts import gTTS
   import os

   phrases = ["great-job", "well-done", "awesome", ...]  # all 64 phrases

   for phrase in phrases:
       text = phrase.replace("-", " ").capitalize()
       tts = gTTS(text=text, lang='en', slow=False)
       tts.save(f"{phrase}.mp3")
       print(f"✓ Generated {phrase}.mp3")
   ```

## Troubleshooting

### Files not loading?
- Check the Network tab in DevTools
- Verify `VITE_CLOUDFLARE_URL` is set correctly
- Ensure bucket has **Public Access** enabled
- Confirm filenames match exactly (case-sensitive)

### CORS errors?
- Add CORS rules to your R2 bucket:
  ```javascript
  // In Cloudflare Dashboard → R2 → Your Bucket → Settings → CORS
  [
    {
      "AllowedOrigins": ["*"],
      "AllowedMethods": ["GET", "HEAD"],
      "AllowedHeaders": ["*"],
      "MaxAgeSeconds": 3600
    }
  ]
  ```

### Slow loading?
- Check your R2 bucket location
- Consider using a custom domain for better caching
- Verify Cloudflare CDN is enabled (automatic with R2 public URLs)
