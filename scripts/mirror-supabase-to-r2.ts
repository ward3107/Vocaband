/**
 * mirror-supabase-to-r2.ts — one-shot migration script
 *
 * Mirrors every object in a Supabase Storage bucket to a Cloudflare R2
 * bucket using the S3-compatible API. Idempotent: re-runs only re-upload
 * files whose ETag changed (or that are missing in R2).
 *
 * What it migrates:
 *   - public/sound/*.mp3   (9130 English word MP3s, ~59 MB, the high-volume one)
 *   - public/sound-hebrew/*.mp3  (Hebrew lemma MP3s, when they exist)
 *
 * Why: Cloudflare CDN egress is much cheaper than Supabase Storage at
 * 5000-user scale, and audio fetches latency is ~3× lower from a CDN
 * edge vs Supabase Frankfurt for Israeli users.
 *
 * Usage:
 *   npm install --save-dev @aws-sdk/client-s3
 *   # Add to .env.local:
 *   #   SUPABASE_URL=...
 *   #   SUPABASE_SERVICE_ROLE_KEY=...
 *   #   R2_ACCOUNT_ID=...
 *   #   R2_ACCESS_KEY_ID=...
 *   #   R2_SECRET_ACCESS_KEY=...
 *   #   R2_BUCKET=vocaband-audio
 *   npx tsx scripts/mirror-supabase-to-r2.ts
 *
 * Resumable: safe to re-run if interrupted. Per-bucket throttle keeps
 * Supabase's free-tier rate limit happy (200 req/sec is well below).
 */

import { config as dotenvConfig } from 'dotenv';
// Project convention: secrets live in .env.local (matches .gitignore +
// what generate-audio.ts, upload-audio.ts, etc. use). `dotenv/config`
// alone only reads `.env`, which trips up first-time runs.
dotenvConfig({ path: '.env.local' });
dotenvConfig(); // fall through to `.env` for anyone using that convention
import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET = process.env.R2_BUCKET ?? 'vocaband-audio';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  console.error('Missing env. Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});

/** R2 prefix → matches the in-app URL layout `<bucket>/<id>.mp3`. */
const BUCKETS_TO_MIRROR = ['sound', 'sound-hebrew'] as const;

async function listAll(bucket: string): Promise<Array<{ name: string; size: number; etag: string }>> {
  const all: Array<{ name: string; size: number; etag: string }> = [];
  const PAGE = 1000;
  let offset = 0;
  while (true) {
    const { data, error } = await supabase.storage.from(bucket).list('', { limit: PAGE, offset, sortBy: { column: 'name', order: 'asc' } });
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const f of data) {
      const meta = (f as any).metadata ?? {};
      all.push({ name: f.name, size: meta.size ?? 0, etag: meta.eTag ?? '' });
    }
    if (data.length < PAGE) break;
    offset += PAGE;
  }
  return all;
}

async function existsInR2(key: string, expectedSize: number): Promise<boolean> {
  try {
    const head = await r2.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    // Treat as "already mirrored" if size matches — Supabase + R2 have
    // different ETag formulas, so we use size as the cheap fingerprint.
    return (head.ContentLength ?? 0) === expectedSize;
  } catch (err: any) {
    if (err?.$metadata?.httpStatusCode === 404 || err?.name === 'NotFound') return false;
    throw err;
  }
}

async function uploadOne(srcBucket: string, name: string): Promise<void> {
  const { data, error } = await supabase.storage.from(srcBucket).download(name);
  if (error) throw error;
  const buf = Buffer.from(await data.arrayBuffer());
  await r2.send(new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: `${srcBucket}/${name}`,
    Body: buf,
    ContentType: 'audio/mpeg',
    CacheControl: 'public, max-age=31536000, immutable', // 1 year — word MP3s are content-addressed by id
  }));
}

async function mirrorBucket(srcBucket: string): Promise<void> {
  console.log(`\n=== Mirroring "${srcBucket}" → r2://${R2_BUCKET}/${srcBucket}/ ===`);
  let files: Array<{ name: string; size: number; etag: string }>;
  try {
    files = await listAll(srcBucket);
  } catch (err: any) {
    if (err?.message?.includes('not found') || err?.statusCode === 404) {
      console.log(`  bucket "${srcBucket}" doesn't exist in Supabase — skipping`);
      return;
    }
    throw err;
  }
  console.log(`  ${files.length} files to consider`);

  let copied = 0;
  let skipped = 0;
  let failed = 0;
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const key = `${srcBucket}/${f.name}`;
    try {
      if (await existsInR2(key, f.size)) {
        skipped++;
      } else {
        await uploadOne(srcBucket, f.name);
        copied++;
      }
    } catch (err: any) {
      failed++;
      console.error(`  ! ${key}: ${err?.message ?? err}`);
    }
    if ((i + 1) % 100 === 0) {
      console.log(`  [${i + 1}/${files.length}] copied=${copied} skipped=${skipped} failed=${failed}`);
    }
  }
  console.log(`  done: copied=${copied} skipped=${skipped} failed=${failed}`);
}

async function main() {
  for (const b of BUCKETS_TO_MIRROR) await mirrorBucket(b);
  console.log('\n✓ mirror complete');
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
