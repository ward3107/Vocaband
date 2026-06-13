/**
 * Pick the initial view a fresh app mount should render, based on
 * URL state.  Runs synchronously inside useState's lazy initializer
 * so it takes priority over any later auth-driven redirects (which
 * still override it for logged-in users — a logged-in teacher whose
 * URL has ?class=XXX still ends up on their dashboard).
 *
 * The routing rules (in priority order):
 *   - ?session=…           → quick-play-student (QR-scan Live Play)
 *   - /w/<slug>            → public-interactive-worksheet (WhatsApp share)
 *   - /student             → student-account-login (dedicated route)
 *   - /teacher             → teacher-login (dedicated route)
 *   - static public paths  → via the VIEW_PATH registry (src/utils/routes.ts):
 *                            /privacy /terms /security /free-resources
 *                            /status /accessibility-statement
 *   - landable authed paths → via the same registry, but only with a
 *                            restorable session (/shop /leaderboard
 *                            /vocabulary-library); logged-out falls through
 *   - ?class=XXX           → student-account-login (classroom poster QR)
 *   - otherwise            → public-landing
 *
 * Pulled out of App.tsx so the rules table is one block of code,
 * not 27 lines of branching mixed into the useState call.
 */
import type { View } from '../core/views';
import { isStudentShell } from './studentShell';
import { viewForPath } from './routes';
import { isPublicView } from './authViews';
import { hasRestorableSession } from './hasRestorableSession';

export function resolveInitialView(): View {
  // Native student app (Capacitor wrapper): students-only, so both the
  // marketing landing and the teacher login resolve to student login.
  // Checked first because the shell's start URL is fixed — the deep-link
  // rules below (?session, /w/) still apply if the shell ever opens one.
  const studentShell = isStudentShell();
  // Quick Play QR-scan: ?session=… always wins, even over a known route.
  if (new URLSearchParams(window.location.search).get('session')) {
    return 'quick-play-student';
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
  // Dedicated teacher URL — mirrors `/student`. It's where a logged-out
  // teacher is sent (see the SIGNED_OUT handler in useAuthRestore), so a
  // refresh keeps them on the login card instead of bouncing to the
  // marketing landing.
  if (window.location.pathname === '/teacher') {
    return studentShell ? 'student-account-login' : 'teacher-login';
  }
  // Static public paths resolve via the central VIEW_PATH registry
  // (src/utils/routes.ts): /privacy, /terms, /security, /free-resources,
  // /status, /accessibility-statement. The Worker serves the SPA for these
  // (not_found_handling: "single-page-application"), so a hard GET / refresh
  // boots the app and lands here. "/" is intentionally excluded so the
  // student-shell fallback below still owns the root path.
  //
  // /privacy and /terms also have bare static /privacy.html, /terms.html
  // counterparts kept for SEO + external links (e.g. the Google Play
  // listing); the React routes here are what the in-app links + consent
  // modal open.
  const staticView = viewForPath(window.location.pathname);
  if (staticView && staticView !== 'public-landing') {
    // Public marketing pages are always landable. The "landable"
    // authenticated views (shop, leaderboard, library — Slice 3) only
    // resolve when a session might restore; for a logged-OUT visitor we
    // fall through to the landing/login resolution below rather than
    // render a dataless authed screen. Auth restore then KEEPS the view
    // for a logged-in user because each is in shouldPreserveView's
    // keep-set (authViews.ts) — making restore actively honor the URL for
    // non-landable views is Slice 6.
    if (isPublicView(staticView) || hasRestorableSession()) {
      return staticView;
    }
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
  return studentShell ? 'student-account-login' : 'public-landing';
}
