/**
 * Script to list all motivational audio files in Supabase storage
 * and identify Hebrew/Arabic files for deletion
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Missing Supabase credentials');
  console.error('Please ensure VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// List all files in the motivational bucket
const listMotivationalFiles = async () => {
  console.log('📋 Listing all files in motivational bucket...\n');

  const { data, error } = await supabase
    .storage
    .from('motivational')
    .list();

  if (error) {
    console.error('❌ Error listing files:', error);
    return [];
  }

  const files = data || [];
  console.log(`Found ${files.length} files:\n`);

  // Categorize files by language/pattern
  const englishFiles = [];
  const hebrewFiles = [];
  const arabicFiles = [];
  const otherFiles = [];

  files.forEach((file) => {
    const name = file.name;

    // Check for Hebrew characters (Unicode range)
    const hasHebrew = /[\u0590-\u05FF]/.test(name);

    // Check for Arabic characters (Unicode range)
    const hasArabic = /[\u0600-\u06FF]/.test(name);

    if (hasHebrew) {
      hebrewFiles.push(name);
    } else if (hasArabic) {
      arabicFiles.push(name);
    } else if (name.endsWith('.mp3')) {
      englishFiles.push(name);
    } else {
      otherFiles.push(name);
    }
  });

  console.log('🇬🇧 English Files:');
  if (englishFiles.length > 0) {
    englishFiles.forEach(f => console.log(`  ✓ ${f}`));
  } else {
    console.log('  (none)');
  }
  console.log(`  Total: ${englishFiles.length}\n`);

  console.log('🇮🇱 Hebrew Files:');
  if (hebrewFiles.length > 0) {
    hebrewFiles.forEach(f => console.log(`  ⚠️  ${f} [HEBREW CHARACTERS DETECTED]`));
  } else {
    console.log('  (none)');
  }
  console.log(`  Total: ${hebrewFiles.length}\n`);

  console.log('🇸🇦 Arabic Files:');
  if (arabicFiles.length > 0) {
    arabicFiles.forEach(f => console.log(`  ⚠️  ${f} [ARABIC CHARACTERS DETECTED]`));
  } else {
    console.log('  (none)');
  }
  console.log(`  Total: ${arabicFiles.length}\n`);

  if (otherFiles.length > 0) {
    console.log('📁 Other Files:');
    otherFiles.forEach(f => console.log(`  - ${f}`));
    console.log(`  Total: ${otherFiles.length}\n`);
  }

  return {
    englishFiles,
    hebrewFiles,
    arabicFiles,
    otherFiles,
    allFiles: files
  };
};

// Delete specific files
const deleteFiles = async (filesToDelete) => {
  if (filesToDelete.length === 0) {
    console.log('No files to delete.');
    return;
  }

  console.log(`\n🗑️  Deleting ${filesToDelete.length} files...\n`);

  let success = 0;
  let failed = 0;
  const failedFiles = [];

  for (const file of filesToDelete) {
    const { error } = await supabase
      .storage
      .from('motivational')
      .remove([file]);

    if (error) {
      console.error(`❌ Failed to delete ${file}:`, error.message);
      failed++;
      failedFiles.push(file);
    } else {
      console.log(`  ✓ Deleted: ${file}`);
      success++;
    }
  }

  console.log(`\n✅ Deletion complete!`);
  console.log(`   ✓ Success: ${success}`);
  console.log(`   ✗ Failed: ${failed}`);
  if (failedFiles.length > 0) {
    console.log(`   Failed files: ${failedFiles.join(', ')}`);
  }
};

// Main execution
const run = async () => {
  const args = process.argv.slice(2);
  const deleteMode = args.includes('--delete');
  const deleteAllMode = args.includes('--delete-all');

  const { hebrewFiles, arabicFiles, englishFiles, allFiles } = await listMotivationalFiles();

  let toDelete = [];
  let deleteDescription = '';

  if (deleteAllMode) {
    toDelete = allFiles.map(f => f.name);
    deleteDescription = 'ALL files';
  } else {
    toDelete = [...hebrewFiles, ...arabicFiles];
    deleteDescription = 'Hebrew and Arabic files';
  }

  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  if (deleteAllMode) {
    console.log(`⚠️  DELETE ALL MODE: Will remove ALL files!`);
    console.log(`Total files to remove: ${toDelete.length}`);
  } else {
    console.log(`English files to keep: ${toDelete.length === 0 ? 'All' : englishFiles.length}`);
    console.log(`Hebrew files found: ${hebrewFiles.length}`);
    console.log(`Arabic files found: ${arabicFiles.length}`);
    console.log(`Total files to remove: ${toDelete.length}`);
  }
  console.log('='.repeat(60));

  if (deleteMode || deleteAllMode) {
    if (toDelete.length === 0) {
      console.log('\n✅ No files to delete!');
    } else {
      console.log(`\n⚠️  WARNING: About to delete ${toDelete.length} ${deleteDescription}!`);
      await deleteFiles(toDelete);
    }
  } else {
    if (toDelete.length > 0) {
      if (deleteAllMode) {
        console.log(`\n🚀 To DELETE ALL FILES, run: node scripts/manage-motivational.js --delete-all`);
      } else {
        console.log(`\n🚀 To DELETE Hebrew/Arabic files, run: node scripts/manage-motivational.js --delete`);
      }
      console.log(`\n🚀 To DELETE ALL FILES, run: node scripts/manage-motivational.js --delete --delete-all`);
    } else {
      console.log('\n✅ No files to delete!');
    }
  }
};

run().catch(console.error);
