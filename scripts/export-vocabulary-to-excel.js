/**
 * Vocaband Vocabulary to Excel Converter
 *
 * Converts vocabulary from TypeScript format to Excel/CSV
 * Each language in a separate column for easy editing
 *
 * Usage:
 *   node scripts/export-vocabulary-to-excel.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INPUT_FILE = path.join(__dirname, '../src/data/vocabulary.ts');
const OUTPUT_DIR = path.join(__dirname, '../exports');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function parseVocabularyFile() {
  const content = fs.readFileSync(INPUT_FILE, 'utf-8');
  const words = [];

  // Match each word object line by line
  const lines = content.split('\n');
  const wordObjectRegex = /\{\s*id:\s*(\d+),\s*english:\s*"([^"]*?)",\s*hebrew:\s*"([^"]*?)",\s*arabic:\s*"([^"]*?)"/;

  for (const line of lines) {
    const match = line.match(wordObjectRegex);
    if (match) {
      const id = parseInt(match[1]);
      const english = match[2].replace(/\\'/g, "'").replace(/\\"/g, '"');
      const hebrew = match[3].replace(/\\'/g, "'").replace(/\\"/g, '"');
      const arabic = match[4].replace(/\\'/g, "'").replace(/\\"/g, '"');

      words.push({ ID: id, English: english, Hebrew: hebrew, Arabic: arabic });
    }
  }

  return words;
}

function createTSV(words) {
  let tsv = 'ID\tEnglish\tHebrew\tArabic\n';
  for (const word of words) {
    const escape = (s) => s.replace(/\t/g, ' ').replace(/\n/g, ' ');
    tsv += `${word.ID}\t${escape(word.English)}\t${escape(word.Hebrew)}\t${escape(word.Arabic)}\n`;
  }
  return tsv;
}

function createCSV(words) {
  let csv = 'ID,English,Hebrew,Arabic\n';
  for (const word of words) {
    const escape = (s) => `"${s.replace(/"/g, '""')}"`;
    csv += `${word.ID},${escape(word.English)},${escape(word.Hebrew)},${escape(word.Arabic)}\n`;
  }
  return csv;
}

console.log('📖 Reading vocabulary.ts...');
const words = parseVocabularyFile();
console.log(`✓ Found ${words.length} words\n`);

const tsv = createTSV(words);
fs.writeFileSync(path.join(OUTPUT_DIR, 'vocabulary.tsv'), tsv, 'utf-8');
console.log('✓ Saved: exports/vocabulary.tsv (paste into Excel)');

const csv = createCSV(words);
fs.writeFileSync(path.join(OUTPUT_DIR, 'vocabulary.csv'), csv, 'utf-8');
console.log('✓ Saved: exports/vocabulary.csv (Excel CSV format)');

console.log('\n💡 Tip: Open vocabulary.tsv in Notepad, Ctrl+A to copy all, paste into Excel cell - columns will auto-separate!');
