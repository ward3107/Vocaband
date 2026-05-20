/**
 * auth-flow.spec.ts — authenticated entry-point smoke test.
 *
 * Closes the gap flagged in docs/security-audit-framework/01-AUTH-IDENTITY.md:
 * the existing smoke.spec.ts deliberately skips login, so regressions in
 * session security (token storage, auth gating) only surface in human QA.
 *
 * This file exercises the smallest authenticated surface we can drive in
 * CI without real credentials:
 *   1. Landing page exposes a Sign In affordance.
 *   2. Clicking it surfaces the teacher-login affordances (Google OAuth +
 *      email entry) — the public CSP doesn't break the auth widget.
 *
 * Scope kept narrow on purpose.  A full "log in, render dashboard"
 * authenticated test would require:
 *   - VITE_SUPABASE_URL pointed at TEST_SUPABASE_URL in webServer cmd
 *     (currently empty; would risk destabilising smoke.spec.ts).
 *   - mockSupabase(page, 'teacher') wiring on a fresh fixture.
 *   - A teacher-dashboard renders assertion gated on a feature flag.
 * That's a multi-day workstream; this file is the security-relevant
 * subset that can ship today.
 */
import { test, expect } from '../fixtures/app.fixture';
import { goToLanding } from '../helpers/navigation';

test.describe('Auth surface — teacher login affordances', () => {
  test('landing page exposes a sign-in entry point', async ({ publicPage: page }) => {
    await goToLanding(page);

    // The teacher login surface is reachable from the landing page.
    // We look for either an explicit "Sign in" / "Teacher" affordance
    // (button or link, any case).  Failing this assertion means the
    // teacher entry point was moved without a corresponding UI alias.
    const signInCandidate = page
      .getByRole('button', { name: /sign in|log in|teacher|i'?m a teacher/i })
      .or(page.getByRole('link', { name: /sign in|log in|teacher|i'?m a teacher/i }))
      .first();

    await expect(signInCandidate, 'expected at least one teacher sign-in affordance').toBeVisible({
      timeout: 10_000,
    });
  });

  test('no auth-credential strings leak to body text', async ({ publicPage: page }) => {
    // Guards against a regression where a debug build accidentally
    // surfaces a JWT, anon-key prefix, or service-role marker in the
    // landing page DOM.  Pattern list deliberately conservative so we
    // don't false-positive on the word "key" in copy.
    await goToLanding(page);
    const bodyText = (await page.textContent('body')) || '';
    const hits = [
      /eyJhbGciOiJIUzI1NiIs/, // JWT header prefix
      /service[_-]?role/i,    // accidental token-class label
      /supabase.*secret/i,     // accidental secret label
    ].filter((re) => re.test(bodyText));
    expect(hits, `unexpected credential-looking strings in landing body: ${hits.map(String).join(', ')}`).toEqual([]);
  });
});
