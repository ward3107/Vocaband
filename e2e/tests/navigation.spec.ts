import { test, expect } from '../fixtures/app.fixture';
import { goToLanding, waitForAppLoad } from '../helpers/navigation';

test.describe('Navigation', () => {
  test('app loads without blank screen', async ({ publicPage: page }) => {
    await goToLanding(page);
    const bodyText = await page.textContent('body');
    expect(bodyText?.length).toBeGreaterThan(50);
  });

  test('no TDZ ReferenceError on load', async ({ publicPage: page }) => {
    const referenceErrors: string[] = [];
    page.on('pageerror', (error) => {
      if (error.message.includes('Cannot access') && error.message.includes('before initialization')) {
        referenceErrors.push(error.message);
      }
    });

    await goToLanding(page);
    expect(referenceErrors).toHaveLength(0);
  });

  test('no crash-level JS errors on load', async ({ publicPage: page }) => {
    const criticalErrors: string[] = [];
    page.on('pageerror', (error) => {
      // Only track errors that would crash the app
      if (
        error.message.includes('Cannot access') ||
        error.message.includes('is not defined') ||
        error.message.includes('is not a function')
      ) {
        criticalErrors.push(error.message);
      }
    });

    await goToLanding(page);
    expect(criticalErrors).toHaveLength(0);
  });

  test('accessibility statement page loads via URL', async ({ publicPage: page }) => {
    await page.goto('/accessibility-statement');
    await waitForAppLoad(page);
    await expect(page.getByText(/accessibility/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test('page has correct title', async ({ publicPage: page }) => {
    await goToLanding(page);
    const title = await page.title();
    expect(title).toContain('Vocaband');
  });
});
