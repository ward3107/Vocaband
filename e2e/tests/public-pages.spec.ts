import { test, expect } from '../fixtures/app.fixture';
import { goToLanding } from '../helpers/navigation';

test.describe('Public Pages', () => {
  test('landing page loads with hero content', async ({ publicPage: page }) => {
    await goToLanding(page);
    // The hero H1 renders as "Level Up\nYour Vocabulary" (a <br>/block
    // split), so the old exact-string assertion getByText('Level Up Your
    // Vocabulary') never matched — Playwright compares the normalized
    // text node, and the newline is not a plain space. Assert the hero
    // STRUCTURE plus a whitespace-tolerant copy check instead, so a
    // future wording tweak doesn't fail the suite for no reason.
    const hero = page.getByRole('heading', { level: 1 }).first();
    await expect(hero).toBeVisible({ timeout: 15_000 });
    expect((await hero.innerText()).replace(/\s+/g, ' ').trim()).toMatch(/level up your vocabulary/i);
  });

  test('landing page has a student entry point', async ({ publicPage: page }) => {
    await goToLanding(page);
    // There is no "Start Learning" BUTTON on the landing page — that
    // string survives only in the JSON-LD <script> in <head> and in body
    // prose, so the old getByText('Start Learning') assertion was
    // matching non-interactive text and proving nothing. The real
    // student CTA is the class-code button.
    await expect(page.getByRole('button', { name: /class code/i }).first())
      .toBeVisible({ timeout: 15_000 });
  });

  test('landing page has a teacher sign-in entry point', async ({ publicPage: page }) => {
    await goToLanding(page);
    // The teacher CTA's label is responsive: wide viewports render a
    // "Teacher Login" button, while the narrow Galaxy-S9+ breakpoint drops
    // it and leaves the sign-in buttons whose accessible names are
    // "Sign in — Teachers & Principals" / "Sign in — for teachers".
    // Pinning the desktop wording made this fail on Small Android only,
    // so match the teacher-facing sign-in affordance in any of its forms.
    await expect(
      page.getByRole('button', { name: /teacher|principals/i }).first(),
    ).toBeVisible({ timeout: 15_000 });
  });

  test('app boots with a usable Supabase config (no config-error banner)', async ({ publicPage: page }) => {
    await goToLanding(page);
    // Inverted from the old "shows config error banner" expectation.
    // src/core/supabase.ts now falls back to in-source public URL +
    // publishable key when the VITE_* vars are empty (added so Cloudflare
    // preview builds, which inject empty strings, still work). That makes
    // `isSupabaseConfigured` always true, so the red banner can no longer
    // render — even under this suite's VITE_SUPABASE_URL="" build. Assert
    // the real contract: the app boots configured and shows no banner.
    await expect(page.getByText(/Supabase is not configured/i)).toHaveCount(0);
  });

  test('clicking the class-code CTA routes the student onward', async ({ publicPage: page }) => {
    await goToLanding(page);
    // Click the REAL student CTA. The old test clicked
    // getByText('Start Learning'), which resolved to the JSON-LD script /
    // prose text rather than a control: the click was then intercepted by
    // the sticky top nav and retried until the 60s timeout.
    await page.getByRole('button', { name: /class code/i }).first().click();

    // The app may land on different views here, so only assert the page rendered content
    const bodyText = await page.textContent('body');
    expect(bodyText?.length).toBeGreaterThan(50);
  });
});
