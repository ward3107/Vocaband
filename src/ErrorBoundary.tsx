import React, { Component, ErrorInfo, ReactNode } from "react";
import { isChunkLoadError, attemptChunkReload } from "./utils/chunkReload";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  /** True once we've kicked off a reload to recover from a chunk-load
   * failure. We render a lightweight spinner instead of the full error
   * card so the user sees "Updating…" while the tab tears down. */
  isReloading: boolean;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, isReloading: false };
  }

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error, isReloading: isChunkLoadError(error) };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    if (isChunkLoadError(error)) {
      const reloading = attemptChunkReload();
      if (!reloading) {
        // Guard window expired — stop retrying and show the error screen.
        this.setState({ isReloading: false });
      }
    }
  }

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
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
