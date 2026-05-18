import { Suspense, lazy } from 'react';

// These two overlays MUST be mounted as a sibling to <App /> rather than
// inside any of App.tsx's view branches, because App.tsx has dozens of
// early-return view splits and none of the post-auth views (student
// dashboard, teacher dashboard, game routes) render the cookieBannerOverlay
// fragment that previously housed them. The bug it caused: the install
// gate only ever appeared on the marketing pages — once a user logged in
// and landed on a dashboard, the gate unmounted entirely.
//
// Both children are themselves position:fixed full-viewport overlays, so
// living outside the view tree doesn't affect their visual placement.

const PwaInstallGate = lazy(() => import('./PwaInstallGate'));
const InAppBrowserWarning = lazy(() => import('./InAppBrowserWarning'));

export default function GlobalOverlays() {
  return (
    <>
      <Suspense fallback={null}>
        <PwaInstallGate />
      </Suspense>
      <Suspense fallback={null}>
        <InAppBrowserWarning />
      </Suspense>
    </>
  );
}
