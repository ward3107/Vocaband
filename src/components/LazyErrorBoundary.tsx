import { Component, type ReactNode, type ErrorInfo } from 'react';
import { isChunkLoadError, attemptChunkReload } from '../utils/chunkReload';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  isReloading: boolean;
}

export class LazyErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, isReloading: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, isReloading: isChunkLoadError(error) };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Lazy load error:', error, errorInfo);
    if (isChunkLoadError(error)) {
      const reloading = attemptChunkReload();
      if (!reloading) this.setState({ isReloading: false });
    }
  }

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
