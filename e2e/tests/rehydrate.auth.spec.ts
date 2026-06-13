/**
 * rehydrate.auth.spec.ts — Slice 4 of the URL-routing migration.
 *
 * Stateful sub-views carry their object's id in the URL and re-hydrate it on
 * load. The assignment-backed projector views (class-show, worksheet) normally
 * hold a transient object set when a teacher taps an assignment;
 * useAssignmentViewDeepLink restores it from the already-loaded assignments,
 * so a deep-link / refresh of /<view>?assignmentId=<id> lands on the right
 * assignment, not an empty picker.
 *
 * Runs under playwright.auth.config.ts (Supabase-mock build).
 */
import { test, expect } from '../fixtures/auth.fixture';
import { waitForAppLoad } from '../helpers/navigation';

// TEST_ASSIGNMENT's title only renders if re-hydration found it in the loaded
// assignments — an un-hydrated projector shows an empty picker instead.
const ASSIGNMENT_TITLE = 'Week 1 Vocabulary';

test.describe('Slice 4 — assignment projector views re-hydrate from ?assignmentId', () => {
  test('teacher deep-links /class-show?assignmentId=… and the projector restores that assignment', async ({ teacherPage: page }) => {
    await page.goto('/class-show?assignmentId=assignment-001', { waitUntil: 'domcontentloaded' });
    await waitForAppLoad(page);
    await expect(page.getByText(ASSIGNMENT_TITLE)).not.toHaveCount(0, { timeout: 20_000 });
    await expect(page).toHaveURL(/\/class-show\?assignmentId=assignment-001$/);
  });

  test('teacher deep-links /worksheet?assignmentId=… and the sheet restores that assignment', async ({ teacherPage: page }) => {
    await page.goto('/worksheet?assignmentId=assignment-001', { waitUntil: 'domcontentloaded' });
    await waitForAppLoad(page);
    await expect(page.getByText(ASSIGNMENT_TITLE)).not.toHaveCount(0, { timeout: 20_000 });
    await expect(page).toHaveURL(/\/worksheet\?assignmentId=assignment-001$/);
  });
});
