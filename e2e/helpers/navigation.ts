import { Page, expect } from '@playwright/test';

/** Wait for the app to finish loading (all Suspense fallbacks resolved).
 *  IMPORTANT: this MUST first wait for the React tree to mount
 *  (i.e. #root has children), then for any "Loading..." Suspense
 *  fallback to disappear.  An earlier version only checked the
 *  negation of "Loading Vocaband" in body text — which trivially
 *  passes on a blank HTML page (no text means no "Loading" text),
 *  so the helper "succeeded" before React had even started.  That
 *  hid real boot failures behind a meaningless green tick. */
export async function waitForAppLoad(page: Page) {
  // 1. React tree must have mounted at least one node into #root.
  await page.waitForFunction(() => {
    const root = document.querySelector('#root');
    return !!root && root.children.length > 0;
  }, { timeout: 20_000 });

  // 2. The Suspense fallback (or other Loading... placeholders) must
  // have been replaced by the actual app content.
  await page.waitForFunction(() => {
    const body = document.body.textContent || '';
    return !body.includes('Loading Vocaband') && !body.includes('Loading landing') && !body.includes('Loading...');
  }, { timeout: 15_000 });
}

/** Navigate to the landing page and wait for it to render */
export async function goToLanding(page: Page) {
  await page.goto('/');
  await waitForAppLoad(page);
}

/** Click "Start Learning" to go to student login */
export async function clickStartLearning(page: Page) {
  await page.getByRole('link', { name: /start learning/i }).or(
    page.getByRole('button', { name: /start learning/i })
  ).first().click();
  // Wait for student login view to appear
  await page.waitForTimeout(500);
}

/** Enter a class code in the student login form */
export async function enterClassCode(page: Page, code: string) {
  const input = page.locator('input[placeholder*="class code" i], input[placeholder*="MATH101" i], #student-class-code-input').first();
  await input.fill(code);
  // Press enter or click the submit/go button
  await input.press('Enter');
}

/** Select a student from the list by display name */
export async function selectStudent(page: Page, name: string) {
  await page.getByText(name, { exact: false }).first().click();
}

/** Click on a game mode from the mode selection screen */
export async function selectGameMode(page: Page, modeName: string) {
  await page.getByText(modeName, { exact: false }).first().click();
}

/** Verify a toast notification appeared with the given text */
export async function expectToast(page: Page, text: string) {
  await expect(page.getByText(text, { exact: false }).first()).toBeVisible({ timeout: 5_000 });
}

/** Verify the page contains specific heading text */
export async function expectHeading(page: Page, text: string | RegExp) {
  await expect(
    page.getByRole('heading', { name: text }).first()
  ).toBeVisible({ timeout: 10_000 });
}
