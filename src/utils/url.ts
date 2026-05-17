/**
 * Strip a single query-string parameter from window.location without
 * a navigation.  Wraps URL + history.replaceState so callers don't
 * each repeat the try/catch — the History API can throw on file://
 * pages or in iframes with mismatched origin (non-fatal here).
 *
 * Used by the deep-link consumer effects (?assignment=, ?play=) so a
 * refresh or back-nav doesn't re-fire the auto-open after the student
 * has already left the target view.
 */
export function stripUrlParam(name: string): void {
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete(name);
    window.history.replaceState({}, '', url.toString());
  } catch {
    /* history API unavailable — non-fatal */
  }
}
