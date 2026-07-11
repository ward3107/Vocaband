import { Component, type ReactNode, type ErrorInfo } from 'react';
import {
  isChunkLoadError,
  attemptChunkReload,
  forceFullRecovery,
  recordTerminalChunkFailure,
  escalateToKillSwitch,
  resetChunkRecovery,
} from '../utils/chunkReload';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  isReloading: boolean;
  wasChunkError: boolean;
  // Auto-recovery ladder exhausted (see chunkReload's escalation notes): the
  // soft reload AND the nuclear kill-switch teardown both failed to dislodge
  // the stale shell, so we stop looping and surface a manual reset instead.
  gaveUp: boolean;
}

export class LazyErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, isReloading: false, wasChunkError: false, gaveUp: false };
  }

  static getDerivedStateFromError(error: Error): State {
    const chunky = isChunkLoadError(error);
    return { hasError: true, isReloading: chunky, wasChunkError: chunky, gaveUp: false };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
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
  // the user's explicit tap gets a fresh full nuclear attempt rather than an
  // immediate re-give-up.
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
