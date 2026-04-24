import React, { ErrorInfo, ReactNode } from "react";
import { isChunkLoadError, attemptChunkReload, forceFullRecovery } from "./utils/chunkReload";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  /** True once we've kicked off a reload to recover from a chunk-load
   * failure. We render a lightweight spinner instead of the full error
   * card so the user sees "Updating…" while the tab tears down. */
  isReloading: boolean;
  /** Toggle for the "technical details" disclosure. Kept closed by
   * default so students see a friendly message; expanded when a teacher
   * needs to copy an error report for support. */
  showDetails: boolean;
  copied: boolean;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isReloading: false,
      showDetails: false,
      copied: false,
    };
  }

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error, isReloading: isChunkLoadError(error) };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
    if (isChunkLoadError(error)) {
      const reloading = attemptChunkReload();
      if (!reloading) {
        // Guard window expired — stop retrying and show the error screen.
        this.setState({ isReloading: false });
      }
    }
  }

  private buildReport(): string {
    const { error, errorInfo } = this.state;
    const lines = [
      `Error: ${error?.name ?? 'Error'}: ${error?.message ?? '(no message)'}`,
      '',
      'Stack:',
      error?.stack ?? '(no stack)',
      '',
      'Component stack:',
      errorInfo?.componentStack ?? '(no component stack)',
      '',
      'Browser: ' + (typeof navigator !== 'undefined' ? navigator.userAgent : '(unknown)'),
      'URL: ' + (typeof window !== 'undefined' ? window.location.href : '(unknown)'),
      'Time: ' + new Date().toISOString(),
    ];
    return lines.join('\n');
  }

  private copyReport = async () => {
    const report = this.buildReport();
    try {
      await navigator.clipboard.writeText(report);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    } catch {
      // Clipboard API blocked (Safari private mode, old iOS) — fall back
      // to a prompt so the teacher can still grab the text.
      try { window.prompt('Copy this error report:', report); } catch { /* ignore */ }
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.state.isReloading) {
        return (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontFamily: "system-ui", color: "#666" }}>
            Updating Vocaband…
          </div>
        );
      }

      const errorMessage = "Something went wrong.";
      const details = "Please refresh the page and try again. If the problem persists, contact your teacher or administrator.";

      return (
        <div className="min-h-screen bg-stone-100 flex items-center justify-center p-6 font-sans">
          <div className="bg-white p-8 rounded-[32px] shadow-xl max-w-md w-full text-center border-2 border-red-100">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <h1 className="text-2xl font-black text-stone-900 mb-2">{errorMessage}</h1>
            <p className="text-stone-500 mb-6">{details || "Please refresh the page and try again."}</p>
            <button
              onClick={() => forceFullRecovery()}
              className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all"
            >
              Refresh Page
            </button>

            {/* Technical details — closed by default so students see a
                friendly message, expandable so a teacher can grab the
                stack trace for support (critical on mobile Safari where
                DevTools aren't easy to open). */}
            <button
              type="button"
              onClick={() => this.setState(s => ({ showDetails: !s.showDetails }))}
              className="mt-4 text-xs font-semibold text-stone-400 hover:text-stone-600 underline"
            >
              {this.state.showDetails ? 'Hide technical details' : 'Show technical details'}
            </button>
            {this.state.showDetails && (
              <div className="mt-3 text-left">
                <pre className="text-[11px] text-stone-700 bg-stone-50 border border-stone-200 rounded-xl p-3 overflow-auto max-h-48 whitespace-pre-wrap break-words">
                  {this.buildReport()}
                </pre>
                <button
                  type="button"
                  onClick={this.copyReport}
                  className="mt-2 w-full py-2 bg-stone-900 text-white text-sm font-bold rounded-xl hover:bg-stone-800 transition-all"
                >
                  {this.state.copied ? 'Copied ✓' : 'Copy error report'}
                </button>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
