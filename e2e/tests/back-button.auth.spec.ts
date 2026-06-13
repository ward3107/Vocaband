/**
 * back-button.auth.spec.ts — the authenticated back-button safety net.
 *
 * Runs ONLY under playwright.auth.config.ts (Supabase-mock build). Locks the
 * guarantees useBackButtonTrap exists to provide, BEFORE Slice 5 reworks that
 * trap to cooperate with real URLs:
 *   - a seeded session restores straight to the role's dashboard
 *   - at the dashboard "floor", pressing Back never logs the user out or
 *     bounces them to the public landing / a login screen (the kid-safety
 *     guarantee — students mash Back; an accidental logout mid-session is
 *     exactly what the trap prevents)
 *
 * Covered on chromium + a phone viewport (the trap is a mobile/PWA concern).
 * Real Android edge-swipe / iOS PWA quirks still need real-device runs.
 */
import { test, expect } from '../fixtures/auth.fixture';
import type { Page } from '@playwright/test';
import { waitForAppLoad } from '../helpers/navigation';

const LANDING_HERO = 'Level Up Your Vocabulary';

// Trigger a browser Back WITHOUT waiting for a document load: the trap
// handles popstate in-page (no navigation), so page.goBack() would hang.
async function pressBack(page: Page): Promise<void> {
  await page.evaluate(() => window.history.back());
  await page.waitForTimeout(600);
}

test.describe('Authenticated back-button trap', () => {
  test('teacher session restores straight to the teacher dashboard', async ({ teacherPage: page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppLoad(page);
    await expect(page.getByText('Ms. Teacher')).not.toHaveCount(0, { timeout: 20_000 });
    await expect(page.getByText(LANDING_HERO)).toHaveCount(0);
  });

  test('student session restores straight to the student dashboard', async ({ studentPage: page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppLoad(page);
    await expect(page.getByText('Alice')).not.toHaveCount(0, { timeout: 20_000 });
    await expect(page.getByText(LANDING_HERO)).toHaveCount(0);
  });

  test('teacher: Back at the dashboard floor keeps them logged in (no logout, no exit)', async ({ teacherPage: page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppLoad(page);
    await expect(page.getByText('Logout')).not.toHaveCount(0, { timeout: 20_000 });
    await page.waitForTimeout(800); // let the trap seed its padding entries

    await pressBack(page);

    // Still in the app AND still authenticated — not bounced to the public
    // landing or a login screen, and the session survived the Back press.
    await expect(page.getByText(LANDING_HERO)).toHaveCount(0);
    await expect(page.getByText('Logout')).not.toHaveCount(0);
  });

  test('student: Back at the dashboard floor keeps them logged in (kid-safety)', async ({ studentPage: page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppLoad(page);
    await expect(page.getByText('Logout')).not.toHaveCount(0, { timeout: 20_000 });
    await page.waitForTimeout(800);

    await pressBack(page);

    await expect(page.getByText(LANDING_HERO)).toHaveCount(0);
    await expect(page.getByText('Logout')).not.toHaveCount(0);
  });
});
