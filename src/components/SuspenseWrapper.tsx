/**
 * Reusable Suspense wrapper with loading states
 */

import React, { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

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
}

export class LazyErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
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
