import { Page, expect } from '@playwright/test';

/** Wait for the app to finish loading (all Suspense fallbacks resolved).
 *
 *  Two failure modes this guards against:
 *
 *  1. The shipped index.html ALREADY contains
 *     `<div id="boot-debug">Loading Vocaband...</div>` inside #root,
 *     so a naive "#root has children" check passes the moment HTML
 *     arrives — even if React never mounted.  We instead wait for
 *     `#boot-debug` to be gone, which only happens after React has
 *     called createRoot().render() and replaced the static fallback.
 *
 *  2. An earlier version only checked the negation of "Loading
 *     Vocaband" in body text, which trivially passes on a blank
 *     page (no text means no "Loading" text).  Same false-green
 *     failure mode in a different shape.
 *
 *  The helper polls every 100ms and bails after 25s, which is more
 *  than enough for any healthy preview-server first navigation. */
export async function waitForAppLoad(page: Page) {
  // Wait for React to have *replaced* the static HTML fallback.
  // `#boot-debug` is the placeholder shipped in index.html; once
  // createRoot().render() runs it's gone.
  await page.waitForFunction(() => {
    return !document.getElementById('boot-debug');
  }, { timeout: 25_000 });

  // Belt-and-braces: any other "Loading..." Suspense fallbacks
  // (lazy App, lazy children) must also have resolved.
  await page.waitForFunction(() => {
    const body = document.body.textContent || '';
    return !body.includes('Loading Vocaband') && !body.includes('Loading landing') && !body.includes('Loading...');
  }, { timeout: 15_000 });
}

/** Navigate to the landing page and wait for it to render.
 *  Uses `domcontentloaded` instead of the default `load` because
 *  the page imports Google Fonts via <link rel=stylesheet>, and on
 *  CI runners with restricted egress the fonts request can hang
 *  indefinitely — preventing the `load` event from ever firing
 *  and blocking page.goto.  React only needs the DOM parsed plus
 *  the JS bundle, both of which are local to vite preview, so
 *  domcontentloaded is the right gate.
 *
 *  Throws fast on non-200 so the next CI failure says "HTTP 404 —
 *  vite preview not serving dist/?" instead of the misleading
 *  downstream "React didn't mount?".  See e2e/playwright.config.ts
 *  webServer.cwd for context on why this used to silently 404. */
export async function goToLanding(page: Page) {
  const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
  if (!response || !response.ok()) {
    throw new Error(
      `Landing page returned HTTP ${response?.status() ?? 'no-response'} — ` +
      `vite preview likely couldn't find the built bundle. Check ` +
      `webServer.cwd in e2e/playwright.config.ts and that npm run build ` +
      `produced ./dist at the project root.`,
    );
  }
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
