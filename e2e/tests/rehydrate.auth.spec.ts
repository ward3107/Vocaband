/**
 * rehydrate.auth.spec.ts — Slice 4 of the URL-routing migration.
 *
 * Stateful sub-views carry their object's id in the URL and re-hydrate it on
 * load, so a deep-link / refresh lands on the right state instead of an empty
 * view or a bounce to the dashboard:
 *   - class-show / worksheet — ?assignmentId=<id>, restored by
 *     useAssignmentViewDeepLink from the loaded assignments.
 *   - create-assignment — ?classId=<id>, restored by useViewGuards' Guard 4
 *     from the loaded classes (instead of bouncing).
 *
 * Runs under playwright.auth.config.ts (Supabase-mock build).
 */
import { test, expect } from '../fixtures/auth.fixture';
import { waitForAppLoad } from '../helpers/navigation';

// TEST_ASSIGNMENT's title only renders if re-hydration found it in the loaded
// assignments — an un-hydrated projector shows an empty picker instead.
const ASSIGNMENT_TITLE = 'Week 1 Vocabulary';

test.describe('Slice 4 — stateful sub-views re-hydrate from the URL', () => {
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

  test('teacher deep-links /create-assignment?classId=… and lands on the wizard (guard re-hydrates the class)', async ({ teacherPage: page }) => {
    await page.goto('/create-assignment?classId=class-001', { waitUntil: 'domcontentloaded' });
    await waitForAppLoad(page);
    // The wizard's subtitle "SELECT WORDS • ASSIGN TO CLASS" — present only if
    // Guard 4 re-hydrated selectedClass from ?classId= instead of bouncing to
    // the dashboard.
    await expect(page.getByText(/SELECT WORDS/i)).not.toHaveCount(0, { timeout: 20_000 });
    await expect(page).toHaveURL(/\/create-assignment\?classId=class-001$/);
  });
});
