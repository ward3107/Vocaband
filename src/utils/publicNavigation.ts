/**
 * Maps a public-page label (used by header/footer nav buttons) to
 * its View id.  Pulled out of App.tsx so the table is one block of
 * code instead of inlined inside a handler.
 *
 * Add new public pages here AND to the View union — TypeScript will
 * flag any caller that drifts.
 */
import type { View } from '../core/views';

export type PublicPage =
  | 'home'
  | 'terms'
  | 'privacy'
  | 'accessibility'
  | 'security'
  | 'resources'
  | 'status';

export const PUBLIC_PAGE_VIEW: Record<PublicPage, View> = {
  home: 'public-landing',
  terms: 'public-terms',
  privacy: 'public-privacy',
  accessibility: 'accessibility-statement',
  security: 'public-security',
  resources: 'public-free-resources',
  status: 'public-status',
};

/**
 * The canonical, refresh-stable URL path for each public page.  Navigating
 * to a public page pushes this path (see handlePublicNavigate) so the
 * address bar reflects the page and a refresh/share re-resolves to it.
 *
 * Kept in lock-step with PUBLIC_PAGE_VIEW above AND with the path→view
 * rules in resolveInitialView.ts — the round-trip (click → URL → refresh →
 * same view) only holds while all three agree.
 */
export const PUBLIC_PAGE_PATH: Record<PublicPage, string> = {
  home: '/',
  terms: '/terms',
  privacy: '/privacy',
  accessibility: '/accessibility-statement',
  security: '/security',
  resources: '/free-resources',
  status: '/status',
};
