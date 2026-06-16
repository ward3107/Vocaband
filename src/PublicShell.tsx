import { Suspense, useState } from "react";
import type { View } from "./core/views";
import { lazyWithRetry } from "./utils/lazyWithRetry";
import { renderPublicView } from "./views/PublicViews";
import { resolveInitialView } from "./utils/resolveInitialView";
import { PUBLIC_PAGE_VIEW, type PublicPage } from "./utils/publicNavigation";
import { navigateToStudentLogin } from "./handlers/landingNav";
import { useCookieConsent } from "./hooks/useCookieConsent";
import { OfflineIndicator } from "./components/OfflineIndicator";

// The full app is loaded ONLY when a visitor needs auth (clicks a login)
// or hits a non-public view. Keeping it behind this boundary is what drops
// the ~50 kB supabase client off the public landing's cold first-paint —
// the marketing/legal/demo pages reachable here are entirely supabase-free.
const App = lazyWithRetry(() => import("./App"));
const CookieBanner = lazyWithRetry(() => import("./components/CookieBanner"));

/**
 * Lightweight public shell. Renders the no-auth marketing / legal / demo
 * pages via the same renderPublicView helper App uses (zero logic
 * divergence), then hands off to the full <App /> the moment a login flow
 * is requested. main.tsx mounts this instead of <App /> for logged-out
 * visitors whose initial view is public — see startInPublicShell().
 */
export default function PublicShell() {
  const [view, setView] = useState<View>(resolveInitialView);
  const [prevView, setPrevView] = useState<View>("public-landing");
  const [showDemo, setShowDemo] = useState(false);
  // Once set, the full App takes over and renders this target view.
  const [enterApp, setEnterApp] = useState<View | null>(null);

  const {
    showCookieBanner,
    handleCookieAccept,
    handleCookieCustomize,
    handleCookieReject,
  } = useCookieConsent();

  if (enterApp) {
    return (
      <Suspense fallback={null}>
        <App initialView={enterApp} />
      </Suspense>
    );
  }

  const navigate = (next: View) => {
    setPrevView(view);
    setView(next);
  };

  const publicView = renderPublicView({
    view,
    user: null,
    showDemo,
    setShowDemo,
    goBack: () => setView(prevView),
    onPublicNavigate: (page: PublicPage) => navigate(PUBLIC_PAGE_VIEW[page]),
    // Both auth entry points hand off to the full App (which owns supabase,
    // session restore, and the onAuthStateChange listener).
    onTeacherOAuth: () => setEnterApp("teacher-login"),
    onStudentLogin: () => {
      // Push /student so the URL matches App's student-login route; App's
      // own restore/nav takes over from there.
      navigateToStudentLogin(() => {});
      setEnterApp("student-account-login");
    },
    // Always-configured in production (source-level fallback creds), so the
    // misconfig banner never applies to a real public visitor.
    configErrorBanner: null,
    cookieBannerOverlay: (
      <>
        {showCookieBanner && (
          <Suspense fallback={null}>
            <CookieBanner
              onAccept={handleCookieAccept}
              onCustomize={handleCookieCustomize}
              onReject={handleCookieReject}
            />
          </Suspense>
        )}
        <OfflineIndicator />
      </>
    ),
  });

  // Defensive: if the current view isn't one renderPublicView handles,
  // fall back to the full App rather than render a blank screen.
  if (!publicView) {
    return (
      <Suspense fallback={null}>
        <App initialView={view} />
      </Suspense>
    );
  }

  return <>{publicView}</>;
}
