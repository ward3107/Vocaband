/**
 * routes.ts — the single source of truth mapping each View to its
 * canonical, refresh-stable URL path (and back again).
 *
 * Introduced in Slice 2 of the URL-routing migration
 * (docs/url-routing-migration-plan.md). VIEW_PATH covers the public
 * marketing pages (Slice 1) plus the "landable" authenticated views
 * (Slice 3) — those resolvable from the URL alone on a fresh load.
 * Later slices extend the table as more views become URL-addressable;
 * resolveInitialView + handlePublicNavigate read from here so there's
 * one place to keep in sync (slice 1 had the path list duplicated across
 * publicNavigation.ts and resolveInitialView.ts).
 *
 * This is deliberately NOT a full router. Parametric / conditional routes
 * stay as imperative rules in resolveInitialView because a static table
 * can't express them:
 *   - ?session=…            (query param, can sit on any path)
 *   - ?class=…              (query param)
 *   - /w/<slug>             (path parameter)
 *   - /student & /teacher   (remapped to student login inside the native
 *                            student shell — runtime-context dependent)
 */
import type { View } from '../core/views';

/**
 * View → canonical path. `Partial` because most views aren't
 * URL-addressable yet; pathForView returns null for those.
 */
export const VIEW_PATH: Partial<Record<View, string>> = {
  // Public marketing pages (Slice 1) — always landable, no session needed.
  'public-landing': '/',
  'public-terms': '/terms',
  'public-privacy': '/privacy',
  'public-security': '/security',
  'public-free-resources': '/free-resources',
  'public-status': '/status',
  'accessibility-statement': '/accessibility-statement',

  // "Landable" authenticated views (Slice 3) — they need only data the
  // auth flow already loads (no transient in-memory object) and are
  // already in shouldPreserveView's keep-sets (authViews.ts), so a token
  // refresh / fresh load on one of these URLs stays put instead of being
  // bounced to the dashboard. resolveInitialView gates them behind
  // hasRestorableSession so a logged-OUT deep link falls through to the
  // landing rather than rendering a dataless authed screen.
  'shop': '/shop',
  'global-leaderboard': '/leaderboard',
  'privacy-settings': '/privacy-settings',
  'vocabulary-library': '/vocabulary-library',
  'vocabagrut': '/vocabagrut',
  // Admin / manager internal dashboards — role-gated inside the view (not at
  // the router), so a non-privileged deep link sees the view's own gate /
  // empty state, never another role's data.
  'developer-dashboard': '/developer',
  'admin-security': '/admin-security',
  'manager-dashboard': '/manager',
  // Stateful sub-views (Slice 4) — landable via a URL param re-hydrated from
  // already-loaded data. Both carry ?assignmentId=<id>, restored by
  // useAssignmentViewDeepLink from the teacher's loaded assignments.
  'class-show': '/class-show',
  'worksheet': '/worksheet',
};

// Reverse lookup, built once at module load. Path → View.
const PATH_VIEW: Record<string, View> = Object.fromEntries(
  Object.entries(VIEW_PATH).map(([view, path]) => [path, view as View]),
) as Record<string, View>;

/** The canonical path for a view, or null if it isn't URL-addressable yet. */
export function pathForView(view: View): string | null {
  return VIEW_PATH[view] ?? null;
}

/** The view a path maps to, or null if the path isn't a known static route. */
export function viewForPath(pathname: string): View | null {
  return PATH_VIEW[pathname] ?? null;
}
