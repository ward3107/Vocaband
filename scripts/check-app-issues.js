import fs from 'fs';

const issues = {
  timing: [],
  rtl: [],
  audio: [],
  translation: [],
  animation: []
};

console.log('🔍 Scanning for common issues...\n');

// Check App.tsx
const appContent = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. Speech rate issue
if (appContent.includes('rate = 0.85')) {
  issues.audio.push({
    file: 'App.tsx',
    line: '1607',
    issue: 'Speech rate is 0.85 (too slow)',
    recommendation: 'Change to 0.9-0.95 for more natural speech'
  });
}

// 2. Multiple hardcoded delays (200-400ms might be too fast)
const shortDelays = appContent.match(/setTimeout.*?[234]\d{2}/g);
if (shortDelays && shortDelays.length > 5) {
  issues.timing.push({
    file: 'App.tsx',
    issue: 'Many hardcoded 200-400ms delays might be too fast for speech completion',
    count: shortDelays.length,
    recommendation: 'Consider using 500-600ms for better pacing'
  });
}

// 3. Check DemoMode for RTL
const demoContent = fs.readFileSync('src/components/DemoMode.tsx', 'utf-8');

// Check for proper RTL handling
if (demoContent.includes('isRTL') && !demoContent.includes('text-right')) {
  issues.rtl.push({
    file: 'DemoMode.tsx',
    issue: 'RTL languages might not have explicit text alignment',
    recommendation: 'Add className={isRTL ? "text-right" : "text-left"} to Hebrew/Arabic text'
  });
}

// 4. Check for fast animations
const fastAnimations = demoContent.match(/duration-?\{[^}]*1[05][0-9][^}]*\}/g);
if (fastAnimations) {
  issues.animation.push({
    file: 'DemoMode.tsx',
    issue: 'Some animations are 100-150ms (very fast)',
    count: fastAnimations.length,
    recommendation: 'Consider 200-300ms for smoother animations'
  });
}

// Print results
console.log('='.repeat(70));
console.log('ISSUES FOUND');
console.log('='.repeat(70));

if (issues.audio.length > 0) {
  console.log(`\n🎵 AUDIO ISSUES (${issues.audio.length}):`);
  issues.audio.forEach((issue, i) => {
    console.log(`  ${i + 1}. ${issue.file}:${issue.line}`);
    console.log(`     ❌ ${issue.issue}`);
    console.log(`     💡 ${issue.recommendation}`);
  });
}

if (issues.timing.length > 0) {
  console.log(`\n⏱️  TIMING ISSUES (${issues.timing.length}):`);
  issues.timing.forEach((issue, i) => {
    console.log(`  ${i + 1}. ${issue.file}`);
    console.log(`     ❌ ${issue.issue}`);
    console.log(`     💡 ${issue.recommendation}`);
  });
}

if (issues.rtl.length > 0) {
  console.log(`\n↔️  RTL ISSUES (${issues.rtl.length}):`);
  issues.rtl.forEach((issue, i) => {
    console.log(`  ${i + 1}. ${issue.file}`);
    console.log(`     ❌ ${issue.issue}`);
    console.log(`     💡 ${issue.recommendation}`);
  });
}

if (issues.animation.length > 0) {
  console.log(`\n🎬 ANIMATION ISSUES (${issues.animation.length}):`);
  issues.animation.forEach((issue, i) => {
    console.log(`  ${i + 1}. ${issue.file}`);
    console.log(`     ❌ ${issue.issue}`);
    console.log(`     💡 ${issue.recommendation}`);
  });
}

const totalIssues = issues.audio.length + issues.timing.length + issues.rtl.length + issues.animation.length;

console.log('\n' + '='.repeat(70));
console.log(`SUMMARY: Found ${totalIssues} issues that can be fixed`);
console.log('='.repeat(70));

if (totalIssues === 0) {
  console.log('\n✅ No major issues found!');
} else {
  console.log('\n💡 Would you like me to fix these issues?');
  console.log('   I can create automated fixes for all of them.');
}
