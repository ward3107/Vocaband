/**
 * student-screens.auth.spec.ts — screenshot tour of the student side.
 *
 * Boots as a logged-in student (auth fixture, Supabase-mock build) and
 * captures a full-page screenshot of each student-facing screen into
 * e2e/screenshots/. Deep-linkable views are reached by URL; the rest by
 * clicking the orbital-hub buttons on the dashboard (aria-labels in
 * OrbitalHub.tsx). Not a regression test — it exists to produce images.
 */
import { test } from '../fixtures/auth.fixture';
import { waitForAppLoad } from '../helpers/navigation';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SHOT_DIR = path.resolve(__dirname, '..', 'screenshots');

type PWPage = import('@playwright/test').Page;

/**
 * Auto-opening modals (pet-milestone claim, onboarding, consent) sit on a
 * `bg-black/40` backdrop and intercept clicks. Clear them before navigating
 * or screenshotting: press Escape, then click any obvious dismiss button.
 */
async function dismissModals(page: PWPage) {
  const backdrop = page.locator('div.fixed.inset-0[class*="bg-black/"]');
  // Specific dismiss controls, highest-priority first. The onboarding card
  // and the pet-companion card stack on each other and mutually intercept
  // clicks, so we force-click (bypass actionability) until no backdrop remains.
  const names = [/^skip onboarding$/i, /^close$/i, /got it|done|let.?s go/i];
  for (let i = 0; i < 8; i++) {
    if ((await backdrop.count()) === 0) return;
    // The "Before you start playing" consent gate keeps its Continue button
    // DISABLED until the "I read this" checkbox is ticked, and its button
    // label ("Continue playing →") overlaps the generic dismiss names, so
    // handle it explicitly first: tick the box, click Continue, and wait for
    // the backdrop to detach before falling through to the generic buttons.
    const consent = page.getByRole('checkbox').and(page.locator(':not(:checked)'));
    if (await consent.count()) {
      await consent.first().check({ force: true, timeout: 1500 }).catch(() => {});
      const cont = page.getByRole('button', { name: /continue playing/i }).first();
      if (await cont.count()) {
        await cont.click({ force: true, timeout: 1500 }).catch(() => {});
        await backdrop.first().waitFor({ state: 'detached', timeout: 3000 }).catch(() => {});
        continue;
      }
    }
    let clicked = false;
    for (const name of names) {
      const btn = page.getByRole('button', { name }).first();
      if (await btn.count()) {
        await btn.click({ force: true, timeout: 1500 }).catch(() => {});
        await page.waitForTimeout(350);
        clicked = true;
        break;
      }
    }
    if (!clicked) {
      await page.keyboard.press('Escape').catch(() => {});
      await page.waitForTimeout(300);
    }
  }
}

async function shot(page: PWPage, name: string, fullPage = true) {
  // Let lazy content + images settle, then clear any overlay before capturing.
  await page.waitForTimeout(1000);
  await dismissModals(page);
  await page.waitForTimeout(400);
  // Fixed-position overlays (the Tasks page) don't tile under Playwright's
  // full-page stitch, so capture those as a plain viewport shot instead.
  await page.screenshot({ path: path.join(SHOT_DIR, `${name}.png`), fullPage });
}

test.describe('Student-side screenshot tour', () => {
  test('captures every student screen', async ({ studentPage: page }) => {
    // 1. Dashboard (home / orbital hub)
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppLoad(page);
    await shot(page, '01-student-dashboard');

    // Helper: from the dashboard, open an orbit destination and screenshot it.
    const captureOrbit = async (label: string, name: string, fullPage = true) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await waitForAppLoad(page);
      const btn = page.getByLabel(label).first();
      // The orbital hub mounts a beat after the app's boot fallback clears,
      // so wait for the button itself rather than checking count too early.
      await btn.waitFor({ state: 'attached', timeout: 15_000 }).catch(() => {});
      await dismissModals(page);
      if (await btn.count()) {
        await btn.click({ force: true });
        await page.waitForTimeout(900);
        await shot(page, name, fullPage);
      }
    };

    // 2. Tasks (assignment list — now its own page behind the Tasks circle).
    //    Viewport shot: it's a fixed overlay, not part of the page flow.
    await captureOrbit('Tasks', '02-student-tasks', false);

    // 3. Daily (chest / weekly / missions / boosts / badges)
    await captureOrbit('Daily', '03-student-daily');

    // 4. Shop (arcade lobby)
    await page.goto('/shop', { waitUntil: 'domcontentloaded' });
    await waitForAppLoad(page);
    await shot(page, '04-shop');

    // 5. Leaderboard / Ranks
    await page.goto('/leaderboard', { waitUntil: 'domcontentloaded' });
    await waitForAppLoad(page);
    await shot(page, '05-leaderboard');

    // 6. Privacy & Data settings
    await page.goto('/privacy-settings', { waitUntil: 'domcontentloaded' });
    await waitForAppLoad(page);
    await shot(page, '06-privacy-settings');
  });
});
