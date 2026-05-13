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
  FreeResourcesPageWrapper,
  StatusPageWrapper,
  DemoModeWrapper,
  AccessibilityStatementWrapper,
} from "../components/LazyComponents";
import TeacherLoginView from "./TeacherLoginView";
import FloatingButtons from "../components/FloatingButtons";
import { useEffect } from "react";

type PublicNavigatePage = "home" | "terms" | "privacy" | "accessibility" | "security" | "resources" | "status";

const SCROLL_POS_KEY = "vocaband_landing_scroll_pos";

export interface PublicViewsProps {
  view: View;
  user: AppUser | null;
  showDemo: boolean;
  setShowDemo: (v: boolean) => void;
  goBack: () => void;
  onPublicNavigate: (page: PublicNavigatePage) => void;
  onTeacherOAuth: () => void;
  onStudentLogin: () => void;
  configErrorBanner: ReactNode;
  cookieBannerOverlay: ReactNode;
}

export function renderPublicView(props: PublicViewsProps): ReactNode | null {
  const {
    view,
    user,
    showDemo,
    setShowDemo,
    goBack,
    onPublicNavigate,
    onTeacherOAuth,
    onStudentLogin,
    configErrorBanner,
    cookieBannerOverlay,
  } = props;

  // Wrapper that saves scroll position before navigating away from landing
  const handleNavigate = (page: PublicNavigatePage) => {
    // Save scroll position when leaving landing page
    if (view === "public-landing" && page !== "home") {
      try {
        sessionStorage.setItem(SCROLL_POS_KEY, JSON.stringify({
          x: window.scrollX,
          y: window.scrollY,
        }));
      } catch { /* ignore storage errors */ }
    }
    onPublicNavigate(page);
  };

  if (view === "public-landing") {
    return (
      <LandingPageWithScrollRestore
        configErrorBanner={configErrorBanner}
        cookieBannerOverlay={cookieBannerOverlay}
        showDemo={showDemo}
        setShowDemo={setShowDemo}
        onNavigate={handleNavigate}
        onTeacherOAuth={onTeacherOAuth}
        onStudentLogin={onStudentLogin}
        isAuthenticated={!!user}
      />
    );
  }

  if (view === "public-terms") {
    return (
      <>
        <TermsPageWrapper
          onNavigate={handleNavigate}
          onGetStarted={onStudentLogin}
          onTeacherLogin={onTeacherOAuth}
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
          onNavigate={handleNavigate}
          onGetStarted={onStudentLogin}
          onTeacherLogin={onTeacherOAuth}
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
          onNavigate={handleNavigate}
          onGetStarted={onStudentLogin}
          onTeacherLogin={onTeacherOAuth}
          onBack={goBack}
        />
        {cookieBannerOverlay}
      </>
    );
  }

  if (view === "teacher-login") {
    // Self-contained teacher login screen — Google OAuth + email OTP
    // (6-digit code).  See src/components/TeacherLoginCard.tsx +
    // src/hooks/useTeacherOtpAuth.ts.  All auth logic lives in the
    // component; App.tsx's existing onAuthStateChange listener picks
    // up the resulting session and routes to the dashboard.
    return (
      <>
        <TeacherLoginView onBack={goBack} />
        {cookieBannerOverlay}
      </>
    );
  }

  if (view === "accessibility-statement") {
    return (
      <>
        <AccessibilityStatementWrapper
          onNavigate={handleNavigate}
          onGetStarted={onStudentLogin}
          onTeacherLogin={onTeacherOAuth}
          onBack={goBack}
        />
        {cookieBannerOverlay}
      </>
    );
  }

  if (view === "public-free-resources") {
    return (
      <>
        <FreeResourcesPageWrapper
          onNavigate={handleNavigate}
          onGetStarted={onStudentLogin}
          onTeacherLogin={onTeacherOAuth}
          onBack={goBack}
        />
        {cookieBannerOverlay}
      </>
    );
  }

  if (view === "public-status") {
    return (
      <>
        <StatusPageWrapper
          onNavigate={handleNavigate}
          onGetStarted={onStudentLogin}
          onTeacherLogin={onTeacherOAuth}
          onBack={goBack}
        />
        {cookieBannerOverlay}
      </>
    );
  }

  return null;
}

// Separate component for landing page to handle scroll restoration
function LandingPageWithScrollRestore({
  configErrorBanner,
  cookieBannerOverlay,
  showDemo,
  setShowDemo,
  onNavigate,
  onTeacherOAuth,
  onStudentLogin,
  isAuthenticated,
}: {
  configErrorBanner: ReactNode;
  cookieBannerOverlay: ReactNode;
  showDemo: boolean;
  setShowDemo: (v: boolean) => void;
  onNavigate: (page: PublicNavigatePage) => void;
  onTeacherOAuth: () => void;
  onStudentLogin: () => void;
  isAuthenticated: boolean;
}) {
  useEffect(() => {
    // Restore scroll position after a short delay to ensure content is rendered
    const timeoutId = setTimeout(() => {
      try {
        const saved = sessionStorage.getItem(SCROLL_POS_KEY);
        if (saved) {
          const { x, y } = JSON.parse(saved);
          window.scrollTo(x, y);
          sessionStorage.removeItem(SCROLL_POS_KEY);
        }
      } catch { /* ignore parse errors */ }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <>
      {configErrorBanner}
      <LandingPageWrapper
        onNavigate={onNavigate}
        onGetStarted={onStudentLogin}
        onTeacherLogin={onTeacherOAuth}
        onTryDemo={() => setShowDemo(true)}
        isAuthenticated={isAuthenticated}
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
