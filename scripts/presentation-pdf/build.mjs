import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..', '..');
const outDir = path.join(root, 'dist-presentation');
fs.mkdirSync(outDir, { recursive: true });

const jobs = [
  { html: 'he.html', pdf: 'Vocaband-Presentation-HE.pdf' },
  { html: 'ar.html', pdf: 'Vocaband-Presentation-AR.pdf' },
];

const browser = await chromium.launch();
const ctx = await browser.newContext();

for (const job of jobs) {
  const page = await ctx.newPage();
  const htmlPath = path.join(__dirname, job.html);
  await page.goto('file://' + htmlPath, { waitUntil: 'networkidle' });
  const outPath = path.join(outDir, job.pdf);
  await page.pdf({
    path: outPath,
    format: 'A4',
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
  });
  const size = (fs.statSync(outPath).size / 1024).toFixed(0);
  console.log(`✓ ${job.pdf} (${size} KB)`);
  await page.close();
}

await browser.close();
console.log(`\nOutput: ${outDir}`);
