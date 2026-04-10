/**
 * Upload fixed vocabulary audio files to Supabase
 * Run: node scripts/upload-fixed-vocabulary.js
 */

import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const audioDir = 'C:/Users/Waseem/Downloads/Vocaband/vocabulary-audio-all-fixed';

async function uploadToSupabase() {
  // Get all MP3 files
  const files = fs.readdirSync(audioDir).filter(f => f.endsWith('.mp3'));

  console.log(`\n📤 Found ${files.length} audio files to upload\n`);
  console.log('='.repeat(60));

  let success = 0;
  let failed = 0;
  const failedFiles = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const wordId = file.replace('.mp3', '');
    const filePath = `${audioDir}/${file}`;

    process.stdout.write(`\r[${i + 1}/${files.length}] Uploading ${file}... `);

    try {
      const fileBuffer = fs.readFileSync(filePath);

      const { error } = await supabase.storage
        .from('sound')
        .upload(`${wordId}.mp3`, fileBuffer, {
          upsert: true, // Replace existing files
          contentType: 'audio/mpeg'
        });

      if (error) {
        failed++;
        failedFiles.push({ file, error: error.message });
        process.stdout.write(`✗ ${error.message}\n`);
      } else {
        success++;
        process.stdout.write('✓\n');
      }
    } catch (error) {
      failed++;
      failedFiles.push({ file, error: error.message });
      process.stdout.write(`✗ ${error.message}\n`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('UPLOAD COMPLETE');
  console.log('='.repeat(60));
  console.log(`✓ Success: ${success}`);
  console.log(`✗ Failed: ${failed}`);

  if (failedFiles.length > 0) {
    console.log('\n❌ Failed files:');
    failedFiles.forEach(({ file, error }) => {
      console.log(`   ${file}: ${error}`);
    });
  }

  console.log('\n✅ Vocabulary audio updated!');
  console.log('✨ Words will now play naturally without "slash" or abbreviations!');
  console.log('='.repeat(60));
}

uploadToSupabase().catch(console.error);
