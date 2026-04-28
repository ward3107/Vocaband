/**
 * PublicViews — the four no-auth-required view blocks (landing, terms,
 * privacy, accessibility) previously inlined in App.tsx as four
 * consecutive `if (view === ...)` early-return blocks.
 *
 * Each view is a small wrapper around its lazy-loaded page component
 * with:
 *   * onNavigate callback for cross-public-page navigation
 *   * onGetStarted → student-account-login
 *   * onBack → goBack (terms / privacy / accessibility only)
 *   * cookieBannerOverlay appended at the bottom
 *
 * Exports a helper `renderPublicView(view, props)` which returns the
 * right ReactNode or `null` if `view` isn't one of the four public
 * views.  App.tsx keeps its early-return pattern — the helper just
 * moves the JSX out of the main render body.
 */
import type { ReactNode } from "react";
import type { View } from "../core/views";
import type { AppUser } from "../core/supabase";
import {
  LandingPageWrapper,
  TermsPageWrapper,
  PrivacyPageWrapper,
  SecurityPageWrapper,
  DemoModeWrapper,
  AccessibilityStatementWrapper,
} from "../components/LazyComponents";
import FloatingButtons from "../components/FloatingButtons";

type PublicNavigatePage = "home" | "terms" | "privacy" | "accessibility" | "security";

export interface PublicViewsProps {
  view: View;
  user: AppUser | null;
  showDemo: boolean;
  setShowDemo: (v: boolean) => void;
  setView: (v: View) => void;
  goBack: () => void;
  onPublicNavigate: (page: PublicNavigatePage) => void;
  onTeacherOAuth: () => void;
  configErrorBanner: ReactNode;
  cookieBannerOverlay: ReactNode;
}

export function renderPublicView(props: PublicViewsProps): ReactNode | null {
  const {
    view,
    user,
    showDemo,
    setShowDemo,
    setView,
    goBack,
    onPublicNavigate,
    onTeacherOAuth,
    configErrorBanner,
    cookieBannerOverlay,
  } = props;

  if (view === "public-landing") {
    return (
      <>
        {configErrorBanner}
        <LandingPageWrapper
          onNavigate={onPublicNavigate}
          onGetStarted={() => setView("student-account-login")}
          onTeacherLogin={onTeacherOAuth}
          onTryDemo={() => setShowDemo(true)}
          isAuthenticated={!!user}
        />
        {showDemo && (
          <DemoModeWrapper
            onClose={() => setShowDemo(false)}
          />
        )}
        {cookieBannerOverlay}
        <FloatingButtons showBackToTop={true} />
      </>
    );
  }

  if (view === "public-terms") {
    return (
      <>
        <TermsPageWrapper
          onNavigate={onPublicNavigate}
          onGetStarted={() => setView("student-account-login")}
          onBack={goBack}
        />
        {cookieBannerOverlay}
      </>
    );
  }

  if (view === "public-privacy") {
    return (
      <>
        <PrivacyPageWrapper
          onNavigate={onPublicNavigate}
          onGetStarted={() => setView("student-account-login")}
          onBack={goBack}
        />
        {cookieBannerOverlay}
      </>
    );
  }

  if (view === "public-security") {
    return (
      <>
        <SecurityPageWrapper
          onNavigate={onPublicNavigate}
          onGetStarted={() => setView("student-account-login")}
          onBack={goBack}
        />
        {cookieBannerOverlay}
      </>
    );
  }

  if (view === "accessibility-statement") {
    return (
      <>
        <AccessibilityStatementWrapper
          onNavigate={onPublicNavigate}
          onGetStarted={() => setView("student-account-login")}
          onBack={goBack}
        />
        {cookieBannerOverlay}
      </>
    );
  }

  return null;
}
