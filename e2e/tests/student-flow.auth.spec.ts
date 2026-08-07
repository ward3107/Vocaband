/**
 * student-flow.auth.spec.ts — end-to-end behavior of the student side.
 *
 * Real assertions on the flows that gate a Play-store submission:
 *   1. Dashboard renders with the seeded student's identity + XP.
 *   2. Assignment surfaces in the Tasks sheet.
 *   3. Shop / Leaderboard deep-links open their views (Play reviewers
 *      exercise these first).
 *   4. No hard runtime errors while touring the shell.
 *
 * Companion to student-screens.auth.spec.ts (visual tour, not a gate):
 * this file IS the gate. A red run here means the student side is broken.
 * Landing-page entry (unauthenticated → class-code screen) lives in
 * student-landing-entry.spec.ts under the public config.
 */
import { test, expect } from '../fixtures/auth.fixture';
import { waitForAppLoad } from '../helpers/navigation';
import { TEST_STUDENT_USER, TEST_ASSIGNMENT } from '../fixtures/test-data';

/**
 * Auto-opening modals (consent gate, pet-milestone claim, onboarding)
 * stack on a bg-black/40 backdrop and intercept clicks. Same shape as
 * student-screens.auth.spec.ts; kept local so this file is self-contained.
 */
async function dismissModals(page: import('@playwright/test').Page) {
  const backdrop = page.locator('div.fixed.inset-0[class*="bg-black/"]');
  const names = [/^skip onboarding$/i, /^close$/i, /got it|done|let.?s go/i];
  for (let i = 0; i < 8; i++) {
    if ((await backdrop.count()) === 0) return;
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
        await page.waitForTimeout(300);
        clicked = true;
        break;
      }
    }
    if (!clicked) {
      await page.keyboard.press('Escape').catch(() => {});
      await page.waitForTimeout(250);
    }
  }
}

test.describe('Student flow — authenticated', () => {
  test('dashboard renders with the seeded student identity + XP', async ({ studentPage: page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppLoad(page);
    await dismissModals(page);

    // TEST_STUDENT_USER.display_name = "Alice". If this doesn't render,
    // the user row didn't hydrate from the mock and auth restore is broken.
    await expect(
      page.getByText(TEST_STUDENT_USER.display_name, { exact: false }).first(),
    ).toBeVisible({ timeout: 20_000 });

    // XP total from the seed (150). The dashboard shows it in a stat chip;
    // the regex tolerates commas / suffixes so a layout change doesn't
    // force a locator edit.
    await expect(
      page.getByText(new RegExp(`\\b${TEST_STUDENT_USER.xp}\\b`)).first(),
    ).toBeVisible({ timeout: 20_000 });
  });

  test('Tasks sheet lists the seeded assignment', async ({ studentPage: page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppLoad(page);
    await dismissModals(page);

    // Tasks orbit circle → assignment sheet. aria-label from OrbitalHub.
    const tasksBtn = page.getByLabel('Tasks').first();
    await tasksBtn.waitFor({ state: 'attached', timeout: 15_000 });
    await dismissModals(page);
    await tasksBtn.click({ force: true });

    await expect(
      page.getByText(TEST_ASSIGNMENT.title, { exact: false }).first(),
    ).toBeVisible({ timeout: 15_000 });
  });

  test('Shop deep-link opens the arcade lobby', async ({ studentPage: page }) => {
    await page.goto('/shop', { waitUntil: 'domcontentloaded' });
    await waitForAppLoad(page);
    // "Featured" is the shop section heading; absent on the dashboard so
    // a dashboard-bounce would fail this assertion.
    await expect(page.getByText('Featured', { exact: true })).not.toHaveCount(0, { timeout: 20_000 });
  });

  test('Leaderboard deep-link opens the ranks view', async ({ studentPage: page }) => {
    await page.goto('/leaderboard', { waitUntil: 'domcontentloaded' });
    await waitForAppLoad(page);
    await expect(page.getByText('Global Top 10')).not.toHaveCount(0, { timeout: 20_000 });
  });

  test('no hard runtime errors while touring the student shell', async ({ studentPage: page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    for (const path of ['/', '/shop', '/leaderboard', '/privacy-settings']) {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await waitForAppLoad(page);
      await dismissModals(page);
    }

    // Same filter as smoke.spec.ts: ignore noisy third-party console errors,
    // fail on Uncaught / ReferenceError / "not defined" — the loud crashes.
    const hardErrors = errors.filter(e =>
      /uncaught|referenceerror|is not defined/i.test(e),
    );
    expect(hardErrors, `hard runtime errors: ${hardErrors.join(' | ')}`).toEqual([]);
  });
});
