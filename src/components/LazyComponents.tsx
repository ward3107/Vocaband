/**
 * Lazy-loaded component wrappers with Suspense boundaries
 * These components are loaded on-demand to reduce initial bundle size
 */

import { lazy, Suspense, type ComponentType } from 'react';
import { Loader2 } from 'lucide-react';
import { LazyErrorBoundary } from './LazyErrorBoundary';

// Loading fallback component
const LoadingFallback = ({ message = 'Loading...' }: { message?: string }) => (
  <div className="min-h-[400px] flex items-center justify-center bg-surface">
    <div className="text-center">
      <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
      <p className="text-on-surface-variant font-medium">{message}</p>
    </div>
  </div>
);

// Lazy load page components - these use default exports
export const LazyLandingPage = lazy(() => import('./LandingPage'));
export const LazyTermsPage = lazy(() => import('./TermsPage'));
export const LazyPublicPrivacyPage = lazy(() => import('./PublicPrivacyPage'));
export const LazyPublicSecurityPage = lazy(() => import('./PublicSecurityPage'));
export const LazyDemoMode = lazy(() => import('./DemoMode'));
export const LazyAccessibilityStatement = lazy(() => import('./AccessibilityStatement'));

// Wrapper components with Suspense and Error Boundary
export const LandingPageWrapper: ComponentType<any> = (props) => (
  <LazyErrorBoundary fallback={<LoadingFallback message="Loading landing page..." />}>
    <Suspense fallback={<LoadingFallback message="Loading landing page..." />}>
      <LazyLandingPage {...props} />
    </Suspense>
  </LazyErrorBoundary>
);

export const TermsPageWrapper: ComponentType<any> = (props) => (
  <LazyErrorBoundary fallback={<LoadingFallback message="Loading terms..." />}>
    <Suspense fallback={<LoadingFallback message="Loading terms..." />}>
      <LazyTermsPage {...props} />
    </Suspense>
  </LazyErrorBoundary>
);

export const PrivacyPageWrapper: ComponentType<any> = (props) => (
  <LazyErrorBoundary fallback={<LoadingFallback message="Loading privacy policy..." />}>
    <Suspense fallback={<LoadingFallback message="Loading privacy policy..." />}>
      <LazyPublicPrivacyPage {...props} />
    </Suspense>
  </LazyErrorBoundary>
);

export const SecurityPageWrapper: ComponentType<any> = (props) => (
  <LazyErrorBoundary fallback={<LoadingFallback message="Loading security..." />}>
    <Suspense fallback={<LoadingFallback message="Loading security..." />}>
      <LazyPublicSecurityPage {...props} />
    </Suspense>
  </LazyErrorBoundary>
);

export const AccessibilityStatementWrapper: ComponentType<any> = (props) => (
  <LazyErrorBoundary fallback={<LoadingFallback message="Loading accessibility statement..." />}>
    <Suspense fallback={<LoadingFallback message="Loading accessibility statement..." />}>
      <LazyAccessibilityStatement {...props} />
    </Suspense>
  </LazyErrorBoundary>
);

export const DemoModeWrapper: ComponentType<any> = (props) => (
  <LazyErrorBoundary fallback={<LoadingFallback message="Loading demo..." />}>
    <Suspense fallback={<LoadingFallback message="Loading demo..." />}>
      <LazyDemoMode {...props} />
    </Suspense>
  </LazyErrorBoundary>
);
