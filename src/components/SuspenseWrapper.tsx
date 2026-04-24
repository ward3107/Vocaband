/**
 * Reusable Suspense wrapper with loading states
 */

import React, { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { isChunkLoadError, attemptChunkReload, forceFullRecovery } from '../utils/chunkReload';

interface SuspenseWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  loadingMessage?: string;
  className?: string;
}

const defaultFallback = (message: string = 'Loading...') => (
  <div className="min-h-[400px] flex items-center justify-center bg-surface">
    <div className="text-center">
      <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
      <p className="text-on-surface-variant font-medium">{message}</p>
    </div>
  </div>
);

export const SuspenseWrapper: React.FC<SuspenseWrapperProps> = ({
  children,
  fallback,
  loadingMessage = 'Loading...',
  className = ''
}) => {
  const fallbackComponent = fallback || defaultFallback(loadingMessage);

  return (
    <div className={className}>
      <Suspense fallback={fallbackComponent}>
        {children}
      </Suspense>
    </div>
  );
};

// Specialized wrappers for different use cases
export const PageSuspense: React.FC<{ children: React.ReactNode; message?: string }> = ({
  children,
  message = 'Loading page...'
}) => (
  <SuspenseWrapper
    loadingMessage={message}
    className="min-h-screen"
  >
    {children}
  </SuspenseWrapper>
);

export const ComponentSuspense: React.FC<{ children: React.ReactNode; message?: string }> = ({
  children,
  message = 'Loading component...'
}) => (
  <SuspenseWrapper
    loadingMessage={message}
    className="min-h-[200px]"
  >
    {children}
  </SuspenseWrapper>
);

export const ModalSuspense: React.FC<{ children: React.ReactNode; message?: string }> = ({
  children,
  message = 'Loading...'
}) => (
  <SuspenseWrapper
    loadingMessage={message}
    className="p-8"
  >
    {children}
  </SuspenseWrapper>
);

// Error boundary for lazy-loaded components
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  isReloading?: boolean;
  wasChunkError?: boolean;
}

export class LazyErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    const chunky = isChunkLoadError(error);
    return { hasError: true, error, isReloading: chunky, wasChunkError: chunky };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Lazy load error:', error, errorInfo);
    if (isChunkLoadError(error)) {
      const reloading = attemptChunkReload();
      if (!reloading) this.setState({ isReloading: false });
    }
  }

  // Retry must do a hard recovery for chunk errors — just clearing
  // hasError would re-run the same failed dynamic import with the same
  // stale cached HTML.  Non-chunk errors keep the soft reset.
  private handleRetry = () => {
    if (this.state.wasChunkError) {
      forceFullRecovery();
    } else {
      this.setState({ hasError: false, wasChunkError: false });
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.state.isReloading) {
        return (
          <div className="min-h-[400px] flex items-center justify-center text-stone-500">
            Updating…
          </div>
        );
      }
      return this.props.fallback || (
        <div className="min-h-[400px] flex items-center justify-center bg-surface">
          <div className="text-center">
            <p className="text-red-500 font-medium mb-4">Failed to load component</p>
            <button
              onClick={this.handleRetry}
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

// Combined wrapper with both Suspense and Error Boundary
export const LazyWrapper: React.FC<{
  children: React.ReactNode;
  loadingMessage?: string;
  fallback?: React.ReactNode;
}> = ({ children, loadingMessage, fallback }) => (
  <LazyErrorBoundary fallback={fallback}>
    <SuspenseWrapper loadingMessage={loadingMessage}>
      {children}
    </SuspenseWrapper>
  </LazyErrorBoundary>
);
