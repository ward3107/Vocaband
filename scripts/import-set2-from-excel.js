/**
 * Import Set 2 Vocabulary from Excel
 *
 * Reads "C:\Users\Waseem\Downloads\set 3.xlsx" and converts to TypeScript format
 * Then updates vocabulary.ts with the new Set 2 words
 *
 * Usage:
 *   node scripts/import-set2-from-excel.js
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
console.log('║   Import Set 2 Vocabulary from Excel                 ║');
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

// Show sample of data
console.log('Sample data from Excel:');
console.table(jsonData.slice(0, 5));
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
  const set2Words = [];
  let startId = 5157; // Start ID for Set 2 (after Set 1 ends at 5156)

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

  // Show sample
  console.log('Sample Set 2 words:');
  console.table(set2Words.slice(0, 5));
  console.log('');

  // Save to separate file for review
  const outputFile = path.join(__dirname, '../src/data/set2-imported.ts');
  const wordsCode = set2Words.map(w =>
    `  { id: ${w.id}, english: "${escapeForTs(w.english)}", hebrew: "${escapeForTs(w.hebrew)}", arabic: "${escapeForTs(w.arabic)}", level: "Set 2" }`
  ).join(',\n');

  const tsContent = `// Set 2 Imported from Excel (${set2Words.length} words)
// IDs: ${set2Words[0].id} to ${set2Words[set2Words.length-1].id}

export const SET_2_IMPORTED = [
${wordsCode}
];
`;

  fs.writeFileSync(outputFile, tsContent, 'utf-8');
  console.log(`✓ Saved Set 2 words to: src/data/set2-imported.ts`);
  console.log('');

  // Now update vocabulary.ts
  console.log('📝 Updating vocabulary.ts with Set 2 words...');
  updateVocabularyWithSet2(set2Words);

  console.log('');
  console.log('✅ Import complete!');
  console.log('');
  console.log('📝 Summary:');
  console.log(`  - Imported ${set2Words.length} words from Set 2 Excel`);
  console.log(`  - IDs assigned: ${set2Words[0].id} to ${set2Words[set2Words.length-1].id}`);
  console.log(`  - Updated SET_2_WORDS array in vocabulary.ts`);
}

function escapeForTs(str) {
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r');
}

function updateVocabularyWithSet2(set2Words) {
  // Read current vocabulary.ts
  const currentContent = fs.readFileSync(VOCAB_FILE, 'utf-8');

  // Check if SET_2_WORDS exists and is empty
  if (currentContent.includes('SET_2_WORDS: Word[] = []')) {
    // Replace empty array with actual words
    const wordsCode = set2Words.map(w =>
      `  { id: ${w.id}, english: "${escapeForTs(w.english)}", hebrew: "${escapeForTs(w.hebrew)}", arabic: "${escapeForTs(w.arabic)}", level: "Set 2" }`
    ).join(',\n');

    const newSet2Section = `export const SET_2_WORDS: Word[] = [\n${wordsCode}\n];`;

    const updatedContent = currentContent.replace(
      /export const SET_2_WORDS: Word\[\] = \[\];/,
      newSet2Section
    );

    // Backup original
    const backupFile = VOCAB_FILE + '.backup';
    fs.writeFileSync(backupFile, currentContent, 'utf-8');
    console.log(`  ✓ Backup saved to: vocabulary.ts.backup`);

    // Write updated content
    fs.writeFileSync(VOCAB_FILE, updatedContent, 'utf-8');
    console.log(`  ✓ Updated SET_2_WORDS in vocabulary.ts`);
  } else if (currentContent.includes('SET_2_WORDS')) {
    console.log('  ⚠️  SET_2_WORDS already exists and is not empty!');
    console.log('     Please review before replacing.');
  } else {
    console.log('  ❌ Could not find SET_2_WORDS in vocabulary.ts');
  }
}
