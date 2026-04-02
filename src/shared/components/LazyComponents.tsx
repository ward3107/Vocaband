/**
 * Lazy-loaded component wrappers with Suspense boundaries
 * These components are loaded on-demand to reduce initial bundle size
 */

import React, { lazy, Suspense, Component, ComponentType } from 'react';
import { Loader2 } from 'lucide-react';

// Loading fallback component
const LoadingFallback = ({ message = 'Loading...' }: { message?: string }) => (
  <div className="min-h-[400px] flex items-center justify-center bg-surface">
    <div className="text-center">
      <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
      <p className="text-on-surface-variant font-medium">{message}</p>
    </div>
  </div>
);

// Error boundary for lazy-loaded components
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class LazyErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Lazy load error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-[400px] flex items-center justify-center bg-surface">
          <div className="text-center">
            <p className="text-red-500 font-medium mb-4">Failed to load component</p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Lazy load page components - these use default exports
export const LazyLandingPage = lazy(() => import('../../features/public/LandingPage'));
export const LazyTermsPage = lazy(() => import('../../features/public/TermsPage'));
export const LazyPublicPrivacyPage = lazy(() => import('../../features/public/PublicPrivacyPage'));
export const LazyDemoMode = lazy(() => import('../../features/public/DemoMode'));

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

export const DemoModeWrapper: ComponentType<any> = (props) => (
  <LazyErrorBoundary fallback={<LoadingFallback message="Loading demo..." />}>
    <Suspense fallback={<LoadingFallback message="Loading demo..." />}>
      <LazyDemoMode {...props} />
    </Suspense>
  </LazyErrorBoundary>
);
