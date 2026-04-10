/**
 * Re-import Set 2 Vocabulary from LexicalBand2.xlsx
 *
 * Reads "C:\Users\Waseem\Downloads\LexicalBand2.xlsx" (both sheets)
 * and replaces the current SET_2_WORDS in vocabulary.ts
 *
 * Usage:
 *   node scripts/reimport-set2-correct.js
 */

import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXCEL_FILE = 'C:\\Users\\Waseem\\Downloads\\LexicalBand2.xlsx';
const VOCAB_FILE = path.join(__dirname, '../src/data/vocabulary.ts');

console.log('╔════════════════════════════════════════════════╗');
console.log('║   Re-import Set 2 from LexicalBand2.xlsx             ║');
console.log('╚════════════════════════════════════════════════╝');
console.log('');

// Read Excel file
console.log('📖 Reading LexicalBand2.xlsx...');
let workbook;
try {
  workbook = xlsx.readFile(EXCEL_FILE);
} catch (error) {
  console.error(`❌ Failed to read Excel file: ${error.message}`);
  process.exit(1);
}

console.log(`✓ Found sheets: ${workbook.SheetNames.join(', ')}`);
console.log('');

const allSet2Words = [];
let startId = 5157; // Start ID for Set 2 (after Set 1 ends at 5156)

// Process each sheet
for (const sheetName of workbook.SheetNames) {
  console.log(`📋 Processing sheet: ${sheetName}`);
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = xlsx.utils.sheet_to_json(worksheet);

  console.log(`  Found ${jsonData.length} rows`);

  // Find English column
  const columns = Object.keys(jsonData[0] || {});
  const englishCol = columns.find(c =>
    c.toLowerCase().includes('english') ||
    c.toLowerCase().includes('word') ||
    c.toLowerCase().includes('band')
  ) || columns[0];

  const hebrewCol = columns.find(c => c.toLowerCase().includes('hebrew')) || columns[1];
  const arabicCol = columns.find(c => c.toLowerCase().includes('arabic')) || columns[2];

  console.log(`  Columns: ${columns.slice(0, 4).join(', ')}`);

  // Convert to Word format
  for (let i = 0; i < jsonData.length; i++) {
    const row = jsonData[i];
    const english = row[englishCol];
    const hebrew = row[hebrewCol];
    const arabic = row[arabicCol];

    // Skip empty rows and headers
    if (!english || english.trim() === '' || english === 'undefined') {
      continue;
    }

    // Skip obvious header rows
    const engStr = String(english).trim().toLowerCase();
    if (engStr === 'english' || engStr === 'word' || engStr.includes('band')) {
      continue;
    }

    allSet2Words.push({
      id: startId++,
      english: String(english).trim(),
      hebrew: String(hebrew || '').trim(),
      arabic: String(arabic || '').trim(),
      level: 'Set 2'
    });
  }

  console.log(`  ✓ Processed ${allSet2Words.length} words so far`);
  console.log('');
}

console.log(`✓ Total Set 2 words: ${allSet2Words.length}`);
console.log('');

if (allSet2Words.length > 0) {
  // Show sample
  console.log('Sample Set 2 words:');
  console.table(allSet2Words.slice(0, 5));
  console.log('');

  // Update vocabulary.ts
  console.log('📝 Updating vocabulary.ts with Set 2 words...');
  updateSet2Words(allSet2Words);

  console.log('');
  console.log('✅ Import complete!');
  console.log('');
  console.log('📝 Summary:');
  console.log(`  - Imported ${allSet2Words.length} words from LexicalBand2.xlsx`);
  console.log(`  - IDs assigned: ${allSet2Words[0].id} to ${allSet2Words[allSet2Words.length-1].id}`);
  console.log(`  - Replaced SET_2_WORDS in vocabulary.ts`);
}

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

  const newSet2Section = `// Set 2 - ${set2Words.length} words imported from LexicalBand2.xlsx\nexport const SET_2_WORDS: Word[] = [\n${wordsCode}\n];`;

  // Replace SET_2_WORDS
  const updatedContent =
    currentContent.slice(0, set2Start) +
    newSet2Section +
    currentContent.slice(set2End + 2);

  // Backup
  const backupFile = VOCAB_FILE + '.set2.backup';
  fs.writeFileSync(backupFile, currentContent, 'utf-8');
  console.log(`  ✓ Backup saved to: vocabulary.ts.set2.backup`);

  // Write
  fs.writeFileSync(VOCAB_FILE, updatedContent, 'utf-8');
  console.log(`  ✓ Updated SET_2_WORDS in vocabulary.ts`);
}
