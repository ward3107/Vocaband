/** Local-only visual smoke check for /dev/student-adventure. */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const url = process.env.ADVENTURE_PREVIEW_URL || 'http://127.0.0.1:5199/dev/student-adventure';
const output = resolve(process.env.ADVENTURE_PREVIEW_OUTPUT || '../adventure-previews');
mkdirSync(output, { recursive: true });

const browser = await chromium.launch({ headless: true });
try {
  for (const [name, viewport] of [
    ['mobile', { width: 390, height: 844 }],
    ['desktop', { width: 1440, height: 900 }],
  ]) {
    const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: 'Your word adventure' }).waitFor();
    for (const world of ['Jungle Trail', 'Ocean Depths', 'Star Voyage']) {
      await page.getByRole('region', { name: world }).waitFor();
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    if (overflow > 1) throw new Error(`${name}: ${overflow}px horizontal overflow`);
    await page.locator('[data-preview-controls]').evaluate(element => { element.style.visibility = 'hidden'; });
    await page.screenshot({ path: resolve(output, `${name}.png`), fullPage: true });
    await page.locator('[data-preview-controls]').evaluate(element => { element.style.visibility = ''; });

    await page.getByRole('button', { name: 'Classic Mode - completed' }).click();
    await page.getByRole('heading', { name: 'classic' }).waitFor();
    await page.getByText('The real game opens here').waitFor();
    await page.getByRole('button', { name: '← Back to the trail' }).click();
    await page.getByRole('button', { name: 'Quick Play view' }).click();
    const locked = page.getByRole('button', { name: 'Classic Mode - locked' });
    if (!(await locked.isDisabled())) throw new Error(`${name}: Quick Play replay lock failed`);
    await page.getByRole('button', { name: 'Change language' }).click();
    await page.getByRole('menuitemradio', { name: 'עברית' }).click();
    if (await page.locator('html').getAttribute('dir') !== 'rtl') throw new Error(`${name}: RTL failed`);
    await page.locator('[data-preview-controls]').evaluate(element => { element.style.visibility = 'hidden'; });
    await page.screenshot({ path: resolve(output, `${name}-rtl.png`), fullPage: true });
    if (errors.length) throw new Error(`${name}: page errors: ${errors.join('; ')}`);
    console.log(`${name}: worlds, layout, launch, Quick Play, RTL passed`);
    await page.close();
  }
} finally {
  await browser.close();
}
