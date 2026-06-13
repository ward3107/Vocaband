import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const OUT = '/home/user/Vocaband/docs/mockups/shots';
mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:5173/';

const browser = await chromium.launch();

async function dismissCookies(p) {
  try {
    await p.getByRole('button', { name: /Accept All/i }).first().click({ timeout: 4000 });
    await p.waitForTimeout(500);
  } catch { /* banner already gone */ }
}

// ── Landing page across breakpoints ──
const landing = [[390, 'mobile'], [834, 'tablet'], [1440, 'desktop'], [1920, 'wide']];
for (const [w, label] of landing) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(BASE, { waitUntil: 'networkidle' });
  await dismissCookies(p);
  await p.waitForTimeout(1000);
  // full page only for the three smaller widths (1920 full-page is huge);
  // 1920 gets a viewport (hero) shot instead.
  const fullPage = w !== 1920;
  await p.screenshot({ path: `${OUT}/landing-${label}-${w}.png`, fullPage });
  console.log('landing', label, 'ok');
  await ctx.close();
}

// ── Demo across desktop + mobile → drive to the (widened) game-select view ──
for (const [w, label] of [[1440, 'desktop'], [390, 'mobile']]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(BASE, { waitUntil: 'networkidle' });
  await dismissCookies(p);
  await p.waitForTimeout(800);
  try {
    await p.getByText(/Try the live demo/i).first().click({ timeout: 6000 });
    await p.waitForTimeout(900);
    await p.screenshot({ path: `${OUT}/demo-welcome-${label}.png` });
    await p.getByRole('button', { name: /Start the demo/i }).first().click({ timeout: 6000 });
    await p.waitForTimeout(800);
    await p.getByRole('textbox').first().fill('Maya');
    await p.waitForTimeout(300);
    // Continue button enables once a name is typed; click it (fall back to Enter).
    try { await p.getByRole('button', { name: /continue|start|go|next/i }).first().click({ timeout: 3000 }); }
    catch { await p.keyboard.press('Enter'); }
    await p.waitForTimeout(1200);
    await p.screenshot({ path: `${OUT}/demo-gameselect-${label}.png`, fullPage: true });
    console.log('demo', label, 'ok');
  } catch (e) {
    console.log('demo flow failed', label, e.message);
    await p.screenshot({ path: `${OUT}/demo-fallback-${label}.png` });
  }
  await ctx.close();
}

await browser.close();
console.log('DONE');
