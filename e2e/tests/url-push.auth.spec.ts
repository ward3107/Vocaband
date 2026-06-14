/**
 * url-push.auth.spec.ts — Slice 5 of the URL-routing migration.
 *
 * The "view → URL" push: when a logged-in user navigates IN-APP,
 * useBackButtonTrap now attaches the view's canonical path (behind the
 * URL_ROUTING_PUSH flag, which playwright.auth.config.ts builds ON), so the
 * address bar tracks the view and a refresh re-resolves to it instead of
 * dropping back to the dashboard.
 *
 * The kid-safety floor is covered by back-button.auth.spec.ts (which also runs
 * with the flag ON — proving this change doesn't regress it). Real Android
 * edge-swipe / iOS PWA behavior still needs the device checklist in
 * docs/slice-5-back-trap-plan.md before the flag is enabled in prod.
 */
import { test, expect } from '../fixtures/auth.fixture';
import { waitForAppLoad } from '../helpers/navigation';

test.describe('Slice 5 — in-app navigation pushes the canonical URL', () => {
  test('student: dashboard → Shop updates the URL to /shop and survives a refresh', async ({ studentPage: page }) => {
    // Skip the first-run onboarding overlay so the orbit hub is tappable.
    await page.addInitScript(() => {
      try {
        localStorage.setItem('vocaband_student_onboarding_done', '1');
        localStorage.setItem('vocaband_welcome_seen', '1');
      } catch { /* storage blocked — test will fail loudly below */ }
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForAppLoad(page);

    // In-app navigation: trigger the Shop orbit button (aria-label "Shop").
    // dispatchEvent fires the React onClick regardless of the hub's
    // framer-motion animation (which keeps Playwright's stability check busy).
    await page.getByRole('button', { name: 'Shop', exact: true }).dispatchEvent('click');

    // Slice 5: the view change pushed the canonical path.
    await expect(page).toHaveURL(/\/shop$/);

    // And it's now refresh-stable — the push is what makes this work; before
    // Slice 5 the URL stayed '/' and a refresh dropped back to the dashboard.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForAppLoad(page);
    await expect(page.getByText('Featured', { exact: true })).not.toHaveCount(0, { timeout: 20_000 });
    await expect(page).toHaveURL(/\/shop$/);
  });
});
