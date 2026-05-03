/**
 * smoke.spec.ts — minimum-viable boot test.
 *
 * If this passes, the build is healthy enough for a human to even
 * attempt manual QA.  If it fails, the bundle has a JS error blocking
 * React from mounting, the SPA shell is broken, or routing is dead —
 * any of which would be a release-blocker.
 *
 * Intentionally narrow:
 *   - No login (Supabase mock isn't wired into this suite)
 *   - No navigation past the landing
 *   - No timing-sensitive interactions
 *
 * The richer suites in navigation.spec.ts and public-pages.spec.ts
 * cover the actual user flows.  This file just guards "does the app
 * even boot at all".
 */
import { test, expect } from '../fixtures/app.fixture';
import { goToLanding } from '../helpers/navigation';

test.describe('Smoke — app boots', () => {
  test('landing page renders SPA shell without console errors', async ({ publicPage: page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await goToLanding(page);

    // Body has more than just an empty <div id="root"> — React mounted
    // and rendered something visible.
    const bodyText = await page.textContent('body');
    expect(bodyText?.length, 'body text length — React mounted?').toBeGreaterThan(50);

    // No critical pageerror events fired during boot.  Console errors
    // from third-party scripts (Cloudflare insights, etc.) are noisy
    // but not blocking; we filter on "Uncaught" + "ReferenceError" +
    // "is not defined" which are the loud failure modes.
    const hardErrors = errors.filter(e =>
      /Uncaught|ReferenceError|is not defined|Cannot read prop|Cannot read properties/.test(e)
    );
    expect(
      hardErrors,
      `boot-time JS errors:\n${hardErrors.join('\n')}`,
    ).toEqual([]);
  });

  test('document title is set correctly', async ({ publicPage: page }) => {
    await goToLanding(page);
    const title = await page.title();
    expect(title.toLowerCase()).toContain('vocaband');
  });

  test('body has actual rendered content (not blank white page)', async ({ publicPage: page }) => {
    await goToLanding(page);
    // Wait for the React tree to flush at least one node into #root.
    await page.waitForFunction(
      () => {
        const root = document.querySelector('#root');
        return root && root.children.length > 0;
      },
      { timeout: 10_000 },
    );
    const rootChildren = await page.locator('#root > *').count();
    expect(rootChildren, 'expected #root to contain at least one mounted child').toBeGreaterThan(0);
  });
});
