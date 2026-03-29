import fs from 'fs';
import https from 'https';

const vocabPath = 'src/vocabulary.ts';
const outputDir = 'C:/Users/Waseem/Downloads/Vocaband/vocabulary-audio-all-fixed';

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const content = fs.readFileSync(vocabPath, 'utf-8');

// Find all words that were fixed (have " or " or "something" or "somebody")
const fixedWords = [];
const wordRegex = /\{\s*id:\s*(\d+),\s*english:\s*"([^"]+)",\s*hebrew:\s*"([^"]+)",\s*arabic:\s*"([^"]+)"/g;
let match;

while ((match = wordRegex.exec(content)) !== null) {
  const [, id, english, hebrew, arabic] = match;
  
  // Find words with our fixes
  if (english.includes(' or ') || english.includes('something') || english.includes('somebody') || english.includes('et cetera')) {
    fixedWords.push({
      id: parseInt(id),
      english: english,
      filename: `${id}.mp3`
    });
  }
}

console.log(`\n🎵 Found ${fixedWords.length} fixed words to regenerate\n`);

function downloadTTS(text, filename) {
  return new Promise((resolve, reject) => {
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&q=${encodeURIComponent(text)}&tl=en`;
    const file = fs.createWriteStream(filename);

    https.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      } else {
        fs.unlink(filename, () => {});
        reject(new Error(`HTTP ${response.statusCode}`));
      }
    }).on('error', (err) => {
      fs.unlink(filename, () => {});
      reject(err);
    });
  });
}

async function regenerateAll() {
  console.log('🚀 Starting regeneration...\n');
  console.log('⏱️  This will take several minutes...\n');

  let success = 0;
  let failed = 0;

  for (let i = 0; i < fixedWords.length; i++) {
    const word = fixedWords[i];
    const filename = `${outputDir}/${word.filename}`;

    process.stdout.write(`\r[${i + 1}/${fixedWords.length}] ${word.english.substring(0, 35)}... `);

    try {
      await downloadTTS(word.english, filename);
      success++;
      process.stdout.write('✓\n');
    } catch (error) {
      failed++;
      process.stdout.write(`✗\n`);
    }

    await new Promise(r => setTimeout(r, 500));
  }

  console.log('\n' + '='.repeat(60));
  console.log('REGENERATION COMPLETE');
  console.log('='.repeat(60));
  console.log(`✓ Success: ${success}`);
  console.log(`✗ Failed: ${failed}`);
  console.log(`\n📁 Files saved to: ${outputDir}`);
  console.log('='.repeat(60));

  if (success > 0) {
    console.log('\n🎯 These files now have natural audio!');
    console.log('\nNext: Decide where to upload them');
    console.log('1. Supabase (replace old versions)');
    console.log('2. Cloudflare (new location)');
  }
}

regenerateAll().catch(console.error);
