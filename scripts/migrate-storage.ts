/**
 * Tokyo → Frankfurt Supabase migration — storage half.
 *
 * Lists every object in every bucket on Tokyo, downloads each object,
 * and re-uploads it to Frankfurt under the same bucket + key. Bucket
 * configurations (public flag, allowed MIME types, file size limits)
 * are copied too.
 *
 * Prereqs:
 *   - A .env.migrate file in repo root with:
 *       TOKYO_URL=https://<tokyo-ref>.supabase.co
 *       TOKYO_SERVICE_ROLE_KEY=<tokyo service_role JWT>
 *       FRANKFURT_URL=https://ilbeskwldyrleltnxyrp.supabase.co
 *       FRANKFURT_SERVICE_ROLE_KEY=<frankfurt service_role JWT>
 *
 * Get the service_role key from each project's
 *   Supabase dashboard → Project Settings → API → service_role
 * Never commit .env.migrate — it's already gitignored.
 *
 * Usage:
 *   npx tsx scripts/migrate-storage.ts
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Tiny .env loader — we don't depend on dotenv because this script is a
// one-shot migration tool and shouldn't drag in extra deps.
function loadEnv(path: string): Record<string, string> {
  if (!existsSync(path)) {
    console.error(`✗ ${path} not found. See header comment for format.`);
    process.exit(1);
  }
  const env: Record<string, string> = {};
  for (const line of readFileSync(path, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    // Tolerate optional quotes around the value.
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

const env = loadEnv(resolve(process.cwd(), '.env.migrate'));

const required = ['TOKYO_URL', 'TOKYO_SERVICE_ROLE_KEY', 'FRANKFURT_URL', 'FRANKFURT_SERVICE_ROLE_KEY'] as const;
for (const k of required) {
  if (!env[k]) {
    console.error(`✗ ${k} is missing in .env.migrate`);
    process.exit(1);
  }
}

const tokyo = createClient(env.TOKYO_URL, env.TOKYO_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const frankfurt = createClient(env.FRANKFURT_URL, env.FRANKFURT_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

interface BucketInfo {
  id: string;
  name: string;
  public: boolean;
  file_size_limit: number | null;
  allowed_mime_types: string[] | null;
}

/** Recursively list every object key in a bucket (handles nested folders). */
async function listAllKeys(client: ReturnType<typeof createClient>, bucket: string, prefix = ''): Promise<string[]> {
  const keys: string[] = [];
  const { data, error } = await client.storage.from(bucket).list(prefix, { limit: 1000, sortBy: { column: 'name', order: 'asc' } });
  if (error) {
    console.error(`  ✗ list error in ${bucket}/${prefix}: ${error.message}`);
    return keys;
  }
  for (const entry of data ?? []) {
    // Supabase distinguishes folders from files by having `id === null` on folders.
    // A "folder" entry's name is the sub-prefix; recurse into it.
    const full = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.id === null) {
      const nested = await listAllKeys(client, bucket, full);
      keys.push(...nested);
    } else {
      keys.push(full);
    }
  }
  return keys;
}

async function copyOneFile(bucket: string, key: string): Promise<'ok' | 'skipped' | 'failed'> {
  // Download from Tokyo, upload to Frankfurt. We use .download (returns Blob)
  // rather than getPublicUrl because private buckets would refuse a public URL.
  const dl = await tokyo.storage.from(bucket).download(key);
  if (dl.error || !dl.data) {
    console.error(`    ✗ download ${bucket}/${key}: ${dl.error?.message ?? 'no data'}`);
    return 'failed';
  }
  const ul = await frankfurt.storage.from(bucket).upload(key, dl.data, {
    upsert: true,
    contentType: dl.data.type || 'application/octet-stream',
  });
  if (ul.error) {
    // `upsert: true` + the object already existing isn't an error, but some
    // other errors genuinely are. Treat the "already exists" class as skip.
    if (ul.error.message.toLowerCase().includes('already exists')) return 'skipped';
    console.error(`    ✗ upload ${bucket}/${key}: ${ul.error.message}`);
    return 'failed';
  }
  return 'ok';
}

async function ensureBucket(bucket: BucketInfo): Promise<void> {
  // Check if it exists; if not, create it with the same config as Tokyo.
  const existing = await frankfurt.storage.listBuckets();
  const found = existing.data?.find(b => b.name === bucket.name);
  if (found) return;

  const { error } = await frankfurt.storage.createBucket(bucket.name, {
    public: bucket.public,
    fileSizeLimit: bucket.file_size_limit ?? undefined,
    allowedMimeTypes: bucket.allowed_mime_types ?? undefined,
  });
  if (error) {
    console.error(`  ✗ create bucket ${bucket.name}: ${error.message}`);
    throw error;
  }
  console.log(`  ✓ created bucket ${bucket.name} (public=${bucket.public})`);
}

async function main() {
  console.log(`Source: ${env.TOKYO_URL}`);
  console.log(`Target: ${env.FRANKFURT_URL}`);
  console.log('');

  const { data: buckets, error } = await tokyo.storage.listBuckets();
  if (error || !buckets) {
    console.error(`✗ listBuckets failed: ${error?.message}`);
    process.exit(1);
  }
  console.log(`[1/2] Mirroring ${buckets.length} bucket(s)`);

  let totalOk = 0, totalSkipped = 0, totalFailed = 0;

  for (const b of buckets as unknown as BucketInfo[]) {
    console.log(`\n  bucket: ${b.name}`);
    await ensureBucket(b);
    const keys = await listAllKeys(tokyo, b.name);
    console.log(`    ${keys.length} file(s) to copy`);

    // Batch copies 8 at a time — Supabase Storage handles concurrent
    // uploads well and this gets ~10× wall-clock speedup on 9000+ audio
    // files vs. serial.
    const CONCURRENCY = 8;
    let ok = 0, skipped = 0, failed = 0;
    for (let i = 0; i < keys.length; i += CONCURRENCY) {
      const batch = keys.slice(i, i + CONCURRENCY);
      const results = await Promise.all(batch.map(k => copyOneFile(b.name, k)));
      for (const r of results) {
        if (r === 'ok') ok++;
        else if (r === 'skipped') skipped++;
        else failed++;
      }
      // Progress line for long buckets.
      if (keys.length >= 100 && (i + CONCURRENCY) % 200 === 0) {
        process.stdout.write(`    ${Math.min(i + CONCURRENCY, keys.length)}/${keys.length}\r`);
      }
    }
    console.log(`    ✓ ${ok} copied, ${skipped} already existed, ${failed} failed`);
    totalOk += ok; totalSkipped += skipped; totalFailed += failed;
  }

  console.log('');
  console.log(`[2/2] Done — total ${totalOk} copied, ${totalSkipped} skipped, ${totalFailed} failed`);
  if (totalFailed > 0) process.exit(1);
}

main().catch(err => { console.error(err); process.exit(1); });
