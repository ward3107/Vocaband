/**
 * Import Set 2 Vocabulary from set 22.xlsx
 *
 * Reads "C:\Users\Waseem\Downloads\set 22.xlsx" and converts to TypeScript format
 * Then updates vocabulary.ts with the new Set 2 words
 *
 * Usage:
 *   node scripts/import-set2-from-set22.js
 */

import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXCEL_FILE = 'C:\\Users\\Waseem\\Downloads\\set 22.xlsx';
const VOCAB_FILE = path.join(__dirname, '../src/data/vocabulary.ts');

console.log('╔════════════════════════════════════════════════╗');
console.log('║   Import Set 2 from set 22.xlsx                   ║');
console.log('╚════════════════════════════════════════════════╝');
console.log('');

// Read Excel file
console.log('📖 Reading set 22.xlsx...');
let workbook;
try {
  workbook = xlsx.readFile(EXCEL_FILE);
} catch (error) {
  console.error(`❌ Failed to read Excel file: ${error.message}`);
  process.exit(1);
}

const sheetName = workbook.SheetNames[0];
console.log(`✓ Found sheet: ${sheetName}`);

const worksheet = workbook.Sheets[sheetName];
const jsonData = xlsx.utils.sheet_to_json(worksheet);

console.log(`✓ Found ${jsonData.length} rows in Excel file`);
console.log('');

// Detect columns
const columns = Object.keys(jsonData[0]);
console.log('📋 Columns found:', columns.join(', '));
console.log('');

// Use Column1, Column2, Column3 (English, Hebrew, Arabic)
const set2Words = [];
let startId = 5157; // Start ID for Set 2 (after Set 1)

for (let i = 0; i < jsonData.length; i++) {
  const row = jsonData[i];
  const english = row.Column1;
  const hebrew = row.Column2;
  const arabic = row.Column3;

  // Skip header row and empty rows
  if (!english || english.trim() === '' || english === 'undefined' ||
      String(english).trim() === 'English' || String(english).trim() === "'English'") {
    continue;
  }

  set2Words.push({
    id: startId++,
    english: String(english).trim(),
    hebrew: String(hebrew || '').trim(),
    arabic: String(arabic || '').trim(),
    level: 'Set 2'
  });
}

console.log(`✓ Processed ${set2Words.length} valid words for Set 2`);
console.log('');

if (set2Words.length > 0) {
  console.log('Sample Set 2 words:');
  console.table(set2Words.slice(0, 5));
  console.log('');
}

// Save to separate file for review
const outputFile = path.join(__dirname, '../src/data/set2-imported.ts');
const wordsCode = set2Words.map(w =>
  `  { id: ${w.id}, english: "${escapeForTs(w.english)}", hebrew: "${escapeForTs(w.hebrew)}", arabic: "${escapeForTs(w.arabic)}", level: "Set 2" }`
).join(',\n');

const tsContent = `// Set 2 Imported from set 22.xlsx (${set2Words.length} words)
// IDs: ${set2Words[0]?.id ?? 'N/A'} to ${set2Words[set2Words.length-1]?.id ?? 'N/A'}

export const SET_2_IMPORTED = [
${wordsCode}
];
`;

fs.writeFileSync(outputFile, tsContent, 'utf-8');
console.log(`✓ Saved Set 2 words to: src/data/set2-imported.ts`);
console.log('');

// Update vocabulary.ts
console.log('📝 Updating vocabulary.ts with Set 2 words...');
updateSet2Words(set2Words);

console.log('');
console.log('✅ Import complete!');
console.log('');
console.log('📝 Summary:');
console.log(`  - Imported ${set2Words.length} words from set 22.xlsx`);
console.log(`  - IDs assigned: ${set2Words[0].id} to ${set2Words[set2Words.length-1].id}`);
console.log(`  - Replaced SET_2_WORDS in vocabulary.ts`);

function escapeForTs(str) {
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r');
}

function updateSet2Words(set2Words) {
  const currentContent = fs.readFileSync(VOCAB_FILE, 'utf-8');

  // Find SET_2_WORDS section
  const set2Start = currentContent.indexOf('export const SET_2_WORDS');
  if (set2Start === -1) {
    console.log('  ❌ Could not find SET_2_WORDS in vocabulary.ts');
    return;
  }

  // Find the end of SET_2_WORDS
  const set2End = currentContent.indexOf('];', set2Start);
  if (set2End === -1) {
    console.log('  ❌ Could not find end of SET_2_WORDS');
    return;
  }

  // Generate new SET_2_WORDS content
  const wordsCode = set2Words.map(w =>
    `  { id: ${w.id}, english: "${escapeForTs(w.english)}", hebrew: "${escapeForTs(w.hebrew)}", arabic: "${escapeForTs(w.arabic)}", level: "Set 2" }`
  ).join(',\n');

  const newSet2Section = `// Set 2 - ${set2Words.length} words imported from set 22.xlsx\nexport const SET_2_WORDS: Word[] = [\n${wordsCode}\n];`;

  // Replace SET_2_WORDS
  const updatedContent =
    currentContent.slice(0, set2Start) +
    newSet2Section +
    currentContent.slice(set2End + 2);

  // Backup
  const backupFile = VOCAB_FILE + '.before-set2-fix.backup';
  fs.writeFileSync(backupFile, currentContent, 'utf-8');
  console.log(`  ✓ Backup saved to: vocabulary.ts.before-set2-fix.backup`);

  // Write
  fs.writeFileSync(VOCAB_FILE, updatedContent, 'utf-8');
  console.log(`  ✓ Updated SET_2_WORDS in vocabulary.ts`);
}
