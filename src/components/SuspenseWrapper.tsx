/**
 * Reusable Suspense wrapper with loading states
 */

import React, { Suspense } from 'react';
// Loader2 was the only lucide icon this file needed and it was
// statically imported, which pulled the ~17 kB gz lucide chunk into
// the App.tsx modulepreload chain (SuspenseWrapper is eagerly
// imported by App.tsx). Inlined as a plain <svg> using lucide's
// exact path (v0.546.0, ISC) so the loading spinner still renders
// identically without dragging the icon library onto the critical
// path.
import {
  isChunkLoadError,
  attemptChunkReload,
  forceFullRecovery,
  recordTerminalChunkFailure,
  escalateToKillSwitch,
  resetChunkRecovery,
} from '../utils/chunkReload';

const InlineLoaderIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="48"
    height="48"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

interface SuspenseWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  loadingMessage?: string;
  className?: string;
}

const defaultFallback = (message: string = 'Loading...') => (
  <div className="min-h-[400px] flex items-center justify-center bg-surface">
    <div className="text-center">
      <InlineLoaderIcon className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
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
  // Auto-recovery ladder exhausted (see chunkReload's escalation notes): both
  // the soft reload and the nuclear kill-switch teardown failed to dislodge
  // the stale shell, so we stop looping and offer a manual reset.
  gaveUp?: boolean;
}

export class LazyErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    const chunky = isChunkLoadError(error);
    return { hasError: true, error, isReloading: chunky, wasChunkError: chunky, gaveUp: false };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Lazy load error:', error, errorInfo);
    if (!isChunkLoadError(error)) return;

    // Step 1: soft cache-bust reload (guarded so it can't hot-loop).
    if (attemptChunkReload()) return; // reload in flight — keep the spinner up

    // Step 2: soft reload already fired once and we're still here. Escalate to
    // the nuclear kill-switch teardown, or give up if we've exhausted it.
    if (recordTerminalChunkFailure() === 'recovering') {
      this.setState({ isReloading: true }); // teardown + clean reload in flight
      escalateToKillSwitch();
    } else {
      this.setState({ isReloading: false, gaveUp: true });
    }
  }

  // Manual escape hatch shown once auto-recovery gave up. Clear the counter so
  // the user's explicit tap gets a fresh full nuclear attempt.
  private handleResetApp = () => {
    resetChunkRecovery();
    escalateToKillSwitch();
  };

  // Retry for a NON-chunk error — a soft reset re-mounts children (the chunk
  // paths above never reach this button).
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
      if (this.state.gaveUp) {
        return (
          <div className="min-h-[400px] flex items-center justify-center bg-surface">
            <div className="text-center max-w-xs px-6">
              <p className="text-red-500 font-medium mb-2">Couldn’t update the app</p>
              <p className="text-on-surface-variant text-sm mb-4">
                Vocaband tried to refresh to the latest version but couldn’t.
                Check your connection, then reset the app.
              </p>
              <button
                onClick={this.handleResetApp}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90"
              >
                Reset the app
              </button>
            </div>
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
