/**
 * student-landing-entry.spec.ts — verifies the public entry path for
 * students who don't have the app or a QR code: the landing hero's
 * "Enter class code" link routes to the class-code login screen.
 *
 * Companion to student-flow.auth.spec.ts (post-login flows). Belongs
 * in the public (no-auth) suite because it exercises the unauthenticated
 * landing → student-login route transition.
 */
import { test, expect } from '../fixtures/app.fixture';
import { goToLanding } from '../helpers/navigation';

test.describe('Student entry — public landing', () => {
  test('landing hero surfaces a class-code link that routes to student login', async ({ publicPage: page }) => {
    await goToLanding(page);

    // The link added in LandingPage.tsx uses the heroV2.studentCta locale
    // key. Its accessible name concatenates studentCta + studentNote —
    // regex on "Enter class code" is the stable half.
    const studentLink = page.getByRole('button', { name: /Enter class code/i }).first();
    await expect(studentLink, 'student class-code link visible on landing hero').toBeVisible({ timeout: 15_000 });

    await studentLink.click();

    // The student-account-login view mounts with a Class-code input
    // (aria-label from student-login.ts classCodeAria). Waiting on
    // this proves we ROUTED, not just re-rendered the landing.
    const classCodeInput = page.getByRole('textbox', { name: /class code/i }).first();
    await expect(classCodeInput, 'landed on student class-code login').toBeVisible({ timeout: 15_000 });
  });
});
