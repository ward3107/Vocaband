/**
 * rehydrate.auth.spec.ts — Slice 4 of the URL-routing migration.
 *
 * Stateful sub-views carry their object's id in the URL and re-hydrate it on
 * load. class-show normally holds a transient `classShowAssignment` (set when
 * a teacher taps "project to class"); useClassShowDeepLink restores it from
 * the already-loaded assignments, so a deep-link / refresh of
 * /class-show?assignmentId=<id> lands on the right assignment, not an empty
 * picker.
 *
 * Runs under playwright.auth.config.ts (Supabase-mock build).
 */
import { test, expect } from '../fixtures/auth.fixture';
import { waitForAppLoad } from '../helpers/navigation';

test.describe('Slice 4 — class-show re-hydrates from ?assignmentId', () => {
  test('teacher deep-links /class-show?assignmentId=… and the projector restores that assignment', async ({ teacherPage: page }) => {
    await page.goto('/class-show?assignmentId=assignment-001', { waitUntil: 'domcontentloaded' });
    await waitForAppLoad(page);
    // TEST_ASSIGNMENT's title only renders if re-hydration found it in the
    // loaded assignments — an un-hydrated class-show shows an empty picker.
    await expect(page.getByText('Week 1 Vocabulary')).not.toHaveCount(0, { timeout: 20_000 });
    await expect(page).toHaveURL(/\/class-show\?assignmentId=assignment-001$/);
  });
});
