/**
 * Upload motivational audio files to Cloudflare Workers/Pages
 * Run: node scripts/upload-to-cloudflare.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SOURCE_DIR = 'c:\\Users\\Waseem\\Downloads\\Vocaband\\motivational-audio';

// Get all MP3 files
const files = fs.readdirSync(SOURCE_DIR)
  .filter(f => f.endsWith('.mp3'))
  .sort();

console.log(`\n📁 Found ${files.length} audio files\n`);
console.log('='.repeat(60));

async function uploadToWorkers() {
  console.log('🚀 Uploading to Cloudflare Workers...\n');

  let success = 0;
  let failed = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const filePath = path.join(SOURCE_DIR, file);
    const key = file.replace('.mp3', '');

    process.stdout.write(`[${i + 1}/${files.length}] Uploading ${file}... `);

    try {
      // Upload using wrangler
      const command = `wrangler kv:key put --binding-id=AUDIO_FILES "${key}" --path="${filePath}"`;
      await execAsync(command);
      success++;
      process.stdout.write('✓\n');
    } catch (error) {
      failed++;
      process.stdout.write(`✗\n`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✓ Success: ${success}`);
  console.log(`✗ Failed: ${failed}`);
  console.log('='.repeat(60));
}

async function deployAsPages() {
  console.log('📄 Deploying as Cloudflare Pages...\n');

  // Create a simple index.html for the Pages project
  const publicDir = path.join(__dirname, '../public/motivational');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // Copy all files to public/motivational
  for (const file of files) {
    const sourcePath = path.join(SOURCE_DIR, file);
    const destPath = path.join(publicDir, file);
    fs.copyFileSync(sourcePath, destPath);
    console.log(`✓ Copied ${file}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✓ Files copied to public/motivational/');
  console.log('\n🚀 Now deploy to Cloudflare Pages:');
  console.log('   wrangler pages deploy public --project-name=vocaband-audio');
  console.log('='.repeat(60));
}

// Ask user which method to use
console.log('Choose upload method:');
console.log('1. Upload to Workers KV (requires KV binding setup)');
console.log('2. Deploy as Pages (recommended - files become public URLs)\n');

console.log('⚠️  RECOMMENDED: Use Option 2 (Pages)\n');
console.log('This will make files available at:');
console.log('  https://audio.vocaband.com/motivational/great-job.mp3\n');

console.log('Press 1 or 2...');

process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.setEncoding('utf8');

process.stdin.on('data', async (key) => {
  process.stdin.pause();

  if (key === '1') {
    await uploadToWorkers();
  } else if (key === '2') {
    await deployAsPages();
  } else if (key === '\u0003') {
    process.exit(0);
  }

  console.log('\n✅ Done! Next steps:');
  console.log('1. Test: https://audio.vocaband.com/motivational/great-job.mp3');
  console.log('2. Update your .env.local with the correct URL');

  process.exit(0);
});
