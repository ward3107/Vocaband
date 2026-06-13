/**
 * routes.ts — the single source of truth mapping each View to its
 * canonical, refresh-stable URL path (and back again).
 *
 * Slice 2 of the URL-routing migration (docs/url-routing-migration-plan.md).
 * Today VIEW_PATH covers the views that already own a real path — the
 * public marketing pages. Later slices extend the table as more views
 * become URL-addressable; resolveInitialView + handlePublicNavigate read
 * from here so there's one place to keep in sync (slice 1 had the path
 * list duplicated across publicNavigation.ts and resolveInitialView.ts).
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
  'public-landing': '/',
  'public-terms': '/terms',
  'public-privacy': '/privacy',
  'public-security': '/security',
  'public-free-resources': '/free-resources',
  'public-status': '/status',
  'accessibility-statement': '/accessibility-statement',
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
