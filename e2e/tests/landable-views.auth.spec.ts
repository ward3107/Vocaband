/**
 * landable-views.auth.spec.ts — Slice 3 of the URL-routing migration.
 *
 * Runs under playwright.auth.config.ts (Supabase-mock build). Proves the
 * "landable" guarantee: a logged-in user can hard-load (or share) a real
 * URL for these views and land ON them — auth-restore keeps the view
 * instead of forcing the dashboard, because each is in shouldPreserveView's
 * keep-set (authViews.ts) and resolveInitialView maps the path.
 *
 * Each assertion checks a VIEW-SPECIFIC marker, not just the URL: a
 * dashboard-bounce would keep the same URL (the dashboard doesn't push
 * one yet), so only a marker unique to the target view proves we landed.
 *
 * NOT covered here: the in-app-navigation URL push (view → URL as you click
 * around). That needs the back-trap rework — Slice 5, real-phone tested.
 */
import { test, expect } from '../fixtures/auth.fixture';
import { waitForAppLoad } from '../helpers/navigation';

test.describe('Slice 3 — landable authenticated views (deep-link)', () => {
  test('student deep-links straight to /shop', async ({ studentPage: page }) => {
    await page.goto('/shop', { waitUntil: 'domcontentloaded' });
    await waitForAppLoad(page);
    // "Featured" is the shop's section heading — absent on the dashboard.
    await expect(page.getByText('Featured', { exact: true })).not.toHaveCount(0, { timeout: 20_000 });
    await expect(page).toHaveURL(/\/shop$/);
  });

  test('student deep-links straight to /leaderboard', async ({ studentPage: page }) => {
    await page.goto('/leaderboard', { waitUntil: 'domcontentloaded' });
    await waitForAppLoad(page);
    await expect(page.getByText('Global Top 10')).not.toHaveCount(0, { timeout: 20_000 });
    await expect(page).toHaveURL(/\/leaderboard$/);
  });

  test('teacher deep-links straight to /vocabulary-library', async ({ teacherPage: page }) => {
    await page.goto('/vocabulary-library', { waitUntil: 'domcontentloaded' });
    await waitForAppLoad(page);
    await expect(page.getByText('Vocabulary Library')).not.toHaveCount(0, { timeout: 20_000 });
    await expect(page).toHaveURL(/\/vocabulary-library$/);
  });

  test('student deep-links straight to /privacy-settings', async ({ studentPage: page }) => {
    await page.goto('/privacy-settings', { waitUntil: 'domcontentloaded' });
    await waitForAppLoad(page);
    await expect(page.getByText('Privacy & Data Settings')).not.toHaveCount(0, { timeout: 20_000 });
    await expect(page).toHaveURL(/\/privacy-settings$/);
  });

  test('teacher deep-links straight to /vocabagrut', async ({ teacherPage: page }) => {
    await page.goto('/vocabagrut', { waitUntil: 'domcontentloaded' });
    await waitForAppLoad(page);
    // "Vocabagrut" is the product brand — same string in EN/HE/AR.
    await expect(page.getByText('Vocabagrut')).not.toHaveCount(0, { timeout: 20_000 });
    await expect(page).toHaveURL(/\/vocabagrut$/);
  });
});
