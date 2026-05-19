// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { Suspense } from 'react';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { lazyWithRetry } from '../utils/lazyWithRetry';

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  sessionStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function Good() {
  return <div>loaded</div>;
}

describe('lazyWithRetry', () => {
  it('renders the component on first-try success', async () => {
    const factory = vi.fn(() => Promise.resolve({ default: Good }));
    const Lazy = lazyWithRetry(factory);

    render(
      <Suspense fallback={<span>loading</span>}>
        <Lazy />
      </Suspense>,
    );

    await waitFor(() => expect(screen.getByText('loaded')).toBeDefined());
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('retries once on a chunk-load error and then renders', async () => {
    let attempt = 0;
    const factory = vi.fn(() => {
      attempt += 1;
      if (attempt === 1) {
        return Promise.reject(new Error('Failed to fetch dynamically imported module: foo.js'));
      }
      return Promise.resolve({ default: Good });
    });
    const Lazy = lazyWithRetry(factory);

    render(
      <Suspense fallback={<span>loading</span>}>
        <Lazy />
      </Suspense>,
    );

    await waitFor(() => expect(screen.getByText('loaded')).toBeDefined(), { timeout: 2000 });
    expect(factory).toHaveBeenCalledTimes(2);
  });

  it('propagates non-chunk errors without retrying', async () => {
    const factory = vi.fn(() => Promise.reject(new Error('something else went wrong')));
    const Lazy = lazyWithRetry(factory);

    // Local boundary catches the propagated error so the test runner
    // doesn't get a stray rejection.
    class Boundary extends React.Component<{ children: React.ReactNode }, { errored: boolean }> {
      state = { errored: false };
      static getDerivedStateFromError() {
        return { errored: true };
      }
      render() {
        return this.state.errored ? <span>caught</span> : this.props.children;
      }
    }

    render(
      <Boundary>
        <Suspense fallback={<span>loading</span>}>
          <Lazy />
        </Suspense>
      </Boundary>,
    );

    await waitFor(() => expect(screen.getByText('caught')).toBeDefined());
    expect(factory).toHaveBeenCalledTimes(1);
  });
});
