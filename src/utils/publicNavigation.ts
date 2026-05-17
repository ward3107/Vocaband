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
