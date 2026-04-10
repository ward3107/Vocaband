/**
 * Import Set 3 Vocabulary from Excel
 *
 * Reads "C:\Users\Waseem\Downloads\set 3.xlsx" and converts to TypeScript format
 * Then updates vocabulary.ts with the new Set 3 words
 *
 * Usage:
 *   node scripts/import-set3-from-excel.js
 */

import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXCEL_FILE = 'C:\\Users\\Waseem\\Downloads\\set 3.xlsx';
const VOCAB_FILE = path.join(__dirname, '../src/data/vocabulary.ts');

console.log('╔════════════════════════════════════════════════╗');
console.log('║   Import Set 3 Vocabulary from Excel                 ║');
console.log('╚════════════════════════════════════════════════╝');
console.log('');

// Read Excel file
console.log('📖 Reading set 3.xlsx...');
let workbook;
try {
  workbook = xlsx.readFile(EXCEL_FILE);
} catch (error) {
  console.error(`❌ Failed to read Excel file: ${error.message}`);
  console.log('\n💡 Make sure the file exists at: ' + EXCEL_FILE);
  process.exit(1);
}

// Get first sheet
const sheetName = workbook.SheetNames[0];
console.log(`✓ Found sheet: ${sheetName}`);

// Convert to JSON
const worksheet = workbook.Sheets[sheetName];
const jsonData = xlsx.utils.sheet_to_json(worksheet);

console.log(`✓ Found ${jsonData.length} rows in Excel file`);
console.log('');

// Detect column names
if (jsonData.length > 0) {
  const columns = Object.keys(jsonData[0]);
  console.log('📋 Columns found:', columns.join(', '));
  console.log('');

  // Find English column
  const englishCol = columns.find(c =>
    c.toLowerCase().includes('english') ||
    c.toLowerCase().includes('eng') ||
    c.toLowerCase().includes('word') ||
    c.toLowerCase().includes('מילה')
  );

  // Find Hebrew column
  const hebrewCol = columns.find(c =>
    c.toLowerCase().includes('hebrew') ||
    c.toLowerCase().includes('he') ||
    c.toLowerCase().includes('עברית')
  );

  // Find Arabic column
  const arabicCol = columns.find(c =>
    c.toLowerCase().includes('arabic') ||
    c.toLowerCase().includes('ar') ||
    c.toLowerCase().includes('عربي')
  );

  console.log(`🔍 Detected columns:`);
  console.log(`  English: ${englishCol || '❓ Not found - using column 1'}`);
  console.log(`  Hebrew:  ${hebrewCol || '❓ Not found - using column 2'}`);
  console.log(`  Arabic:  ${arabicCol || '❓ Not found - using column 3'}`);
  console.log('');

  // If columns weren't auto-detected, use first 3 columns
  const englishKey = englishCol || columns[0];
  const hebrewKey = hebrewCol || columns[1] || columns[0];
  const arabicKey = arabicCol || columns[2] || columns[0];

  // Convert to Word format
  const set3Words = [];
  let startId = 7144; // Start ID for Set 3 (after Set 2 ends at 7143)

  for (let i = 0; i < jsonData.length; i++) {
    const row = jsonData[i];
    const english = row[englishKey];
    const hebrew = row[hebrewKey];
    const arabic = row[arabicKey];

    // Skip header row (first row with column headers)
    // Skip empty rows
    if (!english || english.trim() === '' || english === 'undefined' ||
        String(english).trim() === 'English' || String(english).trim() === "'English'") {
      continue;
    }

    set3Words.push({
      id: startId++,
      english: String(english).trim(),
      hebrew: String(hebrew || '').trim(),
      arabic: String(arabic || '').trim(),
      level: 'Set 3'
    });
  }

  console.log(`✓ Processed ${set3Words.length} valid words for Set 3`);
  console.log('');

  // Show sample
  if (set3Words.length > 0) {
    console.log('Sample Set 3 words:');
    console.table(set3Words.slice(0, 5));
    console.log('');
  }

  // Save to separate file for review
  const outputFile = path.join(__dirname, '../src/data/set3-imported.ts');
  const wordsCode = set3Words.map(w =>
    `  { id: ${w.id}, english: "${escapeForTs(w.english)}", hebrew: "${escapeForTs(w.hebrew)}", arabic: "${escapeForTs(w.arabic)}", level: "Set 3" }`
  ).join(',\n');

  const tsContent = `// Set 3 Imported from Excel (${set3Words.length} words)
// IDs: ${set3Words[0]?.id ?? 'N/A'} to ${set3Words[set3Words.length-1]?.id ?? 'N/A'}

export const SET_3_IMPORTED = [
${wordsCode}
];
`;

  fs.writeFileSync(outputFile, tsContent, 'utf-8');
  console.log(`✓ Saved Set 3 words to: src/data/set3-imported.ts`);
  console.log('');

  // Now update vocabulary.ts
  console.log('📝 Updating vocabulary.ts with Set 3 words...');
  updateVocabularyWithSet3(set3Words);

  console.log('');
  console.log('✅ Import complete!');
  console.log('');
  console.log('📝 Summary:');
  console.log(`  - Imported ${set3Words.length} words from Set 3 Excel`);
  if (set3Words.length > 0) {
    console.log(`  - IDs assigned: ${set3Words[0].id} to ${set3Words[set3Words.length-1].id}`);
  }
  console.log(`  - Updated vocabulary.ts`);
}

function escapeForTs(str) {
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r');
}

function updateVocabularyWithSet3(set3Words) {
  // Read current vocabulary.ts
  const currentContent = fs.readFileSync(VOCAB_FILE, 'utf-8');

  // Check if SET_3_WORDS already exists
  if (currentContent.includes('export const SET_3_WORDS')) {
    console.log('  ⚠️  SET_3_WORDS already exists in vocabulary.ts');
    console.log('     Skipping update to avoid overwriting');
    return;
  }

  // Find the end of SET_2_WORDS by searching for the closing bracket
  const set2StartIdx = currentContent.indexOf('SET_2_WORDS');
  if (set2StartIdx === -1) {
    console.log('  ❌ Could not find SET_2_WORDS in vocabulary.ts');
    return;
  }

  // Find the closing bracket after SET_2_WORDS
  const closingBracketIdx = currentContent.indexOf('];', set2StartIdx);
  if (closingBracketIdx === -1) {
    console.log('  ❌ Could not find end of SET_2_WORDS array');
    return;
  }

  const insertPosition = closingBracketIdx + 2; // After '];' (we'll add our own newline)

  // Generate SET_3_WORDS section
  const wordsCode = set3Words.map(w =>
    `  { id: ${w.id}, english: "${escapeForTs(w.english)}", hebrew: "${escapeForTs(w.hebrew)}", arabic: "${escapeForTs(w.arabic)}", level: "Set 3" }`
  ).join(',\n');

  const set3Section = `\n// Set 3 - ${set3Words.length} words imported from Excel\nexport const SET_3_WORDS: Word[] = [\n${wordsCode}\n];\n`;

  // Insert SET_3_WORDS after SET_2_WORDS
  const updatedContent =
    currentContent.slice(0, insertPosition) +
    set3Section +
    currentContent.slice(insertPosition);

  // Backup original
  const backupFile = VOCAB_FILE + '.backup';
  fs.writeFileSync(backupFile, currentContent, 'utf-8');
  console.log(`  ✓ Backup saved to: vocabulary.ts.backup`);

  // Write updated content
  fs.writeFileSync(VOCAB_FILE, updatedContent, 'utf-8');
  console.log(`  ✓ Added SET_3_WORDS to vocabulary.ts`);

  // Update ALL_WORDS to include SET_3_WORDS
  const finalContent = fs.readFileSync(VOCAB_FILE, 'utf-8');
  const updatedAllWords = finalContent.replace(
    /(\.\.\.SET_2_WORDS\n)/,
    '$1  ...SET_3_WORDS\n'
  );
  fs.writeFileSync(VOCAB_FILE, updatedAllWords, 'utf-8');
  console.log(`  ✓ Updated ALL_WORDS to include SET_3_WORDS`);

  // Update total word count comment
  const finalContent2 = fs.readFileSync(VOCAB_FILE, 'utf-8');
  const updatedComment = finalContent2.replace(
    /\/\/ ALL VOCABULARY \([^)]+\)/,
    `// ALL VOCABULARY (${5156 + 1987 + set3Words.length} words: Set 1 + Set 2 + Set 3)`
  );
  fs.writeFileSync(VOCAB_FILE, updatedComment, 'utf-8');
  console.log(`  ✓ Updated total word count comment`);
}
