/**
 * Generate 64 motivational audio files using free TTS
 * Run: node scripts/generate-audio-files.js
 */

import https from 'https';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PHRASES = [
  "great-job","well-done","awesome","keep-it-up","nailed-it","brilliant",
  "youre-on-fire","fantastic","way-to-go","superstar","amazing","perfect",
  "excellent","outstanding","incredible","wonderful","spectacular","terrific",
  "superb","magnificent","you-got-it","thats-right","correct","spot-on",
  "exactly-right","you-rock","keep-going","dont-stop","youre-amazing",
  "good-thinking","nice-work","good-work","you-did-it","first-try","like-a-pro",
  "you-are-a-champion","unstoppable","on-point","crushing-it","legend","genius",
  "word-master","vocab-hero","language-champion","english-star","you-smashed-it",
  "top-of-the-class","gold-star","level-up","new-high-score","on-a-roll",
  "nothing-can-stop-you","brain-power","quick-learner","smart-cookie",
  "proud-of-you","hard-work-pays-off","knowledge-is-power","english-unlocked",
  "new-word-learned","one-step-closer","making-progress","never-give-up",
  "you-can-do-it","full-marks","ten-out-of-ten","flawless","exceptional",
  "elite","top-tier","first-class","wow","unbelievable","mic-drop","pure-talent"
];

function phraseToText(phrase) {
  return phrase.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// Create output directory
const outputDir = 'C:\\Users\\Waseem\\Downloads\\Vocaband\\motivational-audio';
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
  console.log(`✓ Created directory: ${outputDir}`);
}

// Download using Google TTS (free, no API key needed)
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
        fs.unlink(filename, () => {}); // Delete failed file
        reject(new Error(`HTTP ${response.statusCode}`));
      }
    }).on('error', (err) => {
      fs.unlink(filename, () => {}); // Delete failed file
      reject(err);
    });
  });
}

async function generateAll() {
  console.log(`\n🎵 Generating ${PHRASES.length} motivational audio files...\n`);

  let success = 0;
  let failed = 0;

  for (let i = 0; i < PHRASES.length; i++) {
    const phrase = PHRASES[i];
    const text = phraseToText(phrase);
    const filename = `${outputDir}/${phrase}.mp3`;

    process.stdout.write(`\r[${i + 1}/${PHRASES.length}] ${text}... `);

    try {
      await downloadTTS(text, filename);
      success++;
      process.stdout.write('✓\n');
    } catch (error) {
      failed++;
      process.stdout.write(`✗ (${error.message})\n`);
    }

    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`✓ Success: ${success}`);
  console.log(`✗ Failed: ${failed}`);
  console.log(`\n📁 Files saved to: ${outputDir}`);
  console.log('='.repeat(60));

  if (success > 0) {
    console.log('\n🚀 Next steps:');
    console.log('1. Check the audio files play correctly');
    console.log('2. Upload them to Cloudflare Workers/Pages');
    console.log('3. Update your .env.local with the Cloudflare URL');
  }
}

// Alternative: Use browser-based generation
function createHTMLGenerator() {
  const html = `<!DOCTYPE html>
<html>
<head><title>Generate Audio</title></head>
<body>
<h1>Click each phrase to download audio</h1>
${PHRASES.map(p => {
  const text = phraseToText(p);
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&q=${encodeURIComponent(text)}&tl=en`;
  return `<a href="${url}" download="${p}.mp3" style="display:block;margin:5px;padding:10px;background:#f0f0f0;">${text}</a>`;
}).join('')}
</body>
</html>`;

  fs.writeFileSync(`${outputDir}/download.html`, html);
  console.log(`\n💡 Also created: ${outputDir}/download.html`);
  console.log('   Open this file in your browser and click each link to download.');
}

console.log('🎵 Motivational Audio Generator\n');
console.log('Choose a method:');
console.log('1. Automatic download (may have rate limiting)');
console.log('2. Manual download via HTML page\n');

process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.setEncoding('utf8');

process.stdin.on('data', async (key) => {
  if (key === '1') {
    process.stdin.pause();
    await generateAll();
  } else if (key === '2') {
    process.stdin.pause();
    createHTMLGenerator();
  } else if (key === '\u0003') { // Ctrl+C
    process.exit();
  }
  process.exit(0);
});

console.log('Press 1 or 2 (or Ctrl+C to exit)...');
