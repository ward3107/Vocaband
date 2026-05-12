/*
 * build.mjs — generates the 15 teacher / parent / student PDFs.
 *
 *   node scripts/teacher-pdfs/build.mjs           # build everything
 *   node scripts/teacher-pdfs/build.mjs --en      # English only
 *   node scripts/teacher-pdfs/build.mjs --he --ar # HE + AR
 *   node scripts/teacher-pdfs/build.mjs --doc=teacher-guide
 *
 * Output goes to public/docs/<key>-<lang>.pdf, ready to be served as
 * static files from Cloudflare. The same path is wired into the
 * footer + the in-app Resources section.
 *
 * Why we use Playwright/Chromium rather than jsPDF:
 *   - Real Heebo + Cairo + Inter web fonts (Hebrew/Arabic shaping).
 *   - CSS grid + flex + gradients render natively.
 *   - We already use the same pattern for the school-pitch deck in
 *     scripts/presentation-pdf/build.mjs.
 */

// Match the existing scripts/presentation-pdf/build.mjs import shape
// so this script runs in the same dev container.  If playwright is
// installed locally as a node module, swap to `'playwright'`.
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises';

import { render } from './render.mjs';
import { teacherGuide } from './content/teacher-guide.mjs';
import { quickStart } from './content/quick-start.mjs';
import { studentGuide } from './content/student-guide.mjs';
import { parentLetter } from './content/parent-letter.mjs';
import { privacySheet } from './content/privacy-sheet.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..', '..');
const outDir = path.join(root, 'public', 'docs');

const ALL_DOCS = [teacherGuide, quickStart, studentGuide, parentLetter, privacySheet];
const ALL_LANGS = ['en', 'he', 'ar', 'ru'];

function parseArgs(argv) {
  const flags = { langs: new Set(), docs: new Set() };
  for (const a of argv.slice(2)) {
    if (a === '--en') flags.langs.add('en');
    else if (a === '--he') flags.langs.add('he');
    else if (a === '--ar') flags.langs.add('ar');
    else if (a === '--ru') flags.langs.add('ru');
    else if (a.startsWith('--doc=')) flags.docs.add(a.slice('--doc='.length));
  }
  if (flags.langs.size === 0) ALL_LANGS.forEach((l) => flags.langs.add(l));
  if (flags.docs.size === 0) ALL_DOCS.forEach((d) => flags.docs.add(d.key));
  return flags;
}

async function main() {
  const { langs, docs } = parseArgs(process.argv);

  await fs.mkdir(outDir, { recursive: true });
  const css = await fs.readFile(path.join(__dirname, 'styles.css'), 'utf-8');

  const browser = await chromium.launch();
  const ctx = await browser.newContext();

  const jobs = [];
  for (const d of ALL_DOCS) {
    if (!docs.has(d.key)) continue;
    for (const lang of ALL_LANGS) {
      if (!langs.has(lang)) continue;
      jobs.push({ doc: d, lang });
    }
  }

  console.log(`Building ${jobs.length} PDF(s) → ${path.relative(root, outDir)}/`);

  for (const { doc, lang } of jobs) {
    const html = render(doc[lang], lang, css);
    const page = await ctx.newPage();
    await page.setContent(html, { waitUntil: 'networkidle', timeout: 60000 });
    await page.evaluate(() => document.fonts.ready);
    const outPath = path.join(outDir, `${doc.key}-${lang}.pdf`);
    await page.pdf({
      path: outPath,
      format: 'A4',
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      preferCSSPageSize: true,
    });
    const size = ((await fs.stat(outPath)).size / 1024).toFixed(0);
    console.log(`  ✓ ${path.basename(outPath)} (${size} KB)`);
    await page.close();
  }

  await browser.close();
  console.log(`\nDone — ${jobs.length} file(s) in ${path.relative(root, outDir)}/`);
}

main().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
