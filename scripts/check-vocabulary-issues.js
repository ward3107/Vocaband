/**
 * Check vocabulary for issues: slashes, special characters, etc.
 */

import fs from 'fs';

const vocabPath = 'src/vocabulary.ts';
const content = fs.readFileSync(vocabPath, 'utf-8');

const wordRegex = /\{\s*id:\s*(\d+),\s*english:\s*"([^"]+)",\s*hebrew:\s*"([^"]+)",\s*arabic:\s*"([^"]+)"/g;

const issues = { slashes: [], veryLong: [] };
const words = [];
let wordMatch;

while ((wordMatch = wordRegex.exec(content)) !== null) {
  const [, id, english, hebrew, arabic] = wordMatch;
  const word = { id: parseInt(id), english, hebrew, arabic };
  words.push(word);

  if (english.includes('/')) {
    issues.slashes.push(word);
  }

  if (english.length > 50) {
    issues.veryLong.push(word);
  }
}

console.log('\n' + '='.repeat(80));
console.log('VOCABULARY ISSUES REPORT');
console.log('='.repeat(80));
console.log(`Total words checked: ${words.length}\n`);

if (issues.slashes.length > 0) {
  console.log(`⚠️  WORDS WITH SLASHES (${issues.slashes.length}):`);
  console.log('   These will be pronounced with "slash" in audio\n');
  issues.slashes.slice(0, 20).forEach(w => {
    console.log(`   [${w.id}] "${w.english}"`);
  });
  if (issues.slashes.length > 20) {
    console.log(`\n   ... and ${issues.slashes.length - 20} more\n`);
  }
}

console.log('='.repeat(80));
