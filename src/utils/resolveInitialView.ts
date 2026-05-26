/**
 * Pick the initial view a fresh app mount should render, based on
 * URL state.  Runs synchronously inside useState's lazy initializer
 * so it takes priority over any later auth-driven redirects (which
 * still override it for logged-in users — a logged-in teacher whose
 * URL has ?class=XXX still ends up on their dashboard).
 *
 * The routing rules (in priority order):
 *   - ?session=…           → quick-play-student (QR-scan Live Play)
 *   - /accessibility-statement → accessibility-statement
 *   - /w/<slug>            → public-interactive-worksheet (WhatsApp share)
 *   - /student             → student-account-login (dedicated route)
 *   - ?class=XXX           → student-account-login (classroom poster QR)
 *   - otherwise            → public-landing
 *
 * Pulled out of App.tsx so the rules table is one block of code,
 * not 27 lines of branching mixed into the useState call.
 */
import type { View } from '../core/views';

export function resolveInitialView(): View {
  // Quick Play QR-scan: ?session=… always wins, even over a known route.
  if (new URLSearchParams(window.location.search).get('session')) {
    return 'quick-play-student';
  }
  if (window.location.pathname === '/accessibility-statement') {
    return 'accessibility-statement';
  }
  // Public interactive worksheet — WhatsApp-shareable link teachers paste
  // from the Free Resources page.  Path is /w/<slug>; the slug is read in
  // the render switch.  Auth state is ignored, since logged-in teachers
  // should also be able to test their own shares.
  if (window.location.pathname.startsWith('/w/')) {
    return 'public-interactive-worksheet';
  }
  // Dedicated student URL — `vocaband.com/student` lands directly on the
  // student login page, separate from the teacher-focused marketing
  // landing.  Teachers can share this URL with their class.
  if (window.location.pathname === '/student') {
    return 'student-account-login';
  }
  // `/privacy` opens the designed React PublicPrivacyPage instead of the
  // bare static `/privacy.html` (which still exists for SEO + external
  // links like the Google Play listing).  The cookie banner + consent
  // modal point here with `target="_blank"` so the policy renders in a
  // new tab over the modal-locked dashboard.
  if (window.location.pathname === '/privacy') {
    return 'public-privacy';
  }
  // Classroom-poster QR code / teacher-shared invite link.  When the URL
  // carries a `?class=XXX` parameter and there's no already-active session,
  // skip the landing page and drop the visitor straight on the
  // student-login screen so they can tap their name.  Without this,
  // QR-scanners land on the generic landing page, see no obvious "enter
  // my classroom" CTA, and give up.  Auth restore still runs afterwards —
  // a logged-in user's session overrides this initial view (they'll go to
  // their dashboard, and if their classCode differs, the class-switch
  // modal handles the rest).
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('class')) return 'student-account-login';
  } catch {
    /* URLSearchParams unavailable — fall through */
  }
  return 'public-landing';
}
