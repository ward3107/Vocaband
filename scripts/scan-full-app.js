import fs from 'fs';
import path from 'path';

function getAllFiles(dir, extension, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.includes('node_modules') && !file.startsWith('.')) {
      getAllFiles(filePath, extension, fileList);
    } else if (file.endsWith(extension)) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

const issues = {
  timing: [],
  rtl: [],
  audio: [],
  animation: [],
  speech: []
};

console.log('🔍 Scanning ENTIRE app for issues...\n');

// Find all TSX files
const files = getAllFiles('src', '.tsx');

console.log(`📁 Found ${files.length} files to check\n`);

files.forEach(file => {
  try {
    const content = fs.readFileSync(file, 'utf-8');
    const relativePath = path.relative('src', file);

    // 1. Check for slow speech rate
    if (content.includes('rate = 0.85') || content.includes('rate=0.85')) {
      issues.speech.push({
        file: relativePath,
        issue: 'Speech rate is 0.85 (too slow)',
        recommendation: 'Change to 0.9-0.95'
      });
    }

    // 2. Check for very short delays
    const veryShortDelays = content.match(/setTimeout\s*\([^)]*,\s*[12]\d{2}\)/g);
    if (veryShortDelays && veryShortDelays.length > 0) {
      issues.timing.push({
        file: relativePath,
        issue: 'Has 100-200ms delays (too fast for speech)',
        count: veryShortDelays.length
      });
    }

    // 3. Check for isRTL without text-right/text-left
    if (content.includes('isRTL') && !content.includes('text-right') && !content.includes('text-left')) {
      issues.rtl.push({
        file: relativePath,
        issue: 'Uses isRTL but no explicit text alignment',
        recommendation: 'Add className={isRTL ? "text-right" : "text-left"}'
      });
    }

    // 4. Check for very fast animations
    const veryFastAnim = content.match(/duration-?\{[^}]*1[01][05][^}]*\}/g);
    if (veryFastAnim && veryFastAnim.length > 3) {
      issues.animation.push({
        file: relativePath,
        issue: 'Has 100-150ms animations (very fast)',
        count: veryFastAnim.length
      });
    }

    // 5. Check for speech synthesis without rate
    if (content.includes('speechSynthesis') && !content.includes('utterance.rate')) {
      issues.audio.push({
        file: relativePath,
        issue: 'Uses speechSynthesis without setting rate',
        recommendation: 'Add utterance.rate = 0.9 for better speed'
      });
    }
  } catch (error) {
    // Skip files that can't be read
  }
});

// Print results
console.log('='.repeat(70));
console.log('SCAN RESULTS - ENTIRE APP');
console.log('='.repeat(70));

if (issues.speech.length > 0) {
  console.log(`\n🗣️  SPEECH ISSUES (${issues.speech.length}):`);
  issues.speech.forEach((issue, i) => {
    if (i < 5) {
      console.log(`  ${i + 1}. ${issue.file}`);
      console.log(`     ❌ ${issue.issue}`);
      console.log(`     💡 ${issue.recommendation}`);
    }
  });
  if (issues.speech.length > 5) {
    console.log(`  ... and ${issues.speech.length - 5} more files`);
  }
}

if (issues.audio.length > 0) {
  console.log(`\n🎵 AUDIO ISSUES (${issues.audio.length}):`);
  issues.audio.forEach((issue, i) => {
    if (i < 5) {
      console.log(`  ${i + 1}. ${issue.file}`);
      console.log(`     ❌ ${issue.issue}`);
      console.log(`     💡 ${issue.recommendation}`);
    }
  });
  if (issues.audio.length > 5) {
    console.log(`  ... and ${issues.audio.length - 5} more files`);
  }
}

if (issues.timing.length > 0) {
  console.log(`\n⏱️  TIMING ISSUES (${issues.timing.length}):`);
  const uniqueFiles = [...new Set(issues.timing.map(i => i.file))];
  uniqueFiles.forEach((file, i) => {
    const count = issues.timing.filter(i => i.file === file).reduce((sum, i) => sum + i.count, 0);
    console.log(`  ${i + 1}. ${file}: ${count} very short delays`);
  });
}

if (issues.rtl.length > 0) {
  console.log(`\n↔️  RTL ISSUES (${issues.rtl.length}):`);
  issues.rtl.forEach((issue, i) => {
    if (i < 5) {
      console.log(`  ${i + 1}. ${issue.file}`);
      console.log(`     ❌ ${issue.issue}`);
      console.log(`     💡 ${issue.recommendation}`);
    }
  });
  if (issues.rtl.length > 5) {
    console.log(`  ... and ${issues.rtl.length - 5} more files`);
  }
}

if (issues.animation.length > 0) {
  console.log(`\n🎬 ANIMATION ISSUES (${issues.animation.length}):`);
  const uniqueFiles = [...new Set(issues.animation.map(i => i.file))];
  uniqueFiles.forEach((file, i) => {
    const count = issues.animation.filter(i => i.file === file).reduce((sum, i) => sum + i.count, 0);
    console.log(`  ${i + 1}. ${file}: ${count} very fast animations`);
  });
}

const totalIssues = issues.speech.length + issues.audio.length + issues.timing.length + issues.rtl.length + issues.animation.length;

console.log('\n' + '='.repeat(70));
console.log(`SUMMARY: Scanned ${files.length} files, found ${totalIssues} issues`);
console.log('='.repeat(70));

if (totalIssues === 0) {
  console.log('\n✅ Your app looks good! No major issues found.');
} else {
  console.log('\n💡 These issues affect user experience.');
  console.log('   Should I create automated fixes?');
}
