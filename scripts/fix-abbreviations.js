import fs from 'fs';

const vocabPath = 'src/vocabulary.ts';
const content = fs.readFileSync(vocabPath, 'utf-8');

let fixCount = 0;

// Fix all abbreviations
const abbreviations = [
  { from: /\bsth\b/g, to: 'something', desc: 'sth → something' },
  { from: /\bsb\b/g, to: 'somebody', desc: 'sb → somebody' },
  { from: /\setc\.\b/g, to: 'et cetera', desc: 'etc. → et cetera' },
  { from: /\betc\b/g, to: 'et cetera', desc: 'etc → et cetera' },
  { from: /\bsths\b/g, to: 'things', desc: 'sths → things' },
  { from: /\bsbs\b/g, to: 'people', desc: 'sbs → people' },
];

let fixed = content;

abbreviations.forEach(({ from, to, desc }) => {
  const matches = fixed.match(from);
  if (matches) {
    const count = matches.length;
    fixed = fixed.replace(from, to);
    fixCount += count;
    console.log(`✓ ${desc}: ${count} replacements`);
  }
});

fs.writeFileSync(vocabPath, fixed, 'utf-8');

console.log(`\n${'='.repeat(60)}`);
console.log(`✅ Fixed ${fixCount} abbreviations total!`);
console.log('='.repeat(60));

console.log('\nExamples:');
console.log('  "be crazy about sb" → "be crazy about somebody"');
console.log('  "a variety of sth" → "a variety of something"');
console.log('  "etc." → "et cetera"');

console.log(`\n✓ Changes saved to: ${vocabPath}`);
