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

// The path each public page lives at is owned by the central VIEW_PATH
// registry (src/utils/routes.ts) — look it up with pathForView(view).
// Keeping the path table in one place is what slice 2 of the URL-routing
// migration consolidated; it used to be duplicated here as PUBLIC_PAGE_PATH.
