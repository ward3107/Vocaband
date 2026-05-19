# R2 audio migration runbook

> One-time migration: move word + lemma MP3s from Supabase Storage to
> Cloudflare R2 + CDN. ~30 minutes hands-on, mostly waiting on the upload.
>
> Why: ~3× lower latency for Israeli users + zero egress fees at scale.
> The half-built state (bucket created, code paths wired, no data) is
> the worst — finish or revert. This doc finishes it.

---

## Prerequisites

- Cloudflare account access (`Wasya92@gmail.com`)
- Supabase service role key (in your password vault / `.env.local`)
- Local checkout of `ward3107/Vocaband` with `npm install` already done
- About 30 minutes uninterrupted (the mirror script runs ~10 min)

---

## Step 1 — Create an R2 API token

Cloudflare dashboard → R2 → **Manage R2 API Tokens** → Create API token.

| Field | Value |
|---|---|
| Token name | `vocaband-audio-mirror` |
| Permissions | Object Read & Write |
| Specify buckets | `vocaband-audio` only (not "all buckets") |
| TTL | 7 days (this is a one-shot — short-lived is safer) |

Copy the **Access Key ID** and **Secret Access Key**. You won't see the secret again.

---

## Step 2 — Configure `.env.local`

Add these to `/Vocaband/.env.local` (don't commit — `.env*` is already in `.gitignore`):

```bash
SUPABASE_URL=https://auth.vocaband.com
SUPABASE_SERVICE_ROLE_KEY=<from password vault>
R2_ACCOUNT_ID=df686d8a898f1c25a378952aa4c99350
R2_ACCESS_KEY_ID=<from Step 1>
R2_SECRET_ACCESS_KEY=<from Step 1>
R2_BUCKET=vocaband-audio
```

---

## Step 3 — Run the mirror script

```bash
npm install --save-dev @aws-sdk/client-s3
npx tsx scripts/mirror-supabase-to-r2.ts
```

Expected output:
- `sound/`: 9,130 MP3s (~59 MB English word audio)
- `sound-hebrew/`: variable (Hebrew lemma audio if generated; may be empty)

The script is **idempotent + resumable** — safe to Ctrl+C and re-run. Only changed or missing files re-upload (ETag comparison).

If it fails mid-flight: re-run. If it fails with auth errors: re-check the token permissions in Step 1.

---

## Step 4 — Expose the bucket via CDN

Two options. Pick one.

**Option A — Quick start (r2.dev subdomain)**
1. Dashboard → R2 → `vocaband-audio` → Settings → **R2.dev subdomain** → Enable
2. You get a URL like `https://pub-<hash>.r2.dev`
3. Test: `curl -I https://pub-<hash>.r2.dev/sound/1.mp3` → should return `200 OK`

**Option B — Custom domain (recommended for production)**
1. Dashboard → R2 → `vocaband-audio` → Settings → **Custom Domains** → Connect Domain
2. Use `audio.vocaband.com`
3. Cloudflare auto-creates the CNAME (vocaband.com must already be on Cloudflare DNS — it is)
4. Test: `curl -I https://audio.vocaband.com/sound/1.mp3` → `200 OK`

**Why B is better:** clean URL, won't break if R2.dev subdomain policy ever changes, plays nicer with future CSP tightening.

---

## Step 5 — Set the build-time env var

The client (`src/utils/audioUrl.ts:27`) already checks `VITE_CLOUDFLARE_URL` first and falls back to Supabase Storage. You just need to set the var.

For Cloudflare Workers deploy:
1. Dashboard → Workers & Pages → `vocaband` → Settings → **Variables and Secrets**
2. Add variable (Production environment):
   - Type: **Plaintext**
   - Name: `VITE_CLOUDFLARE_URL`
   - Value: `https://audio.vocaband.com` (or your r2.dev URL from Step 4)
3. **Save and Deploy**

Vite needs this at *build* time, not runtime — make sure the deploy pipeline picks it up before `vite build` runs. If your build is triggered by `git push`, just push to `main` (a no-op commit if needed) to trigger a rebuild.

---

## Step 6 — Verify

After deploy lands:

1. Open `https://www.vocaband.com` in a fresh incognito window
2. DevTools → Network tab → filter for `mp3`
3. Start any game with audio (Classic, Listening, Fill-Blank)
4. **Expected:** audio requests go to `audio.vocaband.com/sound/<id>.mp3` (or your r2.dev URL), **not** `auth.vocaband.com/storage/...`
5. Check Response Headers → `cf-cache-status: HIT` after the first request

Spot-check 5–10 different words to make sure no IDs 404.

---

## Rollback (if anything looks wrong)

The fallback path in `audioUrl.ts` means you can revert instantly by **clearing the env var**:

1. Dashboard → Workers & Pages → `vocaband` → Settings → Variables and Secrets
2. Delete `VITE_CLOUDFLARE_URL`
3. Redeploy

No data loss — Supabase Storage still has the originals (we mirrored, not moved).

Once you've run in production for 1–2 weeks without issues, you can optionally delete the Supabase Storage `sound` bucket to save storage cost. Don't do this until you're sure.

---

## Cleanup

After successful migration:
- Revoke the R2 API token from Step 1 (or let the 7-day TTL expire)
- Remove the R2 credentials from `.env.local`
- Tick off the matching row in the Notion master roadmap
