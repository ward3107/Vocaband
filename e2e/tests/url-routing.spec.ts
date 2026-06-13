/**
 * url-routing.spec.ts — regression net for the URL-routing migration
 * (docs/url-routing-migration-plan.md).
 *
 * Locks the slice 1–2 guarantee that matters most and was the user's
 * primary complaint: every public page has a real, deep-linkable,
 * refresh-stable URL that resolves to the RIGHT view (not the landing
 * fallback). Before the migration a refresh dropped the visitor back on
 * the landing page; these tests fail loudly if that regresses, or if
 * resolveInitialView / the VIEW_PATH registry drifts.
 *
 * Scope notes (deliberate):
 *   - The pages WITHOUT a static HTML counterpart — /security,
 *     /free-resources, /status, /accessibility-statement — are pure
 *     React/SPA routes, so their assertions genuinely exercise
 *     resolveInitialView + the registry + the Worker/preview SPA fallback.
 *     /privacy and /terms also have static SEO HTML; the refresh-stability
 *     assertion holds for them either way.
 *   - In-app click → pushState (the address-bar-tracks-the-page behaviour)
 *     and the authenticated student/teacher back-button matrix (dashboard
 *     floor, no-logout-on-back) are NOT covered here. The e2e preview build
 *     compiles with VITE_SUPABASE_URL="" and renders public pages in a
 *     degraded/config-error mode where SPA history state isn't seeded, and
 *     logged-in flows can't be driven at all (see auth-flow.spec.ts). Both
 *     need the authenticated e2e harness — the first task of Slice 5, where
 *     the back-button code actually changes.
 *
 * Engine: chromium only in CI. The trap's real-device quirks (Android
 * edge-swipe, iOS PWA) still need real-device runs — docs/testing-at-scale.md.
 */
import { test, expect } from '../fixtures/app.fixture';
import { waitForAppLoad } from '../helpers/navigation';

// Public paths owned by the VIEW_PATH registry (src/utils/routes.ts).
// Mirrors the unit-level round-trip test; if the two drift, these fail.
const PUBLIC_ROUTES = [
  '/terms',
  '/privacy',
  '/security',
  '/free-resources',
  '/status',
  '/accessibility-statement',
] as const;

// The landing hero — its ABSENCE proves resolveInitialView routed to the
// real sub-page instead of falling through to the landing page (which is
// how a routing regression would manifest: right URL, wrong view).
const LANDING_HERO = 'Level Up Your Vocabulary';

test.describe('URL routing — public pages (slices 1–2)', () => {
  for (const path of PUBLIC_ROUTES) {
    test(`deep-link ${path} loads that page and survives a refresh`, async ({ publicPage: page }) => {
      const res = await page.goto(path, { waitUntil: 'domcontentloaded' });
      expect(res?.ok(), `${path} should be served (SPA fallback or static)`).toBeTruthy();
      await waitForAppLoad(page);

      // URL stays on the deep-linked path (doesn't bounce to '/').
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      // The real page rendered (not a white screen) and it is NOT the
      // landing fallback — i.e. resolveInitialView routed correctly.
      const body = (await page.textContent('body')) ?? '';
      expect(body.length).toBeGreaterThan(200);
      await expect(page.getByText(LANDING_HERO)).toHaveCount(0);

      // Hard refresh re-resolves to the SAME page — the guarantee the
      // visitor originally lacked (refresh used to drop them on landing).
      await page.reload({ waitUntil: 'domcontentloaded' });
      await waitForAppLoad(page);
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await expect(page.getByText(LANDING_HERO)).toHaveCount(0);
    });
  }
});
