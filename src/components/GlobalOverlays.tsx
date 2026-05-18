import { Suspense, lazy } from 'react';

// Mounted as a sibling to <App /> rather than inside any of App.tsx's
// view branches, because App.tsx has dozens of early-return view splits
// and none of the post-auth views (student dashboard, teacher dashboard,
// game routes) render the cookieBannerOverlay fragment. Living outside
// the view tree means the overlay stays present regardless of which
// route App.tsx returns.
//
// PwaInstallGate was previously mounted here but was removed per user
// request — the always-on install nag was disliked. The underlying
// install support (manifest, service worker, beforeinstallprompt
// capture) stays in place so Chrome / Safari / Samsung Internet can
// still surface their own native install entry points; we just no
// longer show a custom modal/banner about it.

const InAppBrowserWarning = lazy(() => import('./InAppBrowserWarning'));

export default function GlobalOverlays() {
  return (
    <Suspense fallback={null}>
      <InAppBrowserWarning />
    </Suspense>
  );
}
