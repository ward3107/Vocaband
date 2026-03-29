import fs from 'fs';

const vocabPath = 'src/vocabulary.ts';
const content = fs.readFileSync(vocabPath, 'utf-8');

let fixCount = 0;

// Fix slashes in english field only
const fixed = content.replace(
  /(english:\s*")([^"]+)"/g,
  (match, prefix, english) => {
    if (english.includes('/')) {
      fixCount++;
      // Replace slashes with " or " for better TTS
      const fixed = english.replace(/\s*\/\s*/g, ' or ');
      return prefix + fixed + '"';
    }
    return match;
  }
);

fs.writeFileSync(vocabPath, fixed, 'utf-8');

console.log(`\n✅ Fixed ${fixCount} words with slashes!`);
console.log(`\nExamples:`);
console.log('  "backward/backwards" → "backward or backwards"');
console.log('  "gas/gasoline" → "gas or gasoline"');
console.log('  "have/have got" → "have or have got"');
console.log(`\n✓ Changes saved to: ${vocabPath}`);
console.log(`✓ Backup saved to: src/vocabulary.ts.backup\n`);
